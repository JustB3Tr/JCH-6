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

/** Text search biased to LA County, for places not on the Outly map yet. */
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

type LivePlaceDetailsResponse = {
  places?: {
    id: string
    displayName?: { text?: string }
    formattedAddress?: string
    websiteUri?: string
    nationalPhoneNumber?: string
    rating?: number
    userRatingCount?: number
    editorialSummary?: { text?: string }
    allowsDogs?: boolean
    restroom?: boolean
    goodForChildren?: boolean
    currentOpeningHours?: {
      openNow?: boolean
      weekdayDescriptions?: string[]
    }
    regularOpeningHours?: {
      openNow?: boolean
      weekdayDescriptions?: string[]
    }
    parkingOptions?: {
      freeParkingLot?: boolean
      paidParkingLot?: boolean
      freeStreetParking?: boolean
      paidStreetParking?: boolean
    }
  }[]
}

export type LivePlaceDetails = {
  name: string
  address: string
  openNow?: boolean
  hours?: string[]
  website?: string
  phone?: string
  rating?: number
  reviewCount?: number
  summary?: string
  allowsDogs?: boolean
  hasRestrooms?: boolean
  goodForChildren?: boolean
  parking?: string[]
}

/** Live hours, contact URL, dog policy and parking from Google Places (New). */
export async function lookupLivePlaceDetails(query: string, limit = 3): Promise<LivePlaceDetails[]> {
  const data = await placesFetch<LivePlaceDetailsResponse>('/places:searchText', {
    method: 'POST',
    fieldMask: [
      'places.id',
      'places.displayName',
      'places.formattedAddress',
      'places.websiteUri',
      'places.nationalPhoneNumber',
      'places.rating',
      'places.userRatingCount',
      'places.editorialSummary',
      'places.allowsDogs',
      'places.restroom',
      'places.goodForChildren',
      'places.currentOpeningHours',
      'places.regularOpeningHours',
      'places.parkingOptions',
    ].join(','),
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

  return (data?.places ?? []).map((place) => {
    const parking: string[] = []
    if (place.parkingOptions?.freeParkingLot) parking.push('free parking lot')
    if (place.parkingOptions?.paidParkingLot) parking.push('paid parking lot')
    if (place.parkingOptions?.freeStreetParking) parking.push('free street parking')
    if (place.parkingOptions?.paidStreetParking) parking.push('paid street parking')

    const hours =
      place.currentOpeningHours?.weekdayDescriptions ?? place.regularOpeningHours?.weekdayDescriptions
    const openNow = place.currentOpeningHours?.openNow ?? place.regularOpeningHours?.openNow

    return {
      name: place.displayName?.text ?? query,
      address: place.formattedAddress ?? '',
      openNow,
      hours: hours?.length ? hours : undefined,
      website: place.websiteUri,
      phone: place.nationalPhoneNumber,
      rating: place.rating,
      reviewCount: place.userRatingCount,
      summary: place.editorialSummary?.text,
      allowsDogs: place.allowsDogs,
      hasRestrooms: place.restroom,
      goodForChildren: place.goodForChildren,
      parking: parking.length ? parking : undefined,
    }
  })
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
