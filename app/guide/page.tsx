import type { Metadata } from 'next'
import { GuideChat } from '@/components/ai/guide-chat'

export const metadata: Metadata = {
  title: 'Guide — Hangout',
  description:
    'An AI guide that knows the map, the calendar and the city: find a spot, plan a meetup, or ask how LA works.',
}

export default function GuidePage() {
  return <GuideChat />
}
