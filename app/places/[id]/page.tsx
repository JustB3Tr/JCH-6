import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getUserId } from '@/lib/api'
import { getPlaceDetail } from '@/lib/data/places'
import { PlaceDetailView } from '@/components/place/place-detail'
import { pageTitle } from '@/lib/brand'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  try {
    const place = await getPlaceDetail(id, null)
    return {
      title: pageTitle(place.name),
      description: place.blurb || `A ${place.type} in ${place.area ?? 'Los Angeles County'}.`,
    }
  } catch {
    return { title: pageTitle('Place') }
  }
}

export default async function PlacePage({ params }: Props) {
  const { id } = await params
  const viewerId = await getUserId()
  const place = await getPlaceDetail(id, viewerId).catch(() => null)
  if (!place) notFound()

  return <PlaceDetailView place={place} />
}
