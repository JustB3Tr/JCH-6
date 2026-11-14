import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/lib/api-auth'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { searchParams } = new URL(request.url)
  const after = searchParams.get('after')

  const messages = await prisma.chatMessage.findMany({
    where: { threadId: id, ...(after ? { createdAt: { gt: new Date(after) } } : {}) },
    orderBy: { createdAt: 'asc' },
    take: 200,
    include: { user: { select: { name: true } } },
  })

  return NextResponse.json({
    messages: messages.map((m) => ({
      id: m.id,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
      userId: m.userId,
      userName: m.user.name,
    })),
  })
}

const messageSchema = z.object({ body: z.string().trim().min(1).max(2000) })

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const parsed = messageSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Message is empty.' }, { status: 400 })

  const message = await prisma.chatMessage.create({
    data: { threadId: id, userId, body: parsed.data.body },
    include: { user: { select: { name: true } } },
  })

  return NextResponse.json(
    {
      message: {
        id: message.id,
        body: message.body,
        createdAt: message.createdAt.toISOString(),
        userId: message.userId,
        userName: message.user.name,
      },
    },
    { status: 201 },
  )
}
