import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { ApiError, clientIp, getUserId, handle, readJson, throttle } from '@/lib/api'
import { runAgent, type AgentResult } from '@/lib/ai/agent'
import { ModelError } from '@/lib/ai/ollama'
import type { GuideSession } from '@/lib/ai/prompt'
import type { AiStreamEvent, AiToolStep, AiWebSource } from '@/lib/types'

const HISTORY_LIMIT = 16

const historyEntry = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(4000),
})

const chatSchema = z.object({
  chatId: z.string().max(40).nullish(),
  message: z.string().trim().min(1).max(2000),
  location: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }).nullish(),
  focusPlaceId: z.string().max(40).nullish(),
  /** Guests have no saved transcript, so the browser sends the recent turns. */
  history: z.array(historyEntry).max(HISTORY_LIMIT).optional(),
})

type StoredMeta = { tools?: string[]; placeIds?: string[]; sources?: AiWebSource[]; steps?: AiToolStep[] }

function metaOf(meta: unknown): StoredMeta {
  return meta && typeof meta === 'object' ? (meta as StoredMeta) : {}
}

const listAmenities = () =>
  prisma.amenity.findMany({ orderBy: { label: 'asc' }, select: { slug: true, label: true } })

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
    listAmenities(),
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

async function buildGuestSession(location: { lat: number; lng: number } | null): Promise<GuideSession> {
  return {
    now: new Date(),
    userName: 'Guest',
    isGuest: true,
    isPrivate: false,
    homeArea: null,
    location,
    focusPlace: null,
    communities: [],
    amenities: await listAmenities(),
  }
}

const STREAM_HEADERS = {
  'Content-Type': 'application/x-ndjson; charset=utf-8',
  'Cache-Control': 'no-store, no-transform',
  'X-Accel-Buffering': 'no',
}

function agentResponse({
  request,
  userId,
  session,
  location,
  history,
  loadedTools,
  persist,
  onFailure,
}: {
  request: Request
  userId: string
  session: GuideSession
  location: { lat: number; lng: number } | null
  history: { role: 'user' | 'assistant'; content: string }[]
  loadedTools: string[]
  persist?: (result: AgentResult) => Promise<string>
  onFailure?: () => Promise<void>
}) {
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false
      const send = (event: AiStreamEvent) => {
        if (closed) return
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`))
      }

      try {
        const result = await runAgent({
          userId,
          session,
          location,
          history,
          loadedTools,
          emit: send,
          signal: request.signal,
        })

        const messageId = persist ? await persist(result) : `guest-${Date.now()}`
        if (result.places.length) send({ type: 'places', places: result.places })
        if (result.sources.length) send({ type: 'sources', sources: result.sources })
        send({ type: 'done', messageId, tools: result.tools, steps: result.steps })
      } catch (error) {
        await onFailure?.().catch(() => {})
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

  return new Response(stream, { headers: STREAM_HEADERS })
}

/**
 * POST /api/ai/chat
 * Streams one JSON event per line (see AiStreamEvent). Signed-in replies are
 * saved with the places, sources and steps they used. Guests get the same
 * guide with a stateless transcript sent from the browser.
 */
export const POST = handle(async (request) => {
  const userId = await getUserId()
  const actor = userId ?? `ip:${clientIp(request)}`
  throttle(`ai:${actor}`, 20)
  const input = await readJson(request, chatSchema)
  const location = input.location ?? null

  if (!userId) {
    return agentResponse({
      request,
      userId: '',
      session: await buildGuestSession(location),
      location,
      history: [
        ...(input.history ?? []).map((m) => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: input.message },
      ],
      loadedTools: [],
    })
  }

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
    buildSession(userId, location, input.focusPlaceId ?? null),
  ])
  const history = recent.reverse()

  const loadedTools = new Set<string>()
  for (const message of history) for (const tool of metaOf(message.meta).tools ?? []) loadedTools.add(tool)

  return agentResponse({
    request,
    userId,
    session,
    location,
    history: history.map((m) => ({ role: m.role, content: m.content })),
    loadedTools: [...loadedTools],
    persist: async (result) => {
      const saved = await prisma.aiMessage.create({
        data: {
          chatId: chat.id,
          role: 'assistant',
          content: result.text,
          meta: {
            tools: result.tools,
            placeIds: result.places.map((p) => p.id),
            sources: result.sources,
            steps: result.steps,
          },
        },
        select: { id: true },
      })
      await prisma.aiChat.update({ where: { id: chat.id }, data: { updatedAt: new Date() } })
      return saved.id
    },
    onFailure: async () => {
      // Nothing was answered, so drop the question too: a retry should not
      // leave a duplicate in the transcript.
      await prisma.aiMessage.delete({ where: { id: userMessage.id } })
      if (!existing) {
        const remaining = await prisma.aiMessage.count({ where: { chatId: chat.id } })
        if (remaining === 0) await prisma.aiChat.delete({ where: { id: chat.id } })
      }
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
