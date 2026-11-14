import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const place = await prisma.place.findUnique({
    where: { id },
    include: {
      amenities: { include: { amenity: true } },
      feedbacks: { include: { user: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 20 },
      events: {
        where: { startsAt: { gte: new Date() } },
        orderBy: { startsAt: 'asc' },
        include: { rsvps: { select: { id: true } } },
      },
    },
  })
  if (!place) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const ratings = place.feedbacks.map((f) => f.rating)
  return NextResponse.json({
    place: {
      ...place,
      amenities: place.amenities.map((pa) => pa.amenity),
      avgRating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null,
    },
  })
}
