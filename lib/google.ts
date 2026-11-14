import { LA_BOUNDS } from '@/lib/constants'
import type { ExternalPlace } from '@/lib/types'

// Server-side client for Google Places (New). The key never reaches the
// browser through these calls.

const PLACES_URL = 'https://places.googleapis.com/v1'
const TIMEOUT_MS = 6000

const apiKey = () => process.env.GOOGLE_MAPS_API_KEY ?? ''

export const googleConfigured = () => Boolean(apiKey())

async function placesFetch<T>(path: string, init: RequestInit & { fieldMask?: string } = {}): Promise<T | null> {
  if (!apiKey()) return null
  try {
    const response = await fetch(`${PLACES_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey(),
        ...(init.fieldMask ? { 'X-Goog-FieldMask': init.fieldMask } : {}),
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!response.ok) return null
    return (await response.json()) as T
  } catch {
    return null
  }
}

type TextSearchResponse = {
  places?: {
    id: string
    displayName?: { text?: string }
    formattedAddress?: string
    location?: { latitude?: number; longitude?: number }
  }[]
}

/** Text search biased to LA County, for places not on the Hangout map yet. */
export async function searchGooglePlaces(query: string, limit = 5): Promise<ExternalPlace[]> {
  const data = await placesFetch<TextSearchResponse>('/places:searchText', {
    method: 'POST',
    fieldMask: 'places.id,places.displayName,places.formattedAddress,places.location',
    body: JSON.stringify({
      textQuery: query,
      maxResultCount: limit,
      regionCode: 'US',
      locationBias: {
        rectangle: {
          low: { latitude: LA_BOUNDS.south, longitude: LA_BOUNDS.west },
          high: { latitude: LA_BOUNDS.north, longitude: LA_BOUNDS.east },
        },
      },
    }),
  })

  return (data?.places ?? []).flatMap((p) =>
    p.location?.latitude != null && p.location.longitude != null
      ? [
          {
            googlePlaceId: p.id,
            name: p.displayName?.text ?? query,
            address: p.formattedAddress ?? '',
            lat: p.location.latitude,
            lng: p.location.longitude,
          },
        ]
      : [],
  )
}

/** Photo resource name for a place, e.g. "places/abc/photos/xyz". */
export async function fetchPhotoRef(googlePlaceId: string): Promise<string | null> {
  const data = await placesFetch<{ photos?: { name?: string }[] }>(`/places/${encodeURIComponent(googlePlaceId)}`, {
    fieldMask: 'photos',
  })
  return data?.photos?.[0]?.name ?? null
}

/** Short-lived image URL for a photo resource name. */
export async function fetchPhotoUri(photoRef: string, maxWidthPx = 960): Promise<string | null> {
  if (!/^places\/[\w-]+\/photos\/[\w-]+$/.test(photoRef)) return null
  const data = await placesFetch<{ photoUri?: string }>(
    `/${photoRef}/media?maxWidthPx=${maxWidthPx}&skipHttpRedirect=true`,
  )
  return data?.photoUri ?? null
}
