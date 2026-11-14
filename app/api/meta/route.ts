import { NextResponse } from 'next/server'
import { handle } from '@/lib/api'
import { getMeta } from '@/lib/data/places'

// Place categories and amenity filters with live counts.
export const GET = handle(async () =>
  NextResponse.json(await getMeta(), {
    headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' },
  }),
)
