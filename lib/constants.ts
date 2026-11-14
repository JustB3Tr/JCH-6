// Shared by server and client. Keep this file free of server-only imports.

export const PLACE_TYPES = [
  'park',
  'beach',
  'trail',
  'garden',
  'viewpoint',
  'plaza',
  'market',
  'cafe',
  'library',
  'museum',
  'sports',
  'other',
] as const
export type PlaceType = (typeof PLACE_TYPES)[number]

export const TINTS = [
  'blue',
  'green',
  'mint',
  'teal',
  'cyan',
  'indigo',
  'purple',
  'pink',
  'red',
  'orange',
  'brown',
  'gray',
] as const
export type Tint = (typeof TINTS)[number]

// Apple Maps category colors, used for pins, chips and community icons.
export const TINT_HEX: Record<Tint, string> = {
  blue: '#007AFF',
  green: '#34C759',
  mint: '#00C7BE',
  teal: '#30B0C7',
  cyan: '#32ADE6',
  indigo: '#5856D6',
  purple: '#AF52DE',
  pink: '#FF2D55',
  red: '#FF3B30',
  orange: '#FF9500',
  brown: '#A2845E',
  gray: '#8E8E93',
}

export const PLACE_TYPE_META: Record<PlaceType, { label: string; plural: string; tint: Tint }> = {
  park: { label: 'Park', plural: 'Parks', tint: 'green' },
  beach: { label: 'Beach', plural: 'Beaches', tint: 'cyan' },
  trail: { label: 'Trail', plural: 'Trails', tint: 'brown' },
  garden: { label: 'Garden', plural: 'Gardens', tint: 'mint' },
  viewpoint: { label: 'Viewpoint', plural: 'Viewpoints', tint: 'indigo' },
  plaza: { label: 'Plaza', plural: 'Plazas', tint: 'purple' },
  market: { label: 'Market', plural: 'Markets', tint: 'red' },
  cafe: { label: 'Cafe', plural: 'Cafes', tint: 'orange' },
  library: { label: 'Library', plural: 'Libraries', tint: 'blue' },
  museum: { label: 'Museum', plural: 'Museums', tint: 'pink' },
  sports: { label: 'Sports', plural: 'Sports', tint: 'teal' },
  other: { label: 'Spot', plural: 'More', tint: 'gray' },
}

export const RSVP_STATUSES = ['going', 'maybe', 'cant'] as const
export type RsvpStatus = (typeof RSVP_STATUSES)[number]

export const RSVP_LABELS: Record<RsvpStatus, string> = {
  going: 'Going',
  maybe: 'Maybe',
  cant: "Can't go",
}

export const COMMUNITY_ICONS = [
  'users',
  'mountain',
  'sunset',
  'basket',
  'dog',
  'bike',
  'coffee',
  'book',
  'music',
  'palette',
  'ball',
  'leaf',
  'camera',
  'gamepad',
  'utensils',
  'waves',
] as const
export type CommunityIcon = (typeof COMMUNITY_ICONS)[number]

export const LA_CENTER = { lat: 34.0522, lng: -118.2437 }

// Rough envelope of Los Angeles County, used to bias external place search.
export const LA_BOUNDS = { south: 33.7, west: -118.95, north: 34.82, east: -117.65 }

export const PRIVATE_NAME = 'Private member'
