import type { Metadata } from 'next'
import { CommunitiesView } from '@/components/communities/communities-view'

export const metadata: Metadata = {
  title: 'Groups — Hangout',
  description: 'Find or start a group of people who meet up around the things you already love doing.',
}

export default function CommunitiesPage() {
  return <CommunitiesView />
}
