import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { ApiError, getUserId, handle, readJson, requireUserId, throttle } from '@/lib/api'
import { runAgent } from '@/lib/ai/agent'
import { ModelError } from '@/lib/ai/ollama'
import type { GuideSession } from '@/lib/ai/prompt'
import type { AiStreamEvent } from '@/lib/types'

const HISTORY_LIMIT = 16

const chatSchema = z.object({
  chatId: z.string().max(40).nullish(),
  message: z.string().trim().min(1).max(2000),
  location: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }).nullish(),
  focusPlaceId: z.string().max(40).nullish(),
})

type StoredMeta = { tools?: string[]; placeIds?: string[] }

function metaOf(meta: unknown): StoredMeta {
  return meta && typeof meta === 'object' ? (meta as StoredMeta) : {}
}

async function buildSession(
  userId: string,
  location: { lat: number; lng: number } | null,
  focusPlaceId: string | null,
): Promise<GuideSession> {
  const [user, memberships, amenities, focusPlace] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { name: true, isPrivate: true, homeArea: true },
    }),
    prisma.membership.findMany({
      where: { userId },
      select: { community: { select: { name: true } } },
      take: 8,
    }),
    prisma.amenity.findMany({ orderBy: { label: 'asc' }, select: { slug: true, label: true } }),
    focusPlaceId
      ? prisma.place.findUnique({ where: { id: focusPlaceId }, select: { id: true, name: true } })
      : null,
  ])

  return {
    now: new Date(),
    userName: user.name,
    isPrivate: user.isPrivate,
    homeArea: user.homeArea,
    location,
    focusPlace,
    communities: memberships.map((m) => m.community.name),
    amenities,
  }
}

/**
 * POST /api/ai/chat
 * Streams one JSON event per line (see AiStreamEvent). The reply and the
 * places it cited are saved once the agent finishes.
 */
export const POST = handle(async (request) => {
  const userId = await requireUserId()
  throttle(`ai:${userId}`, 20)
  const input = await readJson(request, chatSchema)

  const existing = input.chatId
    ? await prisma.aiChat.findFirst({ where: { id: input.chatId, userId }, select: { id: true } })
    : null
  if (input.chatId && !existing) throw new ApiError(404, 'That chat could not be found.')

  const chat =
    existing ??
    (await prisma.aiChat.create({
      data: { userId, title: input.message.slice(0, 60) },
      select: { id: true },
    }))

  const userMessage = await prisma.aiMessage.create({
    data: { chatId: chat.id, role: 'user', content: input.message },
    select: { id: true },
  })

  // The newest message is the one just saved, so the transcript the model sees
  // always ends with the user's question.
  const [recent, session] = await Promise.all([
    prisma.aiMessage.findMany({
      where: { chatId: chat.id },
      orderBy: { createdAt: 'desc' },
      take: HISTORY_LIMIT,
      select: { role: true, content: true, meta: true },
    }),
    buildSession(userId, input.location ?? null, input.focusPlaceId ?? null),
  ])
  const history = recent.reverse()

  const loadedTools = new Set<string>()
  for (const message of history) for (const tool of metaOf(message.meta).tools ?? []) loadedTools.add(tool)

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false
      const send = (event: AiStreamEvent) => {
        if (closed) return
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`))
      }

      send({ type: 'chat', chatId: chat.id })

      try {
        const result = await runAgent({
          userId,
          session,
          location: input.location ?? null,
          history: history.map((m) => ({ role: m.role, content: m.content })),
          loadedTools: [...loadedTools],
          emit: send,
          signal: request.signal,
        })

        const saved = await prisma.aiMessage.create({
          data: {
            chatId: chat.id,
            role: 'assistant',
            content: result.text,
            meta: { tools: result.tools, placeIds: result.places.map((p) => p.id) },
          },
          select: { id: true },
        })
        await prisma.aiChat.update({ where: { id: chat.id }, data: { updatedAt: new Date() } })

        if (result.places.length) send({ type: 'places', places: result.places })
        send({ type: 'done', messageId: saved.id, tools: result.tools })
      } catch (error) {
        // Nothing was answered, so drop the question too: a retry should not
        // leave a duplicate in the transcript.
        await prisma.aiMessage.delete({ where: { id: userMessage.id } }).catch(() => {})
        if (!existing) {
          const remaining = await prisma.aiMessage.count({ where: { chatId: chat.id } }).catch(() => 1)
          if (remaining === 0) await prisma.aiChat.delete({ where: { id: chat.id } }).catch(() => {})
        }
        const message =
          error instanceof ModelError
            ? 'The guide is not reachable right now. Try again in a moment.'
            : 'Something went wrong while answering. Try again.'
        console.error('[ai] chat failed:', error)
        send({ type: 'error', message })
      } finally {
        closed = true
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store, no-transform',
      'X-Accel-Buffering': 'no',
    },
  })
})

/** GET /api/ai/chat — the viewer's recent chats. */
export const GET = handle(async () => {
  const userId = await getUserId()
  if (!userId) return { chats: [] }

  const chats = await prisma.aiChat.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    take: 30,
    select: { id: true, title: true, updatedAt: true },
  })
  return { chats: chats.map((c) => ({ ...c, updatedAt: c.updatedAt.toISOString() })) }
})
