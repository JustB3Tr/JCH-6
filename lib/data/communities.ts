import type { Prisma } from '@/lib/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { notFound } from '@/lib/api'
import { partitionPeople, personSelect, toPerson } from '@/lib/privacy'
import { listEvents } from '@/lib/data/events'
import type { CommunityDetail, CommunitySummary } from '@/lib/types'

function communitySelect(viewerId: string | null | undefined) {
  return {
    id: true,
    slug: true,
    name: true,
    description: true,
    icon: true,
    tint: true,
    _count: { select: { memberships: true, events: { where: { startsAt: { gte: new Date() } } } } },
    memberships: { where: { userId: viewerId ?? '' }, select: { role: true }, take: 1 },
  } satisfies Prisma.CommunitySelect
}

type CommunityRow = Prisma.CommunityGetPayload<{ select: ReturnType<typeof communitySelect> }>

function toSummary(row: CommunityRow): CommunitySummary {
  const membership = row.memberships[0]
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    icon: row.icon,
    tint: row.tint,
    memberCount: row._count.memberships,
    upcomingEvents: row._count.events,
    joined: Boolean(membership),
    role: membership?.role ?? null,
  }
}

export async function listCommunities(
  options: { viewerId?: string | null; q?: string; joinedOnly?: boolean; limit?: number } = {},
): Promise<CommunitySummary[]> {
  const text = options.q?.trim()
  const rows = await prisma.community.findMany({
    where: {
      ...(text
        ? {
            OR: [
              { name: { contains: text, mode: 'insensitive' } },
              { description: { contains: text, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(options.joinedOnly && options.viewerId ? { memberships: { some: { userId: options.viewerId } } } : {}),
    },
    orderBy: [{ memberships: { _count: 'desc' } }, { name: 'asc' }],
    take: Math.min(options.limit ?? 100, 200),
    select: communitySelect(options.viewerId),
  })
  return rows.map(toSummary)
}

/** Accepts either the id or the slug. */
export async function getCommunity(idOrSlug: string, viewerId: string | null): Promise<CommunityDetail> {
  const row = await prisma.community.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    select: {
      ...communitySelect(viewerId),
      threads: { where: { kind: 'community' }, orderBy: { createdAt: 'asc' }, take: 1, select: { id: true } },
    },
  })
  if (!row) throw notFound('That community')

  const [members, events] = await Promise.all([
    prisma.membership.findMany({
      where: { communityId: row.id },
      orderBy: [{ role: 'desc' }, { joinedAt: 'asc' }],
      take: 200,
      select: { role: true, user: { select: personSelect } },
    }),
    listEvents({ communityId: row.id, when: 'upcoming', limit: 20, viewerId }),
  ])
  const { visible, hidden } = partitionPeople(members, viewerId)
  const summary = toSummary(row)

  return {
    ...summary,
    members: visible.map((m) => ({ person: toPerson(m.user, viewerId), role: m.role })),
    privateMembers: hidden,
    events,
    // The chat is for members only, so do not leak its id to visitors.
    threadId: summary.joined ? (row.threads[0]?.id ?? null) : null,
  }
}

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 48) || 'community'
  )
}

async function uniqueSlug(name: string) {
  const base = slugify(name)
  const taken = await prisma.community.findUnique({ where: { slug: base }, select: { id: true } })
  return taken ? `${base}-${Math.random().toString(36).slice(2, 6)}` : base
}

export async function createCommunity(
  userId: string,
  input: { name: string; description: string; icon: string; tint: string },
): Promise<{ id: string; slug: string }> {
  const slug = await uniqueSlug(input.name)

  return prisma.$transaction(async (tx) => {
    const community = await tx.community.create({
      data: { ...input, slug, memberships: { create: { userId, role: 'organizer' } } },
      select: { id: true, slug: true, name: true },
    })
    // Every community gets a general chat so members have somewhere to talk.
    await tx.chatThread.create({
      data: {
        kind: 'community',
        communityId: community.id,
        name: community.name,
        createdById: userId,
        members: { create: { userId } },
        messages: {
          create: { userId, body: `Welcome to ${community.name}! Say hi and share your first hangout idea.` },
        },
      },
    })
    return { id: community.id, slug: community.slug }
  })
}

/** Joins or leaves a community and keeps chat access in step with membership. */
export async function setMembership(userId: string, communityId: string, join: boolean) {
  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: { id: true, name: true, threads: { where: { kind: 'community' }, select: { id: true } } },
  })
  if (!community) throw notFound('That community')

  await prisma.$transaction(async (tx) => {
    if (!join) {
      await tx.membership.deleteMany({ where: { userId, communityId } })
      await tx.threadMember.deleteMany({ where: { userId, thread: { communityId } } })
      return
    }

    await tx.membership.upsert({
      where: { userId_communityId: { userId, communityId } },
      update: {},
      create: { userId, communityId },
    })

    let threadIds = community.threads.map((t) => t.id)
    if (!threadIds.length) {
      const thread = await tx.chatThread.create({
        data: { kind: 'community', communityId, name: community.name, createdById: userId },
        select: { id: true },
      })
      threadIds = [thread.id]
    }
    await tx.threadMember.createMany({
      data: threadIds.map((threadId) => ({ threadId, userId })),
      skipDuplicates: true,
    })
  })

  return { joined: join }
}
