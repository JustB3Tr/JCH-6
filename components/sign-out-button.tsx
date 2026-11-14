'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { signOut } from 'next-auth/react'

export function SignOutButton() {
  const router = useRouter()
  return (
    <button
      type="button"
      aria-label="Sign out"
      onClick={async () => {
        await signOut({ redirect: false })
        router.push('/sign-in')
        router.refresh()
      }}
      className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
    >
      <LogOut className="size-4" aria-hidden />
    </button>
  )
}
