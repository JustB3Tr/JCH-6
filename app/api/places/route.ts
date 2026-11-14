import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/lib/api-auth'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim() ?? ''
  const type = searchParams.get('type')?.trim() ?? ''
  const amenitiesParam = searchParams.get('amenities')?.trim() ?? ''
  const amenitySlugs = amenitiesParam ? amenitiesParam.split(',').filter(Boolean) : []

  const places = await prisma.place.findMany({
    where: {
      approved: true,
      AND: [
        q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }] } : {},
        type ? { type } : {},
        ...amenitySlugs.map((slug) => ({ amenities: { some: { amenity: { slug } } } })),
      ],
    },
    include: {
      amenities: { include: { amenity: true } },
      feedbacks: { select: { rating: true } },
    },
    orderBy: { name: 'asc' },
  })

  const data = places.map((p) => {
    const ratings = p.feedbacks.map((f) => f.rating)
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      type: p.type,
      lat: p.lat,
      lng: p.lng,
      address: p.address,
      photoUrl: p.photoUrl,
      amenities: p.amenities.map((pa) => pa.amenity),
      feedbackCount: ratings.length,
      avgRating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null,
    }
  })

  return NextResponse.json({ places: data })
}

const createPlaceSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).default(''),
  type: z.enum(['park', 'plaza', 'cafe', 'trail', 'other']).default('other'),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().trim().max(300).optional().nullable(),
  amenitySlugs: z.array(z.string()).max(20).default([]),
})

export async function POST(request: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = createPlaceSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid place data.' }, { status: 400 })
  }

  const { amenitySlugs, ...data } = parsed.data
  const amenities = await prisma.amenity.findMany({ where: { slug: { in: amenitySlugs } } })

  const place = await prisma.place.create({
    data: {
      ...data,
      address: data.address ?? null,
      createdById: userId,
      amenities: { create: amenities.map((a) => ({ amenityId: a.id })) },
    },
    include: { amenities: { include: { amenity: true } } },
  })

  return NextResponse.json({ place }, { status: 201 })
}
