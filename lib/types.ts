export type AmenityLite = {
  id: string
  slug: string
  label: string
  icon: string
}

export type PlaceLite = {
  id: string
  name: string
  description: string
  type: string
  lat: number
  lng: number
  address: string | null
  photoUrl: string | null
  amenities: AmenityLite[]
  feedbackCount: number
  avgRating: number | null
}

export type EventLite = {
  id: string
  title: string
  description: string
  startsAt: string
  endsAt: string | null
  placeId: string | null
  placeName: string | null
  communityId: string | null
  communityName: string | null
  communityEmoji: string | null
  hostName: string
  goingCount: number
  myRsvp: string | null
}

export type CommunityLite = {
  id: string
  slug: string
  name: string
  description: string
  emoji: string
  memberCount: number
  joined: boolean
  upcomingEvents: number
}

export type ChatThreadLite = {
  id: string
  kind: string
  name: string
  communityId: string | null
  createdAt: string
  lastMessage: string | null
  lastMessageAt: string | null
}

export type ChatMessageLite = {
  id: string
  body: string
  createdAt: string
  userId: string
  userName: string
}

export type AiChatLite = {
  id: string
  title: string
  createdAt: string
}

export type AiMessageLite = {
  id: string
  role: string
  content: string
  createdAt: string
}
