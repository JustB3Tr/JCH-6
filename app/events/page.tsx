import type { Metadata } from 'next'
import { EventsView } from '@/components/events/events-view'
import { pageTitle } from '@/lib/brand'

export const metadata: Metadata = {
  title: pageTitle('Events'),
  description: 'Upcoming meetups, walks, picnics and pickups across Los Angeles County.',
}

export default function EventsPage() {
  return <EventsView />
}
