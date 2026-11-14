import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/lib/api-auth'

export async function GET() {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ threads: [] })

  const myCommunities = await prisma.membership.findMany({
    where: { userId },
    select: { communityId: true },
  })
  const communityIds = myCommunities.map((m) => m.communityId)

  const threads = await prisma.chatThread.findMany({
    where: {
      OR: [{ createdById: userId }, { communityId: { in: communityIds } }],
    },
    orderBy: { createdAt: 'desc' },
    include: {
      messages: { orderBy: { createdAt: 'desc' }, take: 1, include: { user: { select: { name: true } } } },
    },
  })

  const data = threads.map((t) => ({
    id: t.id,
    kind: t.kind,
    name: t.name ?? 'Direct chat',
    communityId: t.communityId,
    createdAt: t.createdAt.toISOString(),
    lastMessage: t.messages[0]?.body ?? null,
    lastMessageAt: t.messages[0]?.createdAt.toISOString() ?? null,
  }))

  return NextResponse.json({ threads: data })
}

const createThreadSchema = z.object({
  kind: z.enum(['direct', 'community']),
  communityId: z.string().optional().nullable(),
  name: z.string().trim().max(120).optional().nullable(),
})

export async function POST(request: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = createThreadSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid thread data.' }, { status: 400 })

  if (parsed.data.kind === 'community' && parsed.data.communityId) {
    const membership = await prisma.membership.findUnique({
      where: { userId_communityId: { userId, communityId: parsed.data.communityId } },
    })
    if (!membership) return NextResponse.json({ error: 'Join the community first.' }, { status: 403 })
  }

  const thread = await prisma.chatThread.create({
    data: {
      kind: parsed.data.kind,
      communityId: parsed.data.communityId || null,
      name: parsed.data.name || 'New chat',
      createdById: userId,
    },
  })
  return NextResponse.json({ thread }, { status: 201 })
}
