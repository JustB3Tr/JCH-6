import type { Metadata } from 'next'
import { ProfileView } from '@/components/profile/profile-view'

export const metadata: Metadata = {
  title: 'You — Hangout',
  description: 'Your saved places, plans, groups and privacy settings.',
}

export default function ProfilePage() {
  return <ProfileView />
}
