import { NextResponse } from 'next/server'

// Server-side proxy for the Google Places (New) Text Search API so the key
// never reaches the browser. Used by the map search bar for autocomplete.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()
  if (!q) return NextResponse.json({ results: [], configured: Boolean(process.env.GOOGLE_MAPS_API_KEY) })

  if (!process.env.GOOGLE_MAPS_API_KEY) {
    return NextResponse.json({ results: [], configured: false })
  }

  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': process.env.GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask':
          'places.id,places.displayName,places.formattedAddress,places.location,places.types',
      },
      body: JSON.stringify({ textQuery: q, maxResultCount: 6 }),
    })
    if (!res.ok) return NextResponse.json({ results: [], configured: true, error: 'Places API error' })

    const json = (await res.json()) as {
      places?: Array<{
        id: string
        displayName?: { text?: string }
        formattedAddress?: string
        location?: { latitude?: number; longitude?: number }
        types?: string[]
      }>
    }
    const results = (json.places ?? []).map((p) => ({
      id: p.id,
      name: p.displayName?.text ?? '',
      address: p.formattedAddress ?? '',
      lat: p.location?.latitude ?? null,
      lng: p.location?.longitude ?? null,
      types: p.types ?? [],
    }))
    return NextResponse.json({ results, configured: true })
  } catch {
    return NextResponse.json({ results: [], configured: true, error: 'Places API unreachable' })
  }
}
