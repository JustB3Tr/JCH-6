import type { LatLng } from '@/lib/geo'
import { distanceKm } from '@/lib/geo'
import { searchGooglePlaces } from '@/lib/google'
import { listCommunities } from '@/lib/data/communities'
import { listEvents } from '@/lib/data/events'
import { listPlaces } from '@/lib/data/places'
import type { SearchResults } from '@/lib/types'

/**
 * One search across everything on the map, plus optional Google results for
 * places Outly does not list yet (so people can add them).
 */
export async function searchEverything(options: {
  q: string
  near?: LatLng | null
  viewerId: string | null
  includeExternal: boolean
}): Promise<SearchResults> {
  const { q, near, viewerId } = options

  const [prefixPlaces, events, communities, external] = await Promise.all([
    listPlaces({ q, searchMode: 'prefix', near, limit: 10, sort: 'relevance', viewerId }),
    listEvents({ q, when: 'upcoming', limit: 5, viewerId }),
    listCommunities({ q, limit: 5, viewerId }),
    options.includeExternal ? searchGooglePlaces(q, 5) : [],
  ])

  // Fall back to looser matching so a full sentence still finds something.
  const places = prefixPlaces.length
    ? prefixPlaces
    : await listPlaces({ q, searchMode: 'any', near, limit: 10, sort: 'relevance', viewerId })

  // Hide Google results that are already on the map.
  const known = places.map((p) => ({ lat: p.lat, lng: p.lng, name: p.name.toLowerCase() }))
  const fresh = external.filter(
    (e) => !known.some((p) => distanceKm(p, e) < 0.15 || p.name === e.name.toLowerCase()),
  )

  return { places, events, communities, external: fresh }
}
