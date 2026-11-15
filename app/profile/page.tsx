import type { Metadata } from 'next'
import { ProfileView } from '@/components/profile/profile-view'
import { pageTitle } from '@/lib/brand'

export const metadata: Metadata = {
  title: pageTitle('You'),
  description: 'Your saved places, plans, groups and privacy settings.',
}

export default function ProfilePage() {
  return <ProfileView />
}
