'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Check, Loader2, Users } from 'lucide-react'
import { api, errorMessage } from '@/lib/client'
import { cn } from '@/lib/utils'

export function JoinButton({
  communityId,
  joined,
  className,
}: {
  communityId: string
  joined: boolean
  className?: string
}) {
  const router = useRouter()
  const { status } = useSession()
  const [isJoined, setIsJoined] = useState(joined)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function toggle() {
    if (status !== 'authenticated') {
      router.push('/sign-in')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await api(`/api/communities/${communityId}/membership`, { method: isJoined ? 'DELETE' : 'PUT' })
      setIsJoined(!isJoined)
      router.refresh()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className={cn(
          'glass-press flex h-10 w-full items-center justify-center gap-1.5 rounded-full text-[13px] font-semibold transition-colors',
          isJoined ? 'bg-foreground/[0.06] text-foreground/70' : 'bg-primary text-primary-foreground',
        )}
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : isJoined ? (
          <Check className="size-4" aria-hidden />
        ) : (
          <Users className="size-4" aria-hidden />
        )}
        {isJoined ? 'Joined' : 'Join group'}
      </button>
      {error && (
        <p role="alert" className="mt-1.5 text-[12px] text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
