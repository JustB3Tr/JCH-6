import type { Prisma } from '@/lib/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { ApiError, forbidden, notFound } from '@/lib/api'
import type { ChatMessageInfo, ThreadSummary } from '@/lib/types'

// Access rule for all chat: you may read and post in a thread only if you
// have a ThreadMember row for it. Community membership grants that row on
// join and removes it on leave (see lib/data/communities.ts).

const MESSAGE_PAGE = 100

const threadSelect = {
  id: true,
  kind: true,
  name: true,
  lastMessageAt: true,
  community: { select: { slug: true, name: true, icon: true, tint: true } },
  members: { take: 5, orderBy: { joinedAt: 'asc' }, select: { user: { select: { id: true, name: true } } } },
  _count: { select: { members: true } },
  messages: {
    orderBy: { createdAt: 'desc' },
    take: 1,
    select: { body: true, createdAt: true, user: { select: { name: true } } },
  },
} satisfies Prisma.ChatThreadSelect

type ThreadRow = Prisma.ChatThreadGetPayload<{ select: typeof threadSelect }>

function threadName(row: ThreadRow, viewerId: string) {
  if (row.kind === 'community') return row.community?.name ?? row.name ?? 'Community chat'
  const others = row.members.map((m) => m.user).filter((u) => u.id !== viewerId)
  if (row.kind === 'direct') return others[0]?.name ?? 'Direct chat'
  return row.name || others.map((u) => u.name.split(' ')[0]).join(', ') || 'Group chat'
}

function toSummary(row: ThreadRow, viewerId: string, unread: number): ThreadSummary {
  const last = row.messages[0]
  return {
    id: row.id,
    kind: row.kind,
    name: threadName(row, viewerId),
    community: row.community
      ? { slug: row.community.slug, icon: row.community.icon, tint: row.community.tint }
      : null,
    memberCount: row._count.members,
    lastMessage: last
      ? { body: last.body, author: last.user.name, createdAt: last.createdAt.toISOString() }
      : null,
    lastMessageAt: row.lastMessageAt.toISOString(),
    unread,
  }
}

async function unreadCounts(userId: string): Promise<Map<string, number>> {
  const rows = await prisma.$queryRaw<{ threadId: string; unread: number }[]>`
    SELECT tm."threadId", count(m."id")::int AS unread
    FROM "ThreadMember" tm
    JOIN "ChatMessage" m
      ON m."threadId" = tm."threadId" AND m."createdAt" > tm."lastReadAt" AND m."userId" <> tm."userId"
    WHERE tm."userId" = ${userId}
    GROUP BY tm."threadId"`
  return new Map(rows.map((r) => [r.threadId, r.unread]))
}

export async function listThreads(userId: string): Promise<ThreadSummary[]> {
  const [threads, unread] = await Promise.all([
    prisma.chatThread.findMany({
      where: { members: { some: { userId } } },
      orderBy: { lastMessageAt: 'desc' },
      take: 100,
      select: threadSelect,
    }),
    unreadCounts(userId),
  ])
  return threads.map((t) => toSummary(t, userId, unread.get(t.id) ?? 0))
}

async function requireMember(threadId: string, userId: string) {
  const member = await prisma.threadMember.findUnique({
    where: { threadId_userId: { threadId, userId } },
    select: { threadId: true },
  })
  // 404 rather than 403 so thread ids cannot be probed.
  if (!member) throw notFound('That conversation')
}

export async function getThread(threadId: string, userId: string): Promise<ThreadSummary> {
  await requireMember(threadId, userId)
  const row = await prisma.chatThread.findUniqueOrThrow({ where: { id: threadId }, select: threadSelect })
  return toSummary(row, userId, 0)
}

/** Returns messages oldest-first and marks the thread read for the viewer. */
export async function listMessages(
  threadId: string,
  userId: string,
  after?: Date | null,
): Promise<ChatMessageInfo[]> {
  await requireMember(threadId, userId)

  const select = { id: true, body: true, createdAt: true, user: { select: { id: true, name: true } } } as const
  const rows = after
    ? await prisma.chatMessage.findMany({
        where: { threadId, createdAt: { gt: after } },
        orderBy: { createdAt: 'asc' },
        take: MESSAGE_PAGE,
        select,
      })
    : (
        await prisma.chatMessage.findMany({
          where: { threadId },
          orderBy: { createdAt: 'desc' },
          take: MESSAGE_PAGE,
          select,
        })
      ).reverse()

  await prisma.threadMember.update({
    where: { threadId_userId: { threadId, userId } },
    data: { lastReadAt: new Date() },
  })

  return rows.map((m) => ({
    id: m.id,
    body: m.body,
    createdAt: m.createdAt.toISOString(),
    // Names are visible inside a conversation; see lib/privacy.ts.
    author: m.user,
    mine: m.user.id === userId,
  }))
}

export async function postMessage(threadId: string, userId: string, body: string): Promise<ChatMessageInfo> {
  await requireMember(threadId, userId)
  const now = new Date()

  const [message] = await prisma.$transaction([
    prisma.chatMessage.create({
      data: { threadId, userId, body, createdAt: now },
      select: { id: true, body: true, createdAt: true, user: { select: { id: true, name: true } } },
    }),
    prisma.chatThread.update({ where: { id: threadId }, data: { lastMessageAt: now } }),
    prisma.threadMember.update({
      where: { threadId_userId: { threadId, userId } },
      data: { lastReadAt: now },
    }),
  ])

  return {
    id: message.id,
    body: message.body,
    createdAt: message.createdAt.toISOString(),
    author: message.user,
    mine: true,
  }
}

/** Opens the one direct thread between two people, creating it on first use. */
export async function openDirectThread(userId: string, otherId: string): Promise<{ id: string }> {
  if (userId === otherId) throw new ApiError(400, 'You cannot start a chat with yourself.')
  const directKey = [userId, otherId].sort().join(':')

  const existing = await prisma.chatThread.findUnique({ where: { directKey }, select: { id: true } })
  if (existing) return existing

  const other = await prisma.user.findUnique({ where: { id: otherId }, select: { isPrivate: true } })
  if (!other) throw notFound('That person')
  if (other.isPrivate) throw forbidden('This person has a private account and is not accepting new chats.')

  return prisma.chatThread.create({
    data: {
      kind: 'direct',
      directKey,
      createdById: userId,
      members: { create: [{ userId }, { userId: otherId }] },
    },
    select: { id: true },
  })
}

export async function createGroupThread(userId: string, name: string, memberIds: string[]): Promise<{ id: string }> {
  const ids = [...new Set(memberIds)].filter((id) => id !== userId)
  const people = await prisma.user.findMany({
    where: { id: { in: ids }, isPrivate: false },
    select: { id: true },
  })
  if (people.length !== ids.length) {
    throw new ApiError(400, 'Some of those people cannot be added to a group chat.')
  }

  return prisma.chatThread.create({
    data: {
      kind: 'group',
      name,
      createdById: userId,
      members: { create: [{ userId }, ...people.map((p) => ({ userId: p.id }))] },
    },
    select: { id: true },
  })
}

/** Leaves a direct or group thread. Community chats follow membership instead. */
export async function leaveThread(threadId: string, userId: string) {
  await requireMember(threadId, userId)
  const thread = await prisma.chatThread.findUniqueOrThrow({ where: { id: threadId }, select: { kind: true } })
  if (thread.kind === 'community') {
    throw new ApiError(400, 'Leave the community to leave its chat.')
  }
  await prisma.threadMember.delete({ where: { threadId_userId: { threadId, userId } } })
  const remaining = await prisma.threadMember.count({ where: { threadId } })
  if (remaining === 0) await prisma.chatThread.delete({ where: { id: threadId } })
}
