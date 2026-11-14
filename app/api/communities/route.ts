import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/lib/api-auth'

export async function GET() {
  const userId = await getUserId()
  const communities = await prisma.community.findMany({
    orderBy: { name: 'asc' },
    include: {
      memberships: { select: { userId: true } },
      events: { where: { startsAt: { gte: new Date() } }, select: { id: true } },
    },
  })

  const data = communities.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    description: c.description,
    emoji: c.emoji,
    memberCount: c.memberships.length,
    joined: userId ? c.memberships.some((m) => m.userId === userId) : false,
    upcomingEvents: c.events.length,
  }))

  return NextResponse.json({ communities: data })
}

const createCommunitySchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).default(''),
  emoji: z.string().trim().max(8).default('📍'),
})

export async function POST(request: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = createCommunitySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid community data.' }, { status: 400 })

  const baseSlug = parsed.data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'community'
  const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`

  const community = await prisma.community.create({
    data: {
      ...parsed.data,
      slug,
      memberships: { create: { userId, role: 'organizer' } },
    },
  })

  // Every community gets a general chat so members have somewhere to talk.
  await prisma.chatThread.create({
    data: {
      kind: 'community',
      communityId: community.id,
      name: `${community.name} — General`,
      createdById: userId,
      messages: {
        create: {
          userId,
          body: `Welcome to ${community.name}! Say hi and share your first hangout idea.`,
        },
      },
    },
  })

  return NextResponse.json({ community }, { status: 201 })
}
