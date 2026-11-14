import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/lib/api-auth'

const feedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).default(''),
})

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const parsed = feedbackSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid feedback.' }, { status: 400 })

  const place = await prisma.place.findUnique({ where: { id }, select: { id: true } })
  if (!place) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const feedback = await prisma.feedback.create({
    data: { placeId: id, userId, rating: parsed.data.rating, comment: parsed.data.comment },
  })
  return NextResponse.json({ feedback }, { status: 201 })
}
