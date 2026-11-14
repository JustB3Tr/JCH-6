'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function JoinCommunityButton({ communityId, joined }: { communityId: string; joined: boolean }) {
  const { status } = useSession()
  const router = useRouter()
  const [isJoined, setIsJoined] = useState(joined)
  const [pending, setPending] = useState(false)

  if (status === 'unauthenticated') {
    return (
      <Link href="/sign-in" className="text-sm font-medium text-primary hover:underline">
        Sign in to join
      </Link>
    )
  }

  async function toggle() {
    setPending(true)
    try {
      const res = await fetch(`/api/communities/${communityId}/membership`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ join: !isJoined }),
      })
      if (res.ok) {
        setIsJoined(!isJoined)
        router.refresh()
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <Button onClick={toggle} disabled={pending} variant={isJoined ? 'outline' : 'default'}>
      {isJoined ? 'Leave community' : 'Join community'}
    </Button>
  )
}
