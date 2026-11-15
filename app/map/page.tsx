import type { Metadata } from 'next'
import { getMeta } from '@/lib/data/places'
import { PLACE_TYPES, type PlaceType } from '@/lib/constants'
import { pageTitle } from '@/lib/brand'
import { MapScreen } from '@/components/map/map-screen'

export const metadata: Metadata = { title: pageTitle('Map Explorer') }

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; type?: string | string[] }>
}) {
  const [meta, params] = await Promise.all([getMeta(), searchParams])
  const q = typeof params.q === 'string' ? params.q.slice(0, 120) : ''
  const type = typeof params.type === 'string' ? params.type : ''
  const initialType = (PLACE_TYPES as readonly string[]).includes(type) ? (type as PlaceType) : 'all'

  return (
    <MapScreen
      apiKey={process.env.GOOGLE_MAPS_API_KEY ?? ''}
      mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? 'DEMO_MAP_ID'}
      meta={meta}
      initialQuery={q}
      initialType={initialType}
    />
  )
}
