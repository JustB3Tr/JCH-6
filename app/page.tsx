import { getMeta } from '@/lib/data/places'
import { MapScreen } from '@/components/map/map-screen'

export default async function MapPage() {
  const meta = await getMeta()

  return (
    <MapScreen
      apiKey={process.env.GOOGLE_MAPS_API_KEY ?? ''}
      mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? 'DEMO_MAP_ID'}
      meta={meta}
    />
  )
}
