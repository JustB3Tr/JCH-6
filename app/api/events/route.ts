import { created, getUserId, handle, intParam, readJson, requireUserId, throttle } from '@/lib/api'
import { createEvent, listEvents } from '@/lib/data/events'
import { eventSchema } from '@/lib/schemas'

function dateParam(value: string | null) {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

/**
 * GET /api/events
 *   when       upcoming (default) | past
 *   mine       1 for events the viewer is going or maybe going to
 *   place      place id
 *   community  community id
 *   from, to   ISO date range
 *   q          text search
 *   limit      1-200
 */
export const GET = handle(async (request) => {
  const params = new URL(request.url).searchParams
  const viewerId = await getUserId()
  const mine = params.get('mine') === '1'
  if (mine && !viewerId) return { events: [] }

  const events = await listEvents({
    when: params.get('when') === 'past' ? 'past' : 'upcoming',
    attendeeId: mine && viewerId ? viewerId : undefined,
    placeId: params.get('place') ?? undefined,
    communityId: params.get('community') ?? undefined,
    from: dateParam(params.get('from')),
    to: dateParam(params.get('to')),
    q: params.get('q') ?? undefined,
    limit: intParam(params.get('limit'), 100, 1, 200),
    viewerId,
  })
  return { events }
})

export const POST = handle(async (request) => {
  const userId = await requireUserId()
  throttle(`event:create:${userId}`, 10, 60 * 60_000)
  const input = await readJson(request, eventSchema)
  return created(await createEvent(userId, input))
})
