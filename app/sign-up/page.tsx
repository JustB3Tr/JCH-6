import type { Metadata } from 'next'
import { pageTitle } from '@/lib/brand'
import { OnboardingFlow } from '@/components/auth/onboarding-flow'

export const metadata: Metadata = { title: pageTitle('Get started') }

export default function SignUpPage() {
  return <OnboardingFlow />
}
