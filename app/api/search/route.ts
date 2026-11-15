import { clientIp, getUserId, handle } from '@/lib/api'
import { parseLatLng } from '@/lib/geo'
import { googleConfigured } from '@/lib/google'
import { rateLimit } from '@/lib/rate-limit'
import { searchEverything } from '@/lib/data/search'
import type { SearchResults } from '@/lib/types'

const EMPTY: SearchResults = { places: [], events: [], communities: [], external: [] }

/**
 * GET /api/search?q=&near=lat,lng&external=1
 * Places, events and communities on Outly, plus Google results for spots
 * that are not listed yet when `external=1`.
 */
export const GET = handle(async (request) => {
  const params = new URL(request.url).searchParams
  const q = (params.get('q') ?? '').trim().slice(0, 120)
  if (q.length < 2) return EMPTY

  const viewerId = await getUserId()
  // Google lookups are billed, so they are opt-in, need three characters and
  // are throttled per caller. When throttled the rest of the search still works.
  const includeExternal =
    params.get('external') === '1' &&
    q.length >= 3 &&
    googleConfigured() &&
    rateLimit(`search:external:${viewerId ?? clientIp(request)}`, 20, 60_000)

  return searchEverything({ q, near: parseLatLng(params.get('near')), viewerId, includeExternal })
})
