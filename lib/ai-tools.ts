import { prisma } from '@/lib/prisma'

// Tool definitions in the OpenAI-compatible shape Ollama expects.
export const AI_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'search_places',
      description:
        'Search the hangout-spot database for parks, plazas, cafes and trails across LA County. Use this before recommending any place.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Free-text keywords, e.g. "shaded picnic", "beach sunset", "dog park".',
          },
          type: {
            type: 'string',
            enum: ['park', 'plaza', 'cafe', 'trail', 'other'],
            description: 'Optional place type filter.',
          },
          amenity: {
            type: 'string',
            description:
              'Optional amenity slug: pet-friendly, bathrooms, shaded, free-parking, wifi, playground, food-nearby, quiet, wheelchair, picnic-tables.',
          },
          limit: { type: 'integer', description: 'Max results (default 8, max 15).' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_place',
      description: 'Look up one place by name or id, including its amenities, rating and upcoming events.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Place name, partial names are fine.' },
          id: { type: 'string', description: 'Exact place id if already known.' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'nearby_places',
      description: 'Find hangout spots within a radius of a coordinate. Use when the user shares a location or neighborhood center.',
      parameters: {
        type: 'object',
        properties: {
          lat: { type: 'number', description: 'Latitude.' },
          lng: { type: 'number', description: 'Longitude.' },
          radiusKm: { type: 'number', description: 'Radius in kilometers (default 8, max 40).' },
          limit: { type: 'integer', description: 'Max results (default 8, max 15).' },
        },
        required: ['lat', 'lng'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_events',
      description: 'List upcoming community events, optionally limited to the next N days.',
      parameters: {
        type: 'object',
        properties: {
          days: { type: 'integer', description: 'How many days ahead to look (default 30, max 120).' },
          communityId: { type: 'string', description: 'Optional community id to filter by.' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_communities',
      description: 'List communities with member counts and upcoming event counts.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
]

type ToolArgs = Record<string, unknown>

function str(args: ToolArgs, key: string): string | undefined {
  const value = args[key]
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function num(args: ToolArgs, key: string): number | undefined {
  const value = args[key]
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value)
  return undefined
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}

const placeInclude = {
  amenities: { include: { amenity: { select: { slug: true, label: true } } } },
  feedbacks: { select: { rating: true } },
} as const

type PlaceWithMeta = {
  id: string
  name: string
  type: string
  address: string | null
  lat: number
  lng: number
  description: string
  amenities: { amenity: { slug: string; label: string } }[]
  feedbacks: { rating: number }[]
}

function summarizePlace(place: PlaceWithMeta, distance?: number) {
  const ratings = place.feedbacks.map((f) => f.rating)
  return {
    id: place.id,
    name: place.name,
    type: place.type,
    address: place.address,
    lat: Number(place.lat.toFixed(5)),
    lng: Number(place.lng.toFixed(5)),
    amenities: place.amenities.map((a) => a.amenity.slug),
    rating: ratings.length ? Number((ratings.reduce((s, r) => s + r, 0) / ratings.length).toFixed(1)) : null,
    description: place.description.slice(0, 220),
    ...(distance === undefined ? {} : { distanceKm: Number(distance.toFixed(1)) }),
  }
}

async function searchPlaces(args: ToolArgs) {
  const query = str(args, 'query')
  const type = str(args, 'type')
  const amenity = str(args, 'amenity')
  const limit = clamp(num(args, 'limit') ?? 8, 1, 15)

  const filters: Record<string, unknown>[] = [{ approved: true }]
  if (type) filters.push({ type })
  if (amenity) filters.push({ amenities: { some: { amenity: { slug: amenity } } } })
  if (query) {
    filters.push({
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { address: { contains: query, mode: 'insensitive' } },
      ],
    })
  }

  let places = await prisma.place.findMany({
    where: { AND: filters },
    include: placeInclude,
    take: limit,
    orderBy: { name: 'asc' },
  })

  // Fall back to individual keyword matches so multi-word queries still return something useful.
  if (!places.length && query) {
    const words = query.split(/\s+/).filter((w) => w.length > 2)
    if (words.length > 1) {
      places = await prisma.place.findMany({
        where: {
          AND: [
            { approved: true },
            ...(type ? [{ type }] : []),
            { OR: words.flatMap((w) => [{ name: { contains: w, mode: 'insensitive' as const } }, { description: { contains: w, mode: 'insensitive' as const } }]) },
          ],
        },
        include: placeInclude,
        take: limit,
      })
    }
  }

  return { count: places.length, places: places.map((p) => summarizePlace(p)) }
}

async function getPlace(args: ToolArgs) {
  const id = str(args, 'id')
  const name = str(args, 'name')
  if (!id && !name) return { error: 'Provide a place name or id.' }

  const place = await prisma.place.findFirst({
    where: id ? { id } : { name: { contains: name!, mode: 'insensitive' } },
    include: {
      ...placeInclude,
      events: {
        where: { startsAt: { gte: new Date() } },
        orderBy: { startsAt: 'asc' },
        take: 5,
        select: { id: true, title: true, startsAt: true },
      },
    },
  })
  if (!place) return { error: `No place found for "${name ?? id}".` }

  return {
    ...summarizePlace(place),
    description: place.description,
    upcomingEvents: place.events.map((e) => ({ id: e.id, title: e.title, startsAt: e.startsAt.toISOString() })),
  }
}

async function nearbyPlaces(args: ToolArgs) {
  const lat = num(args, 'lat')
  const lng = num(args, 'lng')
  if (lat === undefined || lng === undefined) return { error: 'lat and lng are required.' }
  const radiusKm = clamp(num(args, 'radiusKm') ?? 8, 0.5, 40)
  const limit = clamp(num(args, 'limit') ?? 8, 1, 15)

  const latDelta = radiusKm / 111
  const lngDelta = radiusKm / (111 * Math.max(Math.cos((lat * Math.PI) / 180), 0.2))

  const places = await prisma.place.findMany({
    where: {
      approved: true,
      lat: { gte: lat - latDelta, lte: lat + latDelta },
      lng: { gte: lng - lngDelta, lte: lng + lngDelta },
    },
    include: placeInclude,
  })

  const ranked = places
    .map((p) => ({ place: p, distance: distanceKm(lat, lng, p.lat, p.lng) }))
    .filter((p) => p.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)

  return {
    count: ranked.length,
    radiusKm,
    places: ranked.map((r) => summarizePlace(r.place, r.distance)),
  }
}

async function listEvents(args: ToolArgs) {
  const days = clamp(num(args, 'days') ?? 30, 1, 120)
  const communityId = str(args, 'communityId')
  const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000)

  const events = await prisma.event.findMany({
    where: {
      startsAt: { gte: new Date(), lte: until },
      ...(communityId ? { communityId } : {}),
    },
    orderBy: { startsAt: 'asc' },
    take: 20,
    include: {
      place: { select: { name: true, address: true } },
      community: { select: { name: true, slug: true } },
      rsvps: { where: { status: 'going' }, select: { id: true } },
    },
  })

  return {
    count: events.length,
    events: events.map((e) => ({
      id: e.id,
      title: e.title,
      startsAt: e.startsAt.toISOString(),
      place: e.place?.name ?? null,
      address: e.place?.address ?? null,
      community: e.community?.name ?? null,
      going: e.rsvps.length,
      description: e.description.slice(0, 200),
    })),
  }
}

async function listCommunities() {
  const communities = await prisma.community.findMany({
    orderBy: { name: 'asc' },
    include: {
      memberships: { select: { userId: true } },
      events: { where: { startsAt: { gte: new Date() } }, select: { id: true } },
    },
  })

  return {
    count: communities.length,
    communities: communities.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      description: c.description,
      members: c.memberships.length,
      upcomingEvents: c.events.length,
    })),
  }
}

export async function runTool(name: string, rawArgs: unknown) {
  const args: ToolArgs =
    rawArgs && typeof rawArgs === 'object' ? (rawArgs as ToolArgs) : typeof rawArgs === 'string' ? safeParse(rawArgs) : {}

  try {
    switch (name) {
      case 'search_places':
        return await searchPlaces(args)
      case 'get_place':
        return await getPlace(args)
      case 'nearby_places':
        return await nearbyPlaces(args)
      case 'list_events':
        return await listEvents(args)
      case 'list_communities':
        return await listCommunities()
      default:
        return { error: `Unknown tool "${name}".` }
    }
  } catch (error) {
    console.log('[v0] AI tool failed:', name, error instanceof Error ? error.message : error)
    return { error: `The ${name} lookup failed.` }
  }
}

function safeParse(value: string): ToolArgs {
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' ? (parsed as ToolArgs) : {}
  } catch {
    return {}
  }
}
