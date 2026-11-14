import { z } from 'zod'
import { created, getUserId, handle, intParam, listParam, readJson, requireUserId, throttle } from '@/lib/api'
import { PLACE_TYPES } from '@/lib/constants'
import { parseBounds, parseLatLng } from '@/lib/geo'
import { createPlace, listPlaces } from '@/lib/data/places'

const SORTS = ['relevance', 'distance', 'rating', 'name'] as const

/**
 * GET /api/places
 *   q          text search (search-as-you-type prefix matching)
 *   types      comma-separated place types
 *   amenities  comma-separated amenity slugs; a place must have all of them
 *   bounds     south,west,north,east viewport
 *   near       lat,lng — adds distanceKm and sorts by distance
 *   radius     kilometers around `near`
 *   saved      1 to return only the viewer's saved places
 *   sort       relevance | distance | rating | name
 *   limit      1-500
 */
export const GET = handle(async (request) => {
  const params = new URL(request.url).searchParams
  const viewerId = await getUserId()
  const sort = SORTS.find((s) => s === params.get('sort'))

  if (params.get('saved') === '1' && !viewerId) return { places: [] }

  const places = await listPlaces({
    q: params.get('q') ?? undefined,
    types: listParam(params.get('types')),
    amenities: listParam(params.get('amenities')),
    bounds: parseBounds(params.get('bounds')),
    near: parseLatLng(params.get('near')),
    radiusKm: params.get('radius') ? Math.min(Math.max(Number(params.get('radius')) || 8, 0.2), 100) : undefined,
    savedBy: params.get('saved') === '1' && viewerId ? viewerId : undefined,
    sort,
    limit: intParam(params.get('limit'), 500, 1, 500),
    viewerId,
  })
  return { places }
})

const createPlaceSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).default(''),
  type: z.enum(PLACE_TYPES).default('other'),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().trim().max(300).nullish(),
  googlePlaceId: z.string().trim().min(5).max(200).nullish(),
  amenities: z.array(z.string().max(40)).max(20).default([]),
})

export const POST = handle(async (request) => {
  const userId = await requireUserId()
  throttle(`place:create:${userId}`, 10, 60 * 60_000)

  const input = await readJson(request, createPlaceSchema)
  const result = await createPlace(userId, input)
  return created(result)
})
