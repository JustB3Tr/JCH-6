import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/lib/api-auth'

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://69.234.42.159:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'Imagination-2.1-Pro'

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

const SYSTEM_PROMPT =
  'You are the friendly local guide for a community hangout map app. You help people discover parks, plazas, cafes and trails, plan meetups, and answer questions about local events and communities. Keep answers warm, concise and practical.'

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

  const ollamaResponse = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      stream: true,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history.map((m) => ({ role: m.role, content: m.content })),
      ],
    }),
  })

  if (!ollamaResponse.ok || !ollamaResponse.body) {
    await prisma.aiMessage.create({
      data: {
        chatId,
        role: 'assistant',
        content: 'Sorry — the AI service is unreachable right now. Please try again shortly.',
      },
    })
    return NextResponse.json({ error: 'AI service unreachable.', chatId }, { status: 502 })
  }

  const savedChatId = chatId
  const decoder = new TextDecoder()
  let assistantText = ''

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = ollamaResponse.body!.getReader()
      let buffer = ''
      try {
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''
          for (const line of lines) {
            if (!line.trim()) continue
            try {
              const chunk = JSON.parse(line) as { message?: { content?: string } }
              const content = chunk.message?.content
              if (content) {
                assistantText += content
                controller.enqueue(new TextEncoder().encode(content))
              }
            } catch {
              // Ignore malformed NDJSON lines.
            }
          }
        }
      } catch {
        // Network hiccup mid-stream; keep whatever we already streamed.
      } finally {
        if (assistantText.trim()) {
          await prisma.aiMessage.create({
            data: { chatId: savedChatId, role: 'assistant', content: assistantText },
          })
        }
        controller.close()
      }
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
