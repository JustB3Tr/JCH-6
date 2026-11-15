import type { Metadata } from 'next'
import { pageTitle } from '@/lib/brand'
import { AuthForm } from '@/components/auth/auth-form'

export const metadata: Metadata = { title: pageTitle('Sign in') }

export default function SignInPage() {
  return <AuthForm />
}
