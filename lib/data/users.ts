import { prisma } from '@/lib/prisma'
import { notFound } from '@/lib/api'
import { PRIVATE_NAME } from '@/lib/constants'
import { listEvents } from '@/lib/data/events'
import type { Me, Profile } from '@/lib/types'

export async function getMe(userId: string): Promise<Me> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      bio: true,
      homeArea: true,
      isPrivate: true,
      createdAt: true,
      _count: { select: { savedPlaces: true, memberships: true, feedbacks: true } },
    },
  })
  // The session outlived the account (e.g. it was deleted on another device).
  if (!user) throw notFound('Your account')

  const rsvps = await prisma.rsvp.count({
    where: { userId, status: { in: ['going', 'maybe'] }, event: { startsAt: { gte: new Date() } } },
  })

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    bio: user.bio,
    homeArea: user.homeArea,
    isPrivate: user.isPrivate,
    createdAt: user.createdAt.toISOString(),
    stats: {
      saved: user._count.savedPlaces,
      rsvps,
      communities: user._count.memberships,
      reviews: user._count.feedbacks,
    },
  }
}

export async function updateMe(
  userId: string,
  input: { name?: string; bio?: string; homeArea?: string | null; isPrivate?: boolean },
): Promise<Me> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.bio !== undefined ? { bio: input.bio } : {}),
      ...(input.homeArea !== undefined ? { homeArea: input.homeArea || null } : {}),
      ...(input.isPrivate !== undefined ? { isPrivate: input.isPrivate } : {}),
    },
  })
  return getMe(userId)
}

/** People search for starting chats. Private accounts are never returned. */
export async function searchPeople(viewerId: string, q: string) {
  const text = q.trim()
  if (text.length < 2) return []
  return prisma.user.findMany({
    where: { isPrivate: false, id: { not: viewerId }, name: { contains: text, mode: 'insensitive' } },
    orderBy: { name: 'asc' },
    take: 10,
    select: { id: true, name: true, homeArea: true },
  })
}

export async function getProfile(id: string, viewerId: string | null): Promise<Profile> {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      bio: true,
      homeArea: true,
      isPrivate: true,
      createdAt: true,
      memberships: {
        orderBy: { joinedAt: 'asc' },
        take: 20,
        select: { community: { select: { slug: true, name: true, icon: true, tint: true } } },
      },
    },
  })
  if (!user) throw notFound('That person')

  const isSelf = user.id === viewerId
  if (user.isPrivate && !isSelf) {
    return { id: user.id, isPrivate: true, name: PRIVATE_NAME, isSelf: false }
  }

  return {
    id: user.id,
    isPrivate: user.isPrivate,
    isSelf,
    name: user.name,
    bio: user.bio,
    homeArea: user.homeArea,
    joinedAt: user.createdAt.toISOString(),
    communities: user.memberships.map((m) => m.community),
    hosting: await listEvents({ hostId: user.id, when: 'upcoming', limit: 10, viewerId }),
  }
}
