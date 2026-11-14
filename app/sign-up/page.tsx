import { redirect } from 'next/navigation'
import { MapPin } from 'lucide-react'
import { auth } from '@/lib/auth'
import { AuthForm } from '@/components/auth-form'

export default async function SignUpPage() {
  const session = await auth()
  if (session?.user) redirect('/')

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col justify-center gap-6 px-4 py-16">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <MapPin className="size-6" aria-hidden />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">Join your neighborhood</h1>
        <p className="text-sm text-muted-foreground">Discover hangout spots, events and communities near you.</p>
      </div>
      <AuthForm mode="sign-up" />
    </div>
  )
}
