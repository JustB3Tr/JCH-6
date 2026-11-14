'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Star } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

export function FeedbackForm({ placeId }: { placeId: string }) {
  const router = useRouter()
  const { status } = useSession()
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!rating) {
      setError('Pick a star rating first.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/places/${placeId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment: comment.trim() }),
      })
      if (!res.ok) throw new Error('Could not save feedback.')
      setComment('')
      setRating(0)
      setDone(true)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  if (status === 'unauthenticated') {
    return <p className="text-sm text-muted-foreground">Sign in to leave feedback for this place.</p>
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-2xl border border-border p-3">
      <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
        {Array.from({ length: 5 }).map((_, i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={rating === i + 1}
            aria-label={`${i + 1} star${i ? 's' : ''}`}
            onClick={() => setRating(i + 1)}
            className="rounded p-0.5"
          >
            <Star className={`size-5 ${i < rating ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground/50'}`} aria-hidden />
          </button>
        ))}
      </div>
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        placeholder="How was it? (optional)"
        aria-label="Feedback comment"
      />
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {done && <p className="text-sm text-primary">Thanks for the feedback!</p>}
      <Button type="submit" size="sm" disabled={saving} className="self-start">
        {saving ? 'Saving...' : 'Post feedback'}
      </Button>
    </form>
  )
}
