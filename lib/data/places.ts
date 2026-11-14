import { Prisma } from '@/lib/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { ApiError, forbidden, notFound } from '@/lib/api'
import { PLACE_TYPES, type PlaceType } from '@/lib/constants'
import { areaLabel, boundsAround, distanceKm, type Bounds, type LatLng } from '@/lib/geo'
import { fetchPhotoRef } from '@/lib/google'
import { personSelect, toPerson } from '@/lib/privacy'
import { buildTsQuery, type SearchMode } from '@/lib/data/text-search'
import { listEvents } from '@/lib/data/events'
import type { Meta, PlaceDetail, PlaceSummary } from '@/lib/types'

const MAX_PLACES = 500

function summarySelect() {
  return {
    id: true,
    name: true,
    type: true,
    lat: true,
    lng: true,
    address: true,
    description: true,
    photoRef: true,
    ratingAvg: true,
    ratingCount: true,
    amenities: { select: { amenity: { select: { slug: true } } } },
    _count: { select: { events: { where: { startsAt: { gte: new Date() } } } } },
  } satisfies Prisma.PlaceSelect
}

type PlaceRow = Prisma.PlaceGetPayload<{ select: ReturnType<typeof summarySelect> }>

function blurbOf(description: string) {
  const firstSentence = description.split(/(?<=[.!?])\s/)[0] ?? ''
  const text = firstSentence.length >= 40 ? firstSentence : description
  return text.length > 150 ? `${text.slice(0, 147).trimEnd()}...` : text
}

function toSummary(row: PlaceRow, saved: Set<string>, origin?: LatLng): PlaceSummary {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    lat: row.lat,
    lng: row.lng,
    address: row.address,
    area: areaLabel(row),
    blurb: blurbOf(row.description),
    hasPhoto: Boolean(row.photoRef),
    amenities: row.amenities.map((a) => a.amenity.slug),
    ratingAvg: row.ratingAvg === null ? null : Math.round(row.ratingAvg * 10) / 10,
    ratingCount: row.ratingCount,
    upcomingEvents: row._count.events,
    saved: saved.has(row.id),
    ...(origin ? { distanceKm: Math.round(distanceKm(origin, row) * 10) / 10 } : {}),
  }
}

async function savedIds(viewerId: string | null | undefined): Promise<Set<string>> {
  if (!viewerId) return new Set()
  const rows = await prisma.savedPlace.findMany({ where: { userId: viewerId }, select: { placeId: true } })
  return new Set(rows.map((r) => r.placeId))
}

/**
 * Ranked full-text match over name, type, amenity labels, address and
 * description. Returns ids best-first, or null when the query has no usable
 * terms (callers then skip text filtering).
 */
async function rankPlaceIds(query: string, mode: SearchMode, limit = 200): Promise<string[] | null> {
  const tsQuery = buildTsQuery(query, mode)
  if (!tsQuery) return null

  const rows = await prisma.$queryRaw<{ id: string }[]>`
    WITH docs AS (
      SELECT p."id",
        setweight(to_tsvector('english', p."name"), 'A') ||
        setweight(to_tsvector('english', p."type"::text || ' ' || coalesce(string_agg(a."label", ' '), '')), 'B') ||
        setweight(to_tsvector('english', coalesce(p."address", '')), 'B') ||
        setweight(to_tsvector('english', p."description"), 'C') AS doc
      FROM "Place" p
      LEFT JOIN "PlaceAmenity" pa ON pa."placeId" = p."id"
      LEFT JOIN "Amenity" a ON a."id" = pa."amenityId"
      WHERE p."approved"
      GROUP BY p."id"
    )
    SELECT d."id"
    FROM docs d, to_tsquery('english', ${tsQuery}) AS query
    WHERE d.doc @@ query
    ORDER BY ts_rank(d.doc, query) DESC, d."id"
    LIMIT ${limit}`
  return rows.map((r) => r.id)
}

export type PlaceQuery = {
  q?: string
  searchMode?: SearchMode
  types?: string[]
  amenities?: string[]
  bounds?: Bounds | null
  near?: LatLng | null
  radiusKm?: number
  ids?: string[]
  savedBy?: string
  sort?: 'relevance' | 'distance' | 'rating' | 'name'
  limit?: number
  viewerId?: string | null
}

export async function listPlaces(query: PlaceQuery = {}): Promise<PlaceSummary[]> {
  const limit = Math.min(query.limit ?? MAX_PLACES, MAX_PLACES)
  const types = (query.types ?? []).filter((t): t is PlaceType => (PLACE_TYPES as readonly string[]).includes(t))
  const text = query.q?.trim()

  const ranked = text ? await rankPlaceIds(text, query.searchMode ?? 'prefix') : null
  if (text && ranked && ranked.length === 0) return []

  const box = query.bounds ?? (query.near && query.radiusKm ? boundsAround(query.near, query.radiusKm) : null)
  // A viewport that crosses the antimeridian has west > east.
  const lngFilter = box
    ? box.west <= box.east
      ? { lng: { gte: box.west, lte: box.east } }
      : { OR: [{ lng: { gte: box.west } }, { lng: { lte: box.east } }] }
    : {}

  const where: Prisma.PlaceWhereInput = {
    approved: true,
    ...(types.length ? { type: { in: types } } : {}),
    ...(box ? { lat: { gte: box.south, lte: box.north }, ...lngFilter } : {}),
    ...(query.savedBy ? { savedBy: { some: { userId: query.savedBy } } } : {}),
    AND: [
      ...(ranked ? [{ id: { in: ranked } }] : []),
      ...(query.ids ? [{ id: { in: query.ids } }] : []),
      ...(query.amenities ?? []).map((slug) => ({ amenities: { some: { amenity: { slug } } } })),
    ],
  }

  const [rows, saved] = await Promise.all([
    prisma.place.findMany({ where, select: summarySelect(), orderBy: { name: 'asc' }, take: MAX_PLACES }),
    savedIds(query.viewerId),
  ])

  let places = rows.map((row) => toSummary(row, saved, query.near ?? undefined))
  if (query.near && query.radiusKm) {
    places = places.filter((p) => (p.distanceKm ?? 0) <= query.radiusKm!)
  }

  const sort = query.sort ?? (ranked ? 'relevance' : query.near ? 'distance' : 'name')
  if (sort === 'relevance' && ranked) {
    const position = new Map(ranked.map((id, index) => [id, index]))
    places.sort((a, b) => (position.get(a.id) ?? 0) - (position.get(b.id) ?? 0))
  } else if (sort === 'distance' && query.near) {
    places.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0))
  } else if (sort === 'rating') {
    places.sort(
      (a, b) =>
        (b.ratingAvg ?? 0) - (a.ratingAvg ?? 0) ||
        b.ratingCount - a.ratingCount ||
        b.upcomingEvents - a.upcomingEvents ||
        a.name.localeCompare(b.name),
    )
  }

  return places.slice(0, limit)
}

export async function getPlaceDetail(id: string, viewerId: string | null): Promise<PlaceDetail> {
  const row = await prisma.place.findFirst({
    where: { id, approved: true },
    select: {
      ...summarySelect(),
      createdById: true,
      feedbacks: {
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: { id: true, rating: true, comment: true, createdAt: true, user: { select: personSelect } },
      },
    },
  })
  if (!row) throw notFound('That place')

  const [saved, events, nearby, myReview] = await Promise.all([
    savedIds(viewerId),
    listEvents({ placeId: id, when: 'upcoming', limit: 10, viewerId }),
    listPlaces({ near: row, radiusKm: 6, limit: 5, viewerId }),
    viewerId
      ? prisma.feedback.findUnique({
          where: { placeId_userId: { placeId: id, userId: viewerId } },
          select: { rating: true, comment: true },
        })
      : null,
  ])

  return {
    ...toSummary(row, saved),
    description: row.description,
    reviews: row.feedbacks.map((f) => ({
      id: f.id,
      rating: f.rating,
      comment: f.comment,
      createdAt: f.createdAt.toISOString(),
      author: toPerson(f.user, viewerId),
      mine: f.user.id === viewerId,
    })),
    myReview,
    events,
    nearby: nearby.filter((p) => p.id !== id).slice(0, 4),
    canDelete: Boolean(viewerId) && row.createdById === viewerId,
  }
}

export type NewPlace = {
  name: string
  description: string
  type: PlaceType
  lat: number
  lng: number
  address?: string | null
  googlePlaceId?: string | null
  amenities: string[]
}

export async function createPlace(userId: string, input: NewPlace): Promise<{ id: string; existing: boolean }> {
  if (input.googlePlaceId) {
    const existing = await prisma.place.findUnique({
      where: { googlePlaceId: input.googlePlaceId },
      select: { id: true },
    })
    if (existing) return { id: existing.id, existing: true }
  }

  // Guard against the same spot being pinned twice a few meters apart.
  const box = boundsAround(input, 0.15)
  const duplicate = await prisma.place.findFirst({
    where: {
      name: { equals: input.name, mode: 'insensitive' },
      lat: { gte: box.south, lte: box.north },
      lng: { gte: box.west, lte: box.east },
    },
    select: { id: true },
  })
  if (duplicate) return { id: duplicate.id, existing: true }

  const [amenities, photoRef] = await Promise.all([
    prisma.amenity.findMany({ where: { slug: { in: input.amenities } }, select: { id: true } }),
    input.googlePlaceId ? fetchPhotoRef(input.googlePlaceId) : null,
  ])

  const place = await prisma.place.create({
    data: {
      name: input.name,
      description: input.description,
      type: input.type,
      lat: input.lat,
      lng: input.lng,
      address: input.address || null,
      googlePlaceId: input.googlePlaceId || null,
      photoRef,
      createdById: userId,
      amenities: { create: amenities.map((a) => ({ amenityId: a.id })) },
    },
    select: { id: true },
  })
  metaCache = null
  return { id: place.id, existing: false }
}

export async function deletePlace(id: string, userId: string) {
  const place = await prisma.place.findUnique({ where: { id }, select: { createdById: true } })
  if (!place) throw notFound('That place')
  if (place.createdById !== userId) throw forbidden('Only the person who added this place can remove it.')
  await prisma.place.delete({ where: { id } })
  metaCache = null
}

export async function setPlaceSaved(userId: string, placeId: string, saved: boolean) {
  if (!saved) {
    await prisma.savedPlace.deleteMany({ where: { userId, placeId } })
    return
  }
  const place = await prisma.place.findFirst({ where: { id: placeId, approved: true }, select: { id: true } })
  if (!place) throw notFound('That place')
  await prisma.savedPlace.upsert({
    where: { userId_placeId: { userId, placeId } },
    update: {},
    create: { userId, placeId },
  })
}

async function refreshRating(tx: Prisma.TransactionClient, placeId: string) {
  const stats = await tx.feedback.aggregate({ where: { placeId }, _avg: { rating: true }, _count: true })
  await tx.place.update({
    where: { id: placeId },
    data: { ratingAvg: stats._avg.rating, ratingCount: stats._count },
  })
}

/** Creates or edits the viewer's single review of a place. */
export async function saveReview(userId: string, placeId: string, rating: number, comment: string) {
  const place = await prisma.place.findFirst({ where: { id: placeId, approved: true }, select: { id: true } })
  if (!place) throw notFound('That place')

  await prisma.$transaction(async (tx) => {
    await tx.feedback.upsert({
      where: { placeId_userId: { placeId, userId } },
      update: { rating, comment, createdAt: new Date() },
      create: { placeId, userId, rating, comment },
    })
    await refreshRating(tx, placeId)
  })
}

export async function deleteReview(userId: string, placeId: string) {
  await prisma.$transaction(async (tx) => {
    const removed = await tx.feedback.deleteMany({ where: { placeId, userId } })
    if (removed.count) await refreshRating(tx, placeId)
  })
}

let metaCache: { value: Meta; expires: number } | null = null

/** Category and amenity catalog with live counts, for filter chips. */
export async function getMeta(): Promise<Meta> {
  if (metaCache && metaCache.expires > Date.now()) return metaCache.value

  const [typeCounts, amenities, events, communities] = await Promise.all([
    prisma.place.groupBy({ by: ['type'], where: { approved: true }, _count: true }),
    prisma.amenity.findMany({
      orderBy: { label: 'asc' },
      select: { slug: true, label: true, icon: true, _count: { select: { places: true } } },
    }),
    prisma.event.count({ where: { startsAt: { gte: new Date() } } }),
    prisma.community.count(),
  ])

  const countByType = new Map(typeCounts.map((t) => [t.type, t._count]))
  const value: Meta = {
    types: PLACE_TYPES.map((type) => ({ type, count: countByType.get(type) ?? 0 })).filter((t) => t.count > 0),
    amenities: amenities.map((a) => ({ slug: a.slug, label: a.label, icon: a.icon, count: a._count.places })),
    totals: { places: typeCounts.reduce((sum, t) => sum + t._count, 0), events, communities },
  }
  metaCache = { value, expires: Date.now() + 60_000 }
  return value
}

export function assertPlaceType(value: string): PlaceType {
  if (!(PLACE_TYPES as readonly string[]).includes(value)) throw new ApiError(400, 'Unknown place type.')
  return value as PlaceType
}
