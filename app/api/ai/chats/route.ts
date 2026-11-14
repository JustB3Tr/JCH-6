import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/lib/api-auth'

export async function GET() {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ chats: [] })

  const chats = await prisma.aiChat.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true, createdAt: true },
  })
  return NextResponse.json({ chats: chats.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() })) })
}

export async function POST() {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const chat = await prisma.aiChat.create({ data: { userId } })
  return NextResponse.json({ chat: { id: chat.id, title: chat.title, createdAt: chat.createdAt.toISOString() } }, { status: 201 })
}
