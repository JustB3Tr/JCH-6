import { handle, notFound, requireUserId } from '@/lib/api'
import { prisma } from '@/lib/prisma'
import { listPlaces } from '@/lib/data/places'
import type { AiMessageInfo, PlaceSummary } from '@/lib/types'

type Params = { id: string }
type StoredMeta = { tools?: string[]; placeIds?: string[] }

export const GET = handle<Params>(async (_request, { id }) => {
  const userId = await requireUserId()
  const chat = await prisma.aiChat.findFirst({
    where: { id, userId },
    select: {
      id: true,
      title: true,
      messages: { orderBy: { createdAt: 'asc' }, select: { id: true, role: true, content: true, meta: true, createdAt: true } },
    },
  })
  if (!chat) throw notFound('That chat')

  const placeIds = [
    ...new Set(
      chat.messages.flatMap((m) => {
        const meta = (m.meta ?? {}) as StoredMeta
        return meta.placeIds ?? []
      }),
    ),
  ]
  const places = placeIds.length ? await listPlaces({ ids: placeIds, viewerId: userId, limit: placeIds.length }) : []
  const byId = new Map<string, PlaceSummary>(places.map((p) => [p.id, p]))

  const messages: AiMessageInfo[] = chat.messages.map((m) => {
    const meta = (m.meta ?? {}) as StoredMeta
    return {
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
      tools: meta.tools ?? [],
      places: (meta.placeIds ?? []).map((placeId) => byId.get(placeId)).filter((p): p is PlaceSummary => Boolean(p)),
    }
  })

  return { chat: { id: chat.id, title: chat.title, messages } }
})

export const DELETE = handle<Params>(async (_request, { id }) => {
  const userId = await requireUserId()
  await prisma.aiChat.deleteMany({ where: { id, userId } })
  return { ok: true }
})
