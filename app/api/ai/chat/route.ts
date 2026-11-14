import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/lib/api-auth'
import { AI_TOOLS, runTool } from '@/lib/ai-tools'

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://69.234.42.159:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'Imagination-2.1-Pro'
const MODEL_TIMEOUT_MS = 90_000
const MAX_TOOL_ROUNDS = 4

// Simple in-memory rate limit: 20 requests per user per minute.
const rateBuckets = new Map<string, number[]>()
function rateLimited(userId: string) {
  const now = Date.now()
  const windowStart = now - 60_000
  const hits = (rateBuckets.get(userId) ?? []).filter((t) => t > windowStart)
  hits.push(now)
  rateBuckets.set(userId, hits)
  return hits.length > 20
}

const chatSchema = z.object({
  chatId: z.string().optional().nullable(),
  message: z.string().trim().min(1).max(4000),
})

const SYSTEM_PROMPT = [
  'You are the friendly local guide for a community hangout map app covering Los Angeles County.',
  'You have tools that read the app database: search_places, get_place, nearby_places, list_events, list_communities.',
  'Always call a tool before naming a specific place, event or community. Never invent spots, addresses or events.',
  'If a tool returns nothing, say so plainly and suggest a broader search instead of guessing.',
  'When you recommend places, name them with their neighborhood and one practical detail (amenities, parking, shade).',
  'Keep answers warm, concise and practical. Use short paragraphs or a compact list, no markdown tables.',
].join(' ')

type OllamaToolCall = {
  function?: { name?: string; arguments?: unknown }
}

type OllamaMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_calls?: OllamaToolCall[]
  tool_name?: string
}

async function callModel(messages: OllamaMessage[], useTools: boolean) {
  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      stream: false,
      think: false,
      ...(useTools ? { tools: AI_TOOLS } : {}),
      messages,
      options: { temperature: 0.6 },
    }),
    signal: AbortSignal.timeout(MODEL_TIMEOUT_MS),
  })

  if (!response.ok) throw new Error(`Model responded with ${response.status}`)

  const data = (await response.json()) as {
    message?: { content?: string; tool_calls?: OllamaToolCall[] }
  }
  return data.message ?? {}
}

async function answerWithTools(conversation: OllamaMessage[]) {
  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const message = await callModel(conversation, true)
    const toolCalls = message.tool_calls ?? []

    if (!toolCalls.length) {
      const content = (message.content ?? '').trim()
      if (content) return content
      break
    }

    conversation.push({
      role: 'assistant',
      content: message.content ?? '',
      tool_calls: toolCalls,
    })

    for (const call of toolCalls) {
      const name = call.function?.name ?? ''
      const result = await runTool(name, call.function?.arguments)
      conversation.push({ role: 'tool', tool_name: name, content: JSON.stringify(result) })
    }
  }

  // Tool budget spent (or the model returned nothing) — force a plain answer.
  const finalMessage = await callModel(
    [
      ...conversation,
      {
        role: 'user',
        content: 'Answer my last question now using the tool results above. Do not call any more tools.',
      },
    ],
    false,
  )
  return (finalMessage.content ?? '').trim()
}

export async function POST(request: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (rateLimited(userId)) {
    return NextResponse.json({ error: 'Too many requests — try again in a minute.' }, { status: 429 })
  }

  const parsed = chatSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid message.' }, { status: 400 })

  // Reuse or create the chat, titling it from the first user message.
  let chatId = parsed.data.chatId || null
  if (chatId) {
    const owned = await prisma.aiChat.findFirst({ where: { id: chatId, userId }, select: { id: true } })
    if (!owned) return NextResponse.json({ error: 'Chat not found.' }, { status: 404 })
  } else {
    const chat = await prisma.aiChat.create({
      data: { userId, title: parsed.data.message.slice(0, 60) },
    })
    chatId = chat.id
  }

  await prisma.aiMessage.create({
    data: { chatId, role: 'user', content: parsed.data.message },
  })

  const history = await prisma.aiMessage.findMany({
    where: { chatId },
    orderBy: { createdAt: 'asc' },
    take: 20,
  })

  const conversation: OllamaMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.map((m) => ({
      role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
      content: m.content,
    })),
  ]

  let answer = ''
  try {
    answer = await answerWithTools(conversation)
  } catch (error) {
    console.log('[v0] AI chat failed:', error instanceof Error ? error.message : error)
  }

  if (!answer) {
    answer = 'Sorry — the AI service is unreachable right now. Please try again shortly.'
  }

  const savedChatId = chatId
  await prisma.aiMessage.create({
    data: { chatId: savedChatId, role: 'assistant', content: answer },
  })

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(answer))
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Chat-Id': savedChatId,
      'Cache-Control': 'no-store',
    },
  })
}
