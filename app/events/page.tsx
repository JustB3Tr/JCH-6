import type { Metadata } from 'next'
import { EventsView } from '@/components/events/events-view'

export const metadata: Metadata = {
  title: 'Events — Hangout',
  description: 'Upcoming meetups, walks, picnics and pickups across Los Angeles County.',
}

export default function EventsPage() {
  return <EventsView />
}
