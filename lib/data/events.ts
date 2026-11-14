import type { Prisma } from '@/lib/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { ApiError, forbidden, notFound } from '@/lib/api'
import type { RsvpStatus } from '@/lib/constants'
import { areaLabel, boundsAround, type LatLng } from '@/lib/geo'
import { partitionPeople, personSelect, toPerson } from '@/lib/privacy'
import type { EventDetail, EventSummary } from '@/lib/types'

// An event stays "upcoming" for a little while after it starts so people
// arriving late can still find it.
const STARTED_GRACE_MS = 2 * 60 * 60 * 1000

function eventSelect(viewerId: string | null | undefined) {
  return {
    id: true,
    title: true,
    description: true,
    startsAt: true,
    endsAt: true,
    hostId: true,
    place: { select: { id: true, name: true, type: true, lat: true, lng: true, address: true } },
    community: { select: { id: true, slug: true, name: true, icon: true, tint: true } },
    host: { select: personSelect },
    _count: { select: { rsvps: { where: { status: 'going' } } } },
    // An empty id matches nothing, which keeps the payload shape stable for signed-out viewers.
    rsvps: { where: { userId: viewerId ?? '' }, select: { status: true }, take: 1 },
  } satisfies Prisma.EventSelect
}

type EventRow = Prisma.EventGetPayload<{ select: ReturnType<typeof eventSelect> }>

function toSummary(row: EventRow, viewerId: string | null | undefined): EventSummary {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt?.toISOString() ?? null,
    place: row.place
      ? {
          id: row.place.id,
          name: row.place.name,
          type: row.place.type,
          lat: row.place.lat,
          lng: row.place.lng,
          area: areaLabel(row.place),
        }
      : null,
    community: row.community,
    host: toPerson(row.host, viewerId),
    goingCount: row._count.rsvps,
    myRsvp: row.rsvps[0]?.status ?? null,
    isHost: Boolean(viewerId) && row.hostId === viewerId,
  }
}

export type EventQuery = {
  when?: 'upcoming' | 'past'
  from?: Date
  to?: Date
  placeId?: string
  communityId?: string
  hostId?: string
  /** Only events this user has RSVP'd going or maybe to. */
  attendeeId?: string
  q?: string
  near?: LatLng | null
  radiusKm?: number
  limit?: number
  viewerId?: string | null
}

export async function listEvents(query: EventQuery = {}): Promise<EventSummary[]> {
  const now = Date.now()
  const past = query.when === 'past'
  const text = query.q?.trim()
  const box = query.near ? boundsAround(query.near, query.radiusKm ?? 10) : null

  const startsAt = past
    ? { lt: new Date(now - STARTED_GRACE_MS), ...(query.from ? { gte: query.from } : {}) }
    : { gte: query.from ?? new Date(now - STARTED_GRACE_MS), ...(query.to ? { lte: query.to } : {}) }

  const rows = await prisma.event.findMany({
    where: {
      startsAt,
      ...(query.placeId ? { placeId: query.placeId } : {}),
      ...(query.communityId ? { communityId: query.communityId } : {}),
      ...(query.hostId ? { hostId: query.hostId } : {}),
      ...(query.attendeeId
        ? { rsvps: { some: { userId: query.attendeeId, status: { in: ['going', 'maybe'] } } } }
        : {}),
      ...(box
        ? { place: { lat: { gte: box.south, lte: box.north }, lng: { gte: box.west, lte: box.east } } }
        : {}),
      ...(text
        ? {
            OR: [
              { title: { contains: text, mode: 'insensitive' } },
              { description: { contains: text, mode: 'insensitive' } },
              { place: { name: { contains: text, mode: 'insensitive' } } },
              { community: { name: { contains: text, mode: 'insensitive' } } },
            ],
          }
        : {}),
    },
    orderBy: { startsAt: past ? 'desc' : 'asc' },
    take: Math.min(query.limit ?? 100, 200),
    select: eventSelect(query.viewerId),
  })

  return rows.map((row) => toSummary(row, query.viewerId))
}

export async function getEvent(id: string, viewerId: string | null): Promise<EventDetail> {
  const row = await prisma.event.findUnique({
    where: { id },
    select: {
      ...eventSelect(viewerId),
      rsvps: { orderBy: { createdAt: 'asc' }, select: { status: true, userId: true, user: { select: personSelect } } },
    },
  })
  if (!row) throw notFound('That event')

  const attending = row.rsvps.filter((r) => r.status !== 'cant')
  const { visible, hidden } = partitionPeople(attending, viewerId)
  const mine = row.rsvps.find((r) => r.userId === viewerId)

  return {
    ...toSummary({ ...row, rsvps: mine ? [{ status: mine.status }] : [] }, viewerId),
    attendees: visible.map((r) => ({ person: toPerson(r.user, viewerId), status: r.status })),
    privateAttendees: hidden,
    maybeCount: row.rsvps.filter((r) => r.status === 'maybe').length,
  }
}

export type EventInput = {
  title: string
  description: string
  startsAt: Date
  endsAt?: Date | null
  placeId?: string | null
  communityId?: string | null
}

async function assertEventTargets(userId: string, input: Partial<EventInput>) {
  if (input.endsAt && input.startsAt && input.endsAt <= input.startsAt) {
    throw new ApiError(400, 'The end time must be after the start time.')
  }
  if (input.placeId) {
    const place = await prisma.place.findFirst({ where: { id: input.placeId, approved: true }, select: { id: true } })
    if (!place) throw new ApiError(400, 'That place is no longer on the map.')
  }
  if (input.communityId) {
    const membership = await prisma.membership.findUnique({
      where: { userId_communityId: { userId, communityId: input.communityId } },
      select: { userId: true },
    })
    if (!membership) throw forbidden('Join the community before posting events to it.')
  }
}

export async function createEvent(userId: string, input: EventInput): Promise<{ id: string }> {
  if (input.startsAt.getTime() < Date.now() - 60 * 60 * 1000) {
    throw new ApiError(400, 'Pick a start time in the future.')
  }
  await assertEventTargets(userId, input)

  return prisma.event.create({
    data: {
      title: input.title,
      description: input.description,
      startsAt: input.startsAt,
      endsAt: input.endsAt ?? null,
      placeId: input.placeId || null,
      communityId: input.communityId || null,
      hostId: userId,
      // Hosts are going to their own event.
      rsvps: { create: { userId, status: 'going' } },
    },
    select: { id: true },
  })
}

async function requireHost(id: string, userId: string) {
  const event = await prisma.event.findUnique({
    where: { id },
    select: { hostId: true, startsAt: true, endsAt: true },
  })
  if (!event) throw notFound('That event')
  if (event.hostId !== userId) throw forbidden('Only the host can change this event.')
  return event
}

export async function updateEvent(id: string, userId: string, input: Partial<EventInput>) {
  const current = await requireHost(id, userId)
  await assertEventTargets(userId, {
    ...input,
    startsAt: input.startsAt ?? current.startsAt,
    endsAt: input.endsAt === undefined ? current.endsAt : input.endsAt,
  })

  await prisma.event.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.startsAt !== undefined ? { startsAt: input.startsAt } : {}),
      ...(input.endsAt !== undefined ? { endsAt: input.endsAt } : {}),
      ...(input.placeId !== undefined ? { placeId: input.placeId || null } : {}),
    },
  })
}

export async function deleteEvent(id: string, userId: string) {
  await requireHost(id, userId)
  await prisma.event.delete({ where: { id } })
}

/** Sets or clears (status null) the user's RSVP and returns the new counts. */
export async function setRsvp(userId: string, eventId: string, status: RsvpStatus | null) {
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } })
  if (!event) throw notFound('That event')

  if (status === null) {
    await prisma.rsvp.deleteMany({ where: { eventId, userId } })
  } else {
    await prisma.rsvp.upsert({
      where: { eventId_userId: { eventId, userId } },
      update: { status },
      create: { eventId, userId, status },
    })
  }

  const goingCount = await prisma.rsvp.count({ where: { eventId, status: 'going' } })
  return { myRsvp: status, goingCount }
}
