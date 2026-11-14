import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/lib/api-auth'

const membershipSchema = z.object({ join: z.boolean() })

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const parsed = membershipSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })

  const community = await prisma.community.findUnique({ where: { id }, select: { id: true } })
  if (!community) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (parsed.data.join) {
    await prisma.membership.upsert({
      where: { userId_communityId: { userId, communityId: id } },
      update: {},
      create: { userId, communityId: id },
    })
  } else {
    await prisma.membership.deleteMany({ where: { userId, communityId: id } })
  }

  return NextResponse.json({ joined: parsed.data.join })
}
