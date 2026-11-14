import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/lib/api-auth'

const rsvpSchema = z.object({ status: z.enum(['going', 'maybe', 'cant']) })

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const parsed = rsvpSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid RSVP.' }, { status: 400 })

  const event = await prisma.event.findUnique({ where: { id }, select: { id: true } })
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const existing = await prisma.rsvp.findUnique({
    where: { eventId_userId: { eventId: id, userId } },
  })

  // Clicking the same status again cancels the RSVP.
  if (existing && existing.status === parsed.data.status) {
    await prisma.rsvp.delete({ where: { id: existing.id } })
    return NextResponse.json({ myRsvp: null })
  }

  const rsvp = await prisma.rsvp.upsert({
    where: { eventId_userId: { eventId: id, userId } },
    update: { status: parsed.data.status },
    create: { eventId: id, userId, status: parsed.data.status },
  })
  return NextResponse.json({ myRsvp: rsvp.status })
}
