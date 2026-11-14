'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

const options = [
  { value: 'going', label: 'Going' },
  { value: 'maybe', label: 'Maybe' },
  { value: 'cant', label: "Can't go" },
] as const

export function RsvpButtons({
  eventId,
  myRsvp,
  onChanged,
}: {
  eventId: string
  myRsvp: string | null
  onChanged?: () => void
}) {
  const { status } = useSession()
  const router = useRouter()
  const [current, setCurrent] = useState(myRsvp)
  const [pending, setPending] = useState<string | null>(null)

  if (status === 'unauthenticated') {
    return (
      <Link href="/sign-in" className="text-sm font-medium text-primary hover:underline">
        Sign in to RSVP
      </Link>
    )
  }

  async function setRsvp(value: string) {
    setPending(value)
    try {
      const res = await fetch(`/api/events/${eventId}/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: value }),
      })
      if (res.ok) {
        const data = (await res.json()) as { myRsvp: string | null }
        setCurrent(data.myRsvp)
        onChanged?.()
        router.refresh()
      }
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="flex gap-1.5" role="group" aria-label="RSVP">
      {options.map((o) => (
        <Button
          key={o.value}
          type="button"
          size="sm"
          variant={current === o.value ? 'default' : 'outline'}
          disabled={pending !== null}
          onClick={() => setRsvp(o.value)}
        >
          {o.label}
        </Button>
      ))}
    </div>
  )
}
