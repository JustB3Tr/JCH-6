import { prisma } from '@/lib/prisma'
import { MapView } from '@/components/map/map-view'

export default async function MapPage() {
  const amenities = await prisma.amenity.findMany({ orderBy: { label: 'asc' } })

  return (
    <MapView
      apiKey={process.env.GOOGLE_MAPS_API_KEY ?? ''}
      amenities={amenities.map((a) => ({ id: a.id, slug: a.slug, label: a.label, icon: a.icon }))}
    />
  )
}
