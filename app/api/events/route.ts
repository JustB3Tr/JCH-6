import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/lib/api-auth'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const when = searchParams.get('when') === 'past' ? 'past' : 'upcoming'
  const userId = await getUserId()

  const events = await prisma.event.findMany({
    where: when === 'past' ? { startsAt: { lt: new Date() } } : { startsAt: { gte: new Date() } },
    orderBy: { startsAt: when === 'past' ? 'desc' : 'asc' },
    take: 100,
    include: {
      place: { select: { name: true } },
      community: { select: { name: true, emoji: true } },
      host: { select: { name: true } },
      rsvps: { select: { userId: true, status: true } },
    },
  })

  const data = events.map((e) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    startsAt: e.startsAt.toISOString(),
    endsAt: e.endsAt?.toISOString() ?? null,
    placeId: e.placeId,
    placeName: e.place?.name ?? null,
    communityId: e.communityId,
    communityName: e.community?.name ?? null,
    communityEmoji: e.community?.emoji ?? null,
    hostName: e.host.name,
    goingCount: e.rsvps.filter((r) => r.status === 'going').length,
    myRsvp: userId ? e.rsvps.find((r) => r.userId === userId)?.status ?? null : null,
  }))

  return NextResponse.json({ events: data })
}

const createEventSchema = z.object({
  title: z.string().trim().min(1).max(140),
  description: z.string().trim().max(2000).default(''),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional().nullable(),
  placeId: z.string().optional().nullable(),
  communityId: z.string().optional().nullable(),
})

export async function POST(request: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = createEventSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid event data.' }, { status: 400 })

  const { communityId, placeId, endsAt, ...rest } = parsed.data

  if (communityId) {
    const membership = await prisma.membership.findUnique({
      where: { userId_communityId: { userId, communityId } },
    })
    if (!membership) return NextResponse.json({ error: 'Join the community first to post events.' }, { status: 403 })
  }

  const event = await prisma.event.create({
    data: {
      ...rest,
      startsAt: new Date(rest.startsAt),
      endsAt: endsAt ? new Date(endsAt) : null,
      placeId: placeId || null,
      communityId: communityId || null,
      hostId: userId,
    },
  })

  return NextResponse.json({ event }, { status: 201 })
}
