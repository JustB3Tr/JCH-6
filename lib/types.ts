import type { PlaceType, RsvpStatus } from '@/lib/constants'

// The JSON contract between the API and any client. Dates are ISO strings.

export type PersonRef = { id: string | null; name: string; isPrivate: boolean }

export type AmenityInfo = { slug: string; label: string; icon: string; count: number }

export type Meta = {
  types: { type: PlaceType; count: number }[]
  amenities: AmenityInfo[]
  totals: { places: number; events: number; communities: number }
}

export type PlaceSummary = {
  id: string
  name: string
  type: PlaceType
  lat: number
  lng: number
  address: string | null
  area: string | null
  blurb: string
  hasPhoto: boolean
  amenities: string[]
  ratingAvg: number | null
  ratingCount: number
  upcomingEvents: number
  saved: boolean
  distanceKm?: number
}

export type ReviewInfo = {
  id: string
  rating: number
  comment: string
  createdAt: string
  author: PersonRef
  mine: boolean
}

export type PlaceDetail = PlaceSummary & {
  description: string
  reviews: ReviewInfo[]
  myReview: { rating: number; comment: string } | null
  events: EventSummary[]
  nearby: PlaceSummary[]
  canDelete: boolean
}

export type EventSummary = {
  id: string
  title: string
  description: string
  startsAt: string
  endsAt: string | null
  place: { id: string; name: string; type: PlaceType; lat: number; lng: number; area: string | null } | null
  community: { id: string; slug: string; name: string; icon: string; tint: string } | null
  host: PersonRef
  goingCount: number
  myRsvp: RsvpStatus | null
  isHost: boolean
}

export type EventDetail = EventSummary & {
  attendees: { person: PersonRef; status: RsvpStatus }[]
  privateAttendees: number
  maybeCount: number
}

export type CommunitySummary = {
  id: string
  slug: string
  name: string
  description: string
  icon: string
  tint: string
  memberCount: number
  upcomingEvents: number
  joined: boolean
  role: 'member' | 'organizer' | null
}

export type CommunityDetail = CommunitySummary & {
  members: { person: PersonRef; role: 'member' | 'organizer' }[]
  privateMembers: number
  events: EventSummary[]
  threadId: string | null
}

export type ThreadSummary = {
  id: string
  kind: 'direct' | 'group' | 'community'
  name: string
  community: { slug: string; icon: string; tint: string } | null
  memberCount: number
  lastMessage: { body: string; author: string; createdAt: string } | null
  lastMessageAt: string
  unread: number
}

export type ChatMessageInfo = {
  id: string
  body: string
  createdAt: string
  author: { id: string; name: string }
  mine: boolean
}

export type Me = {
  id: string
  name: string
  email: string
  bio: string
  homeArea: string | null
  isPrivate: boolean
  createdAt: string
  stats: { saved: number; rsvps: number; communities: number; reviews: number }
}

export type Profile =
  | { id: string; isPrivate: true; name: string; isSelf: false }
  | {
      id: string
      isPrivate: boolean
      isSelf: boolean
      name: string
      bio: string
      homeArea: string | null
      joinedAt: string
      communities: { slug: string; name: string; icon: string; tint: string }[]
      hosting: EventSummary[]
    }

export type ExternalPlace = {
  googlePlaceId: string
  name: string
  address: string
  lat: number
  lng: number
}

export type SearchResults = {
  places: PlaceSummary[]
  events: EventSummary[]
  communities: CommunitySummary[]
  external: ExternalPlace[]
}

export type AiChatInfo = { id: string; title: string; updatedAt: string }

export type AiWebSource = {
  title: string
  url: string
  domain: string
  snippet?: string
}

export type AiToolStep = {
  id: string
  name: string
  label: string
  detail?: string
  summary?: string
  status: 'running' | 'done'
}

export type ConversationalVoice = {
  id: string
  name: string
  persona: string
  accent: string
}

export type AiMessageInfo = {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  places: PlaceSummary[]
  tools: string[]
  sources?: AiWebSource[]
  steps?: AiToolStep[]
}

export type AiToolInfo = { name: string; label: string; description: string; core: boolean; changesData: boolean }

// One JSON object per line on the /api/ai/chat response stream.
export type AiStreamEvent =
  | { type: 'chat'; chatId: string }
  | { type: 'tool'; stepId: string; name: string; label: string; detail?: string }
  | { type: 'tool_done'; stepId: string; name: string; summary?: string }
  | { type: 'reset' }
  | { type: 'delta'; text: string }
  | { type: 'places'; places: PlaceSummary[] }
  | { type: 'sources'; sources: AiWebSource[] }
  | { type: 'done'; messageId: string; tools: string[]; steps: AiToolStep[] }
  | { type: 'error'; message: string }
