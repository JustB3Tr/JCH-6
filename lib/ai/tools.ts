import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { PLACE_TYPES, RSVP_STATUSES } from '@/lib/constants'
import { distanceKm, nearestArea, resolveArea, type LatLng } from '@/lib/geo'
import { lookupLivePlaceDetails, searchGooglePlaces } from '@/lib/google'
import { readWebpage, searchWeb } from '@/lib/ai/web'
import { getCommunity, listCommunities } from '@/lib/data/communities'
import { listEvents, setRsvp } from '@/lib/data/events'
import { searchKnowledge } from '@/lib/data/knowledge'
import { getPlaceDetail, listPlaces, setPlaceSaved } from '@/lib/data/places'
import { tokenize } from '@/lib/data/text-search'
import type { ToolSpec } from '@/lib/ai/ollama'
import type { AiToolInfo, AiWebSource, EventSummary, PlaceSummary } from '@/lib/types'

/**
 * The guide's tools.
 *
 * Core tools are sent to the model on every turn. The rest are discoverable:
 * the model calls `discover_tools` with a few words describing what it needs,
 * gets back the matching tool definitions, and those tools are added to its
 * toolset for the rest of the chat. Keeping the default toolset small makes a
 * local model noticeably better at picking the right one.
 */

export type ToolContext = {
  userId: string
  location: LatLng | null
  /** Records places a tool returned so the reply can be shown with cards. */
  notePlaces: (places: PlaceSummary[]) => void
  /** Records web pages a tool used so the reply can cite them. */
  noteSources: (sources: AiWebSource[]) => void
  /** Adds discoverable tools to the model's toolset. */
  activate: (names: string[]) => void
}

type Tool<S extends z.ZodObject = z.ZodObject> = {
  name: string
  /** Short present-tense phrase shown in the UI while the tool runs. */
  label: string
  description: string
  /** Extra words that should lead discovery to this tool. */
  keywords: string[]
  core: boolean
  changesData?: boolean
  schema: S
  run: (args: z.infer<S>, ctx: ToolContext) => Promise<unknown>
}

function tool<S extends z.ZodObject>(definition: Tool<S>): Tool {
  return definition as unknown as Tool
}

const PT_FORMAT = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Los_Angeles',
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

const compact = <T extends Record<string, unknown>>(object: T) =>
  Object.fromEntries(Object.entries(object).filter(([, v]) => v !== null && v !== undefined && v !== '')) as Partial<T>

function placeForModel(place: PlaceSummary) {
  return compact({
    id: place.id,
    name: place.name,
    type: place.type,
    area: place.area,
    amenities: place.amenities,
    rating: place.ratingAvg,
    reviews: place.ratingCount || null,
    upcoming_events: place.upcomingEvents || null,
    distance_km: place.distanceKm,
    saved_by_user: place.saved || null,
    about: place.blurb,
  })
}

function eventForModel(event: EventSummary) {
  return compact({
    id: event.id,
    title: event.title,
    when: PT_FORMAT.format(new Date(event.startsAt)),
    starts_at: event.startsAt,
    place: event.place?.name,
    place_id: event.place?.id,
    area: event.place?.area,
    community: event.community?.name,
    host: event.host.name,
    going: event.goingCount,
    user_rsvp: event.myRsvp,
    about: event.description.slice(0, 220),
  })
}

type Origin = { point: LatLng; label: string }

/** Turns "me", a neighborhood, a city, coordinates or a landmark into a point. */
async function resolveNear(near: string | undefined, ctx: ToolContext): Promise<Origin | { error: string } | null> {
  const text = near?.trim()
  if (!text) return null

  if (/^(me|here|my location|current location|near me|nearby|user)$/i.test(text)) {
    if (!ctx.location) {
      return { error: 'The user has not shared their location. Ask which neighborhood or city they are in.' }
    }
    return { point: ctx.location, label: nearestArea(ctx.location)?.name ?? 'your location' }
  }

  const area = resolveArea(text)
  if (area) return { point: area, label: area.name }

  const [hit] = await searchGooglePlaces(text, 1)
  if (hit) return { point: hit, label: hit.name }

  return { error: `Could not find "${text}". Use a neighborhood or city in Los Angeles County.` }
}

const nearField = z
  .string()
  .max(80)
  .optional()
  .describe('Where to search around: a neighborhood or city ("Pasadena"), a landmark, "lat,lng", or "me" for the user\'s location.')

const tools: Tool[] = [
  tool({
    name: 'search_places',
    label: 'Searching the map',
    description:
      'Search Outly for places to meet up in LA County. Combine free-text keywords with filters. Results are ranked by relevance, or by distance when `near` is set. Use this before recommending any place.',
    keywords: ['place', 'spot', 'park', 'beach', 'trail', 'cafe', 'where', 'recommend', 'nearby'],
    core: true,
    schema: z.object({
      query: z.string().max(120).optional().describe('Keywords for the vibe or activity, e.g. "sunset picnic", "quiet reading".'),
      type: z.enum(PLACE_TYPES).optional().describe('Only this kind of place.'),
      amenities: z.array(z.string()).max(6).optional().describe('Amenity slugs the place must have, e.g. ["pet-friendly","shaded"].'),
      near: nearField,
      radius_km: z.coerce.number().min(0.5).max(60).optional().describe('Search radius around `near`. Default 8.'),
      limit: z.coerce.number().int().min(1).max(12).optional().describe('How many results. Default 6.'),
    }),
    async run(args, ctx) {
      const origin = await resolveNear(args.near, ctx)
      if (origin && 'error' in origin) return origin

      const known = new Set((await prisma.amenity.findMany({ select: { slug: true } })).map((a) => a.slug))
      const amenities = (args.amenities ?? []).filter((slug) => known.has(slug))
      const ignored = (args.amenities ?? []).filter((slug) => !known.has(slug))
      const limit = args.limit ?? 6
      const radiusKm = args.radius_km ?? 8

      const search = (overrides: { q?: string; amenities?: string[]; radiusKm?: number } = {}) =>
        listPlaces({
          q: 'q' in overrides ? overrides.q : args.query,
          searchMode: 'any',
          types: args.type ? [args.type] : [],
          amenities: overrides.amenities ?? amenities,
          near: origin?.point,
          radiusKm: origin ? (overrides.radiusKm ?? radiusKm) : undefined,
          sort: origin ? 'distance' : args.query ? 'relevance' : 'rating',
          limit,
          viewerId: ctx.userId,
        })

      let places = await search()
      let note: string | undefined

      // Broaden step by step instead of returning nothing.
      if (!places.length && args.query && (amenities.length || args.type || origin)) {
        places = await search({ q: undefined })
        if (places.length) note = `Nothing matched the keywords "${args.query}", so these match the filters only.`
      }
      if (!places.length && origin) {
        places = await search({ q: undefined, radiusKm: Math.min(radiusKm * 3, 60) })
        if (places.length) note = `Nothing within ${radiusKm} km, so the search was widened.`
      }
      if (!places.length && amenities.length > 1) {
        places = await search({ q: undefined, amenities: amenities.slice(0, 1), radiusKm: Math.min(radiusKm * 3, 60) })
        if (places.length) note = `No place has every requested amenity; these have "${amenities[0]}".`
      }

      ctx.notePlaces(places)
      return compact({
        count: places.length,
        searched_around: origin?.label,
        note,
        ignored_amenities: ignored.length ? ignored : undefined,
        places: places.map(placeForModel),
      })
    },
  }),

  tool({
    name: 'find_events',
    label: 'Checking events',
    description:
      'List upcoming Outly events (meetups with a time, place and RSVP count). Filter by keywords, date window, area or community.',
    keywords: ['event', 'meetup', 'happening', 'weekend', 'tonight', 'calendar', 'join', 'going'],
    core: true,
    schema: z.object({
      query: z.string().max(120).optional().describe('Keywords in the title, description, place or community.'),
      days: z.coerce.number().int().min(1).max(120).optional().describe('How many days ahead to look. Default 14.'),
      near: nearField,
      radius_km: z.coerce.number().min(1).max(60).optional().describe('Radius around `near`. Default 12.'),
      community: z.string().max(80).optional().describe('Community slug or name to limit to.'),
    }),
    async run(args, ctx) {
      const origin = await resolveNear(args.near, ctx)
      if (origin && 'error' in origin) return origin

      let communityId: string | undefined
      if (args.community) {
        const [match] = await listCommunities({ q: args.community, limit: 1 })
        const bySlug = match ?? (await prisma.community.findUnique({ where: { slug: args.community }, select: { id: true } }))
        if (!bySlug) return { error: `No community matches "${args.community}".` }
        communityId = bySlug.id
      }

      const days = args.days ?? 14
      const events = await listEvents({
        when: 'upcoming',
        to: new Date(Date.now() + days * 86_400_000),
        q: args.query,
        near: origin?.point,
        radiusKm: args.radius_km ?? 12,
        communityId,
        limit: 12,
        viewerId: ctx.userId,
      })
      return compact({
        count: events.length,
        window_days: days,
        searched_around: origin?.label,
        events: events.map(eventForModel),
      })
    },
  }),

  tool({
    name: 'search_knowledge',
    label: 'Checking the guidebook',
    description:
      'Search the Outly guidebook: how the app works (accounts, privacy, RSVPs, communities, adding places), meetup etiquette and safety, and practical LA knowledge (parking, transit, beach and park rules, dogs, permits, weather and seasons).',
    keywords: ['how', 'help', 'rules', 'privacy', 'safety', 'parking', 'transit', 'etiquette', 'tips', 'faq'],
    core: true,
    schema: z.object({
      query: z.string().min(2).max(160).describe('What you need to know, in plain words.'),
    }),
    async run(args) {
      const articles = await searchKnowledge(args.query, 3)
      if (!articles.length) return { count: 0, note: 'The guidebook has nothing on this. Say so rather than guessing.' }
      return {
        count: articles.length,
        articles: articles.map((a) => ({ title: a.title, topic: a.category, text: a.body })),
      }
    },
  }),

  tool({
    name: 'web_search',
    label: 'Searching the web',
    description:
      'Search the live web for things the map and guidebook cannot know: today\'s opening hours, closures, road or trail conditions, prices, news, or what a place is like right now. Returns titles, links and snippets. Cite the links you use.',
    keywords: ['web', 'search', 'internet', 'news', 'hours', 'open', 'closed', 'closure', 'price', 'current', 'today', 'conditions', 'traffic', 'review', 'latest'],
    core: true,
    schema: z.object({
      query: z.string().min(2).max(160).describe('What to look up, phrased like a search query.'),
      limit: z.coerce.number().int().min(1).max(6).optional().describe('How many results. Default 5.'),
    }),
    async run(args, ctx) {
      const { query, instantAnswer, results } = await searchWeb(args.query, args.limit ?? 5)
      ctx.noteSources(results)
      if (!results.length && !instantAnswer) {
        return { query, count: 0, note: 'No web results. Try different words, or rely on the map and guidebook.' }
      }
      return compact({
        query,
        count: results.length,
        instant_answer: instantAnswer,
        results: results.map((r) => ({ title: r.title, url: r.url, domain: r.domain, snippet: r.snippet })),
        note: 'Snippets can be out of date. Open a page with read_webpage when the detail matters.',
      })
    },
  }),

  tool({
    name: 'read_webpage',
    label: 'Reading a page',
    description:
      'Open one public web page from a search result and read its main text. Use it to confirm hours, rules, closures or prices before telling the user.',
    keywords: ['read', 'page', 'open', 'article', 'website', 'details', 'confirm', 'verify', 'link'],
    core: false,
    schema: z.object({
      url: z.string().min(8).max(500).describe('A full http(s) URL, usually from web_search.'),
    }),
    async run(args, ctx) {
      const page = await readWebpage(args.url)
      if ('error' in page) return page
      ctx.noteSources([{ title: page.title, url: page.url, domain: page.domain, snippet: page.description }])
      return compact({
        title: page.title,
        url: page.url,
        domain: page.domain,
        description: page.description,
        content: page.content,
      })
    },
  }),

  tool({
    name: 'lookup_live_place_info',
    label: 'Checking live place info',
    description:
      "Live details from Google for a named place: whether it is open now, this week's hours, phone, website, rating, dog policy, restrooms, whether it suits children, and parking. Use it for operational questions about a specific spot.",
    keywords: ['hours', 'open', 'closed', 'phone', 'website', 'parking', 'dogs', 'restroom', 'rating', 'live', 'google', 'today', 'admission'],
    core: false,
    schema: z.object({
      place: z.string().min(2).max(120).describe('Place name, ideally with its area, e.g. "Griffith Observatory, Los Angeles".'),
      limit: z.coerce.number().int().min(1).max(3).optional().describe('How many matches. Default 1.'),
    }),
    async run(args) {
      const matches = await lookupLivePlaceDetails(args.place, args.limit ?? 1)
      if (!matches.length) return { error: 'Google has no live listing for that. Try web_search instead.' }
      return { count: matches.length, places: matches }
    },
  }),

  tool({
    name: 'discover_tools',
    label: 'Finding the right tool',
    description:
      'Find and load additional tools for a capability you do not have yet. Describe the capability in a few words. Matching tools are returned with their parameters and become callable immediately.',
    keywords: [],
    core: true,
    schema: z.object({
      query: z.string().min(2).max(120).describe('The capability needed, e.g. "weather forecast", "RSVP to an event", "fair meeting point".'),
    }),
    async run(args, ctx) {
      const matches = discoverTools(args.query)
      const loaded = matches.length ? matches : []
      ctx.activate(loaded.map((t) => t.name))
      if (!loaded.length) {
        return {
          loaded: [],
          note: 'No tool matches that. These are all the optional tools:',
          available: optionalTools.map((t) => ({ name: t.name, description: t.description })),
        }
      }
      return {
        loaded: loaded.map((t) => ({ name: t.name, description: t.description, parameters: parametersOf(t) })),
        note: 'These tools are now available. Call them directly.',
      }
    },
  }),

  tool({
    name: 'get_place_details',
    label: 'Looking at the place',
    description:
      'Full details for one place: description, address, amenities, rating, recent review comments, upcoming events there and other spots nearby.',
    keywords: ['place', 'details', 'reviews', 'rating', 'address', 'about', 'more', 'info', 'amenities'],
    core: false,
    schema: z.object({
      place_id: z.string().max(40).optional().describe('Id from an earlier search result. Preferred.'),
      name: z.string().max(120).optional().describe('Place name, if the id is not known.'),
    }),
    async run(args, ctx) {
      let id = args.place_id
      if (!id && args.name) {
        const [match] = await listPlaces({ q: args.name, searchMode: 'prefix', limit: 1 })
        id = match?.id ?? (await listPlaces({ q: args.name, searchMode: 'any', limit: 1 }))[0]?.id
      }
      if (!id) return { error: 'No place matches. Use search_places first.' }

      const place = await getPlaceDetail(id, ctx.userId).catch(() => null)
      if (!place) return { error: 'That place is not on the map.' }
      ctx.notePlaces([place, ...place.nearby])

      return compact({
        ...placeForModel(place),
        about: place.description,
        address: place.address,
        // Review authors are deliberately left out.
        recent_reviews: place.reviews
          .filter((r) => r.comment)
          .slice(0, 4)
          .map((r) => ({ rating: r.rating, comment: r.comment.slice(0, 240) })),
        user_review: place.myReview,
        events_here: place.events.slice(0, 5).map(eventForModel),
        nearby: place.nearby.map((p) => ({ id: p.id, name: p.name, type: p.type, distance_km: p.distanceKm })),
      })
    },
  }),

  tool({
    name: 'list_communities',
    label: 'Browsing communities',
    description: 'List Outly communities (interest groups that organize meetups) with member and event counts.',
    keywords: ['community', 'communities', 'group', 'club', 'people', 'join', 'interest', 'meet'],
    core: false,
    schema: z.object({
      query: z.string().max(80).optional().describe('Keywords in the name or description.'),
    }),
    async run(args, ctx) {
      const communities = await listCommunities({ q: args.query, viewerId: ctx.userId, limit: 12 })
      return {
        count: communities.length,
        communities: communities.map((c) => ({
          slug: c.slug,
          name: c.name,
          about: c.description,
          members: c.memberCount,
          upcoming_events: c.upcomingEvents,
          user_is_member: c.joined,
        })),
      }
    },
  }),

  tool({
    name: 'get_community',
    label: 'Looking at the community',
    description: 'Details for one community, including its upcoming events.',
    keywords: ['community', 'group', 'club', 'events', 'details'],
    core: false,
    schema: z.object({
      community: z.string().min(1).max(80).describe('Community slug (preferred) or name.'),
    }),
    async run(args, ctx) {
      const direct = await getCommunity(args.community, ctx.userId).catch(() => null)
      const slug = direct ? null : (await listCommunities({ q: args.community, limit: 1 }))[0]?.slug
      const community = direct ?? (slug ? await getCommunity(slug, ctx.userId).catch(() => null) : null)
      if (!community) return { error: `No community matches "${args.community}".` }
      return {
        slug: community.slug,
        name: community.name,
        about: community.description,
        members: community.memberCount,
        user_is_member: community.joined,
        events: community.events.slice(0, 8).map(eventForModel),
      }
    },
  }),

  tool({
    name: 'get_my_plans',
    label: 'Checking your plans',
    description:
      "The current user's own Outly activity: events they RSVP'd to or host, communities they belong to, and places they saved.",
    keywords: ['my', 'mine', 'plans', 'schedule', 'rsvp', 'saved', 'favorites', 'calendar', 'going', 'joined'],
    core: false,
    schema: z.object({}),
    async run(_args, ctx) {
      const [attending, communities, saved] = await Promise.all([
        listEvents({ when: 'upcoming', attendeeId: ctx.userId, limit: 15, viewerId: ctx.userId }),
        listCommunities({ viewerId: ctx.userId, joinedOnly: true, limit: 20 }),
        listPlaces({ savedBy: ctx.userId, limit: 15, viewerId: ctx.userId }),
      ])
      ctx.notePlaces(saved)
      return {
        upcoming_events: attending.map((e) => ({ ...eventForModel(e), hosting: e.isHost || undefined })),
        communities: communities.map((c) => ({ slug: c.slug, name: c.name, role: c.role })),
        saved_places: saved.map((p) => ({ id: p.id, name: p.name, type: p.type, area: p.area })),
      }
    },
  }),

  tool({
    name: 'rsvp_to_event',
    label: 'Updating your RSVP',
    description:
      "Set or clear the current user's RSVP for an event. Only call this when the user clearly asks to RSVP, and use an event id from find_events.",
    keywords: ['rsvp', 'going', 'attend', 'sign', 'join', 'event', 'cancel', 'maybe'],
    core: false,
    changesData: true,
    schema: z.object({
      event_id: z.string().min(1).max(40).describe('Event id from find_events.'),
      status: z.enum([...RSVP_STATUSES, 'none']).describe('"going", "maybe", "cant", or "none" to remove the RSVP.'),
    }),
    async run(args, ctx) {
      const event = await prisma.event.findUnique({
        where: { id: args.event_id },
        select: { title: true, startsAt: true },
      })
      if (!event) return { error: 'No event has that id. Look it up with find_events first.' }
      const result = await setRsvp(ctx.userId, args.event_id, args.status === 'none' ? null : args.status)
      return {
        ok: true,
        event: event.title,
        when: PT_FORMAT.format(event.startsAt),
        user_rsvp: result.myRsvp ?? 'none',
        going: result.goingCount,
      }
    },
  }),

  tool({
    name: 'save_place',
    label: 'Updating saved places',
    description:
      "Add a place to, or remove it from, the current user's saved places. Only call this when the user asks to save or unsave.",
    keywords: ['save', 'bookmark', 'favorite', 'remember', 'list', 'unsave', 'remove'],
    core: false,
    changesData: true,
    schema: z.object({
      place_id: z.string().min(1).max(40).describe('Place id from search_places.'),
      saved: z.boolean().optional().describe('true to save (default), false to remove.'),
    }),
    async run(args, ctx) {
      const saved = args.saved ?? true
      try {
        await setPlaceSaved(ctx.userId, args.place_id, saved)
      } catch {
        return { error: 'No place has that id. Look it up with search_places first.' }
      }
      return { ok: true, saved }
    },
  }),

  tool({
    name: 'get_weather',
    label: 'Checking the forecast',
    description:
      'Daily weather forecast for an LA County area (up to 7 days): conditions, high and low in °F, chance of rain, wind, UV index and sunset time.',
    keywords: ['weather', 'forecast', 'rain', 'temperature', 'hot', 'cold', 'wind', 'sunset', 'sunrise', 'uv', 'sunny'],
    core: false,
    schema: z.object({
      near: nearField,
      days: z.coerce.number().int().min(1).max(7).optional().describe('Days of forecast. Default 3.'),
    }),
    async run(args, ctx) {
      const origin = (await resolveNear(args.near ?? (ctx.location ? 'me' : 'Downtown LA'), ctx)) as
        | Origin
        | { error: string }
      if ('error' in origin) return origin
      return fetchForecast(origin, args.days ?? 3)
    },
  }),

  tool({
    name: 'find_meeting_point',
    label: 'Finding a fair midpoint',
    description:
      'For a group coming from different neighborhoods: finds Outly places that are fair for everyone, minimizing the longest trip. Returns each option with its distance from every starting point.',
    keywords: ['middle', 'midpoint', 'halfway', 'between', 'fair', 'central', 'meet', 'group', 'friends', 'coming', 'from'],
    core: false,
    schema: z.object({
      from: z.array(z.string().max(80)).min(2).max(6).describe('Starting areas, e.g. ["Pasadena","Santa Monica"].'),
      type: z.enum(PLACE_TYPES).optional().describe('Only this kind of place.'),
      amenities: z.array(z.string()).max(4).optional().describe('Amenity slugs the place must have.'),
    }),
    async run(args, ctx) {
      const resolved = await Promise.all(args.from.map((name) => resolveNear(name, ctx)))
      const failed = resolved.find((r) => !r || 'error' in r)
      if (failed) return failed ?? { error: 'Each starting point needs a neighborhood or city.' }
      const origins = resolved as Origin[]

      const center = {
        lat: origins.reduce((sum, o) => sum + o.point.lat, 0) / origins.length,
        lng: origins.reduce((sum, o) => sum + o.point.lng, 0) / origins.length,
      }
      const spread = Math.max(...origins.map((o) => distanceKm(center, o.point)))
      const candidates = await listPlaces({
        near: center,
        radiusKm: Math.max(6, spread * 0.6),
        types: args.type ? [args.type] : [],
        amenities: args.amenities ?? [],
        limit: 80,
        viewerId: ctx.userId,
      })

      const ranked = candidates
        .map((place) => {
          const trips = origins.map((o) => distanceKm(o.point, place))
          const longest = Math.max(...trips)
          // Prefer a short longest-trip, then trips of similar length.
          return { place, trips, longest, score: longest + (longest - Math.min(...trips)) * 0.5 }
        })
        .sort((a, b) => a.score - b.score)
        .slice(0, 5)

      ctx.notePlaces(ranked.map((r) => r.place))
      return {
        midpoint_area: nearestArea(center)?.name ?? null,
        count: ranked.length,
        options: ranked.map((r) => ({
          ...placeForModel({ ...r.place, distanceKm: undefined }),
          longest_trip_km: Math.round(r.longest * 10) / 10,
          km_from: Object.fromEntries(origins.map((o, i) => [o.label, Math.round(r.trips[i] * 10) / 10])),
        })),
        note: 'Distances are straight-line; real travel is longer and depends on traffic.',
      }
    },
  }),

  tool({
    name: 'get_directions',
    label: 'Getting directions',
    description:
      'A Google Maps directions link to a Outly place and its straight-line distance from a starting point. Share the link when the user asks how to get somewhere.',
    keywords: ['directions', 'route', 'navigate', 'drive', 'how', 'get', 'there', 'far', 'distance', 'map', 'link'],
    core: false,
    schema: z.object({
      place_id: z.string().min(1).max(40).describe('Destination place id from search_places.'),
      from: z.string().max(80).optional().describe('Starting neighborhood, landmark, or "me". Optional.'),
    }),
    async run(args, ctx) {
      const place = await prisma.place.findFirst({
        where: { id: args.place_id, approved: true },
        select: { name: true, lat: true, lng: true, address: true },
      })
      if (!place) return { error: 'No place has that id. Look it up with search_places first.' }

      const origin = await resolveNear(args.from ?? (ctx.location ? 'me' : undefined), ctx)
      const start = origin && !('error' in origin) ? origin : null
      const url = new URL('https://www.google.com/maps/dir/')
      url.searchParams.set('api', '1')
      url.searchParams.set('destination', `${place.lat},${place.lng}`)
      if (start) url.searchParams.set('origin', `${start.point.lat},${start.point.lng}`)

      return compact({
        destination: place.name,
        address: place.address,
        from: start?.label,
        straight_line_km: start ? Math.round(distanceKm(start.point, place) * 10) / 10 : undefined,
        maps_url: url.toString(),
        note: 'Travel time is not known here; the link shows live driving, transit, biking and walking times.',
      })
    },
  }),
]

const WEATHER_CODES: [number, string][] = [
  [0, 'clear'],
  [3, 'partly cloudy'],
  [48, 'foggy'],
  [57, 'drizzle'],
  [67, 'rain'],
  [77, 'snow'],
  [82, 'rain showers'],
  [86, 'snow showers'],
  [99, 'thunderstorms'],
]

async function fetchForecast(origin: Origin, days: number) {
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.search = new URLSearchParams({
    latitude: origin.point.lat.toFixed(3),
    longitude: origin.point.lng.toFixed(3),
    daily:
      'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,uv_index_max,sunset',
    temperature_unit: 'fahrenheit',
    wind_speed_unit: 'mph',
    timezone: 'America/Los_Angeles',
    forecast_days: String(days),
  }).toString()

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(6000) })
    if (!response.ok) throw new Error(String(response.status))
    const { daily } = (await response.json()) as { daily: Record<string, (number | string)[]> }
    return {
      area: origin.label,
      days: daily.time.map((date, i) => ({
        date,
        conditions: WEATHER_CODES.find(([max]) => Number(daily.weather_code[i]) <= max)?.[1] ?? 'mixed',
        high_f: Math.round(Number(daily.temperature_2m_max[i])),
        low_f: Math.round(Number(daily.temperature_2m_min[i])),
        rain_chance_pct: daily.precipitation_probability_max[i],
        wind_mph: Math.round(Number(daily.wind_speed_10m_max[i])),
        uv_index: Math.round(Number(daily.uv_index_max[i])),
        sunset: String(daily.sunset[i]).slice(11),
      })),
    }
  } catch {
    return { error: 'The forecast service is unavailable right now.' }
  }
}

const toolsByName = new Map(tools.map((t) => [t.name, t]))
const optionalTools = tools.filter((t) => !t.core)

export const CORE_TOOL_NAMES = tools.filter((t) => t.core).map((t) => t.name)

function parametersOf(definition: Tool) {
  const { $schema: _schema, ...parameters } = z.toJSONSchema(definition.schema) as Record<string, unknown>
  return parameters
}

const specCache = new Map<string, ToolSpec>()

/** Tool definitions in the shape the model API expects. */
export function toolSpecs(names: Iterable<string>): ToolSpec[] {
  const specs: ToolSpec[] = []
  for (const name of names) {
    const definition = toolsByName.get(name)
    if (!definition) continue
    let spec = specCache.get(name)
    if (!spec) {
      spec = {
        type: 'function',
        function: { name, description: definition.description, parameters: parametersOf(definition) },
      }
      specCache.set(name, spec)
    }
    specs.push(spec)
  }
  return specs
}

/** Ranks the optional tools against a capability description. */
export function discoverTools(query: string, limit = 3): Tool[] {
  const terms = new Set(tokenize(query))
  if (!terms.size) return []

  const scored = optionalTools.map((definition) => {
    const nameWords = new Set(definition.name.split('_'))
    const descriptionWords = new Set(tokenize(definition.description))
    let score = 0
    for (const term of terms) {
      const stem = term.replace(/(ing|s)$/, '')
      const hit = (words: Iterable<string>) => [...words].some((w) => w === term || (stem.length > 2 && w.startsWith(stem)))
      if (hit(definition.keywords)) score += 3
      if (hit(nameWords)) score += 2
      if (hit(descriptionWords)) score += 1
    }
    return { definition, score }
  })

  const best = Math.max(...scored.map((s) => s.score))
  if (best <= 0) return []
  return scored
    .filter((s) => s.score >= Math.max(2, best * 0.5))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.definition)
}

export const isKnownTool = (name: string) => toolsByName.has(name)
export const toolLabel = (name: string) => toolsByName.get(name)?.label ?? 'Working'

/** Public catalog for clients that want to show what the guide can do. */
export function toolCatalog(): AiToolInfo[] {
  return tools.map((t) => ({
    name: t.name,
    label: t.label,
    description: t.description,
    core: t.core,
    changesData: Boolean(t.changesData),
  }))
}

const MAX_RESULT_CHARS = 7000

function parseArguments(raw: unknown): Record<string, unknown> {
  let value = raw
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value)
    } catch {
      return {}
    }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  // Models often send "" or null for parameters they mean to omit, and a
  // comma-separated string where a list is expected.
  const args: Record<string, unknown> = {}
  for (const [key, entry] of Object.entries(value)) {
    if (entry === null || entry === '') continue
    args[key] = entry
  }
  return args
}

function coerceLists(args: Record<string, unknown>, schema: z.ZodObject) {
  for (const [key, field] of Object.entries(schema.shape)) {
    const inner = field instanceof z.ZodOptional ? field.unwrap() : field
    if (inner instanceof z.ZodArray && typeof args[key] === 'string') {
      args[key] = (args[key] as string)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    }
  }
  return args
}

/** Validates the model's arguments, runs the tool and returns a JSON string. */
export async function runTool(name: string, rawArgs: unknown, ctx: ToolContext): Promise<string> {
  const definition = toolsByName.get(name)
  if (!definition) {
    return JSON.stringify({
      error: `There is no tool named "${name}". Use discover_tools to find the right one.`,
    })
  }

  const parsed = definition.schema.safeParse(coerceLists(parseArguments(rawArgs), definition.schema))
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `${i.path.join('.') || 'arguments'}: ${i.message}`).join('; ')
    return JSON.stringify({ error: `Invalid arguments for ${name} (${problems}). Fix them and call again.` })
  }

  try {
    const result = JSON.stringify(await definition.run(parsed.data, ctx))
    return result.length > MAX_RESULT_CHARS ? `${result.slice(0, MAX_RESULT_CHARS)}…(truncated)` : result
  } catch (error) {
    console.error(`[ai] Tool ${name} failed:`, error)
    return JSON.stringify({ error: `${name} failed unexpectedly. Try a different approach or tell the user.` })
  }
}
