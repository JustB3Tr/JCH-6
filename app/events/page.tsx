import { prisma } from '@/lib/prisma'
import { EventsBrowser } from '@/components/events/events-browser'

export default async function EventsPage() {
  const amenities = await prisma.amenity.findMany({ orderBy: { label: 'asc' } })
  return <EventsBrowser amenityCount={amenities.length} />
}
