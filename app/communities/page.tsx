import type { Metadata } from 'next'
import { CommunitiesView } from '@/components/communities/communities-view'
import { pageTitle } from '@/lib/brand'

export const metadata: Metadata = {
  title: pageTitle('Groups'),
  description: 'Find or start a group of people who meet up around the things you already love doing.',
}

export default function CommunitiesPage() {
  return <CommunitiesView />
}
