'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  Bookmark,
  CalendarDays,
  ChevronLeft,
  Loader2,
  MapPin,
  Navigation,
  Star,
  Trash2,
} from 'lucide-react'
import { api, errorMessage } from '@/lib/client'
import { PLACE_TYPE_META, TINT_HEX } from '@/lib/constants'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { PlaceTypeIcon } from '@/components/place/place-type-icon'
import type { PlaceDetail } from '@/lib/types'

export function PlaceDetailView({ place }: { place: PlaceDetail }) {
  const router = useRouter()
  const { status } = useSession()
  const meta = PLACE_TYPE_META[place.type]
  const tint = TINT_HEX[meta.tint]

  const [saved, setSaved] = useState(place.saved)
  const [savingId, setSavingId] = useState(false)
  const [photoFailed, setPhotoFailed] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const [rating, setRating] = useState(place.myReview?.rating ?? 0)
  const [comment, setComment] = useState(place.myReview?.comment ?? '')
  const [posting, setPosting] = useState(false)

  async function toggleSave() {
    if (status !== 'authenticated') {
      router.push('/sign-in')
      return
    }
    setSavingId(true)
    try {
      await api(`/api/places/${place.id}/save`, { method: saved ? 'DELETE' : 'PUT' })
      setSaved(!saved)
    } catch (error) {
      setNotice(errorMessage(error))
    } finally {
      setSavingId(false)
    }
  }

  async function submitReview(event: React.FormEvent) {
    event.preventDefault()
    if (status !== 'authenticated') {
      router.push('/sign-in')
      return
    }
    if (!rating) {
      setNotice('Pick a rating first.')
      return
    }
    setPosting(true)
    setNotice(null)
    try {
      await api(`/api/places/${place.id}/reviews`, {
        method: 'PUT',
        body: JSON.stringify({ rating, comment }),
      })
      router.refresh()
      setNotice('Review saved.')
    } catch (error) {
      setNotice(errorMessage(error))
    } finally {
      setPosting(false)
    }
  }

  async function remove() {
    if (!confirm('Remove this place from the map?')) return
    try {
      await api(`/api/places/${place.id}`, { method: 'DELETE' })
      router.push('/map')
    } catch (error) {
      setNotice(errorMessage(error))
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl pb-32">
      <div
        className={cn(
          'relative w-full overflow-hidden',
          place.hasPhoto && !photoFailed ? 'h-[38dvh] min-h-[240px]' : 'h-[19dvh] min-h-[132px]',
        )}
      >
        {place.hasPhoto && !photoFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/places/${place.id}/photo`}
            alt={place.name}
            onError={() => setPhotoFailed(true)}
            className="size-full object-cover"
          />
        ) : (
          <div
            className="relative flex size-full items-end justify-center overflow-hidden"
            style={{ background: `linear-gradient(160deg, ${tint}2e, ${tint}0a 65%, transparent)` }}
          >
            <span
              aria-hidden
              className="absolute -top-10 left-1/2 size-40 -translate-x-1/2 rounded-full opacity-25 blur-2xl"
              style={{ backgroundColor: tint }}
            />
            <span
              className="relative mb-8 flex size-14 items-center justify-center rounded-2xl text-white shadow-[0_10px_24px_-10px_rgba(0,0,0,0.5)]"
              style={{ backgroundColor: tint }}
            >
              <PlaceTypeIcon type={place.type} className="size-7" />
            </span>
          </div>
        )}

        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3 pt-[max(env(safe-area-inset-top),0.75rem)]">
          <Link
            href="/map"
            aria-label="Back to map"
            className="glass glass-strong glass-press flex size-10 items-center justify-center rounded-full"
          >
            <ChevronLeft className="size-5" aria-hidden />
          </Link>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={toggleSave}
              disabled={savingId}
              aria-pressed={saved}
              aria-label={saved ? 'Remove from saved' : 'Save place'}
              className={cn(
                'glass glass-strong glass-press flex size-10 items-center justify-center rounded-full',
                saved ? 'text-primary' : 'text-foreground/80',
              )}
            >
              {savingId ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Bookmark className={cn('size-4.5', saved && 'fill-current')} aria-hidden />
              )}
            </button>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`}
              target="_blank"
              rel="noreferrer"
              aria-label="Directions"
              className="glass glass-strong glass-press flex size-10 items-center justify-center rounded-full text-foreground/80"
            >
              <Navigation className="size-4.5" aria-hidden />
            </a>
          </div>
        </div>
      </div>

      <div className="-mt-6 px-3">
        <div className="glass glass-strong animate-rise rounded-[26px] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: tint }}>
            {meta.label}
            {place.area ? <span className="text-muted-foreground"> · {place.area}</span> : null}
          </p>
          <h1 className="mt-0.5 text-[26px] font-semibold leading-tight tracking-[-0.03em]">{place.name}</h1>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-muted-foreground">
            {place.ratingAvg !== null ? (
              <span className="inline-flex items-center gap-1">
                <Star className="size-3.5 fill-amber-400 text-amber-400" aria-hidden />
                <span className="font-semibold text-foreground">{place.ratingAvg.toFixed(1)}</span>
                <span>({place.ratingCount} reviews)</span>
              </span>
            ) : (
              <span>No reviews yet</span>
            )}
            {place.address && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" aria-hidden />
                {place.address}
              </span>
            )}
          </div>

          {place.description && (
            <p className="mt-3 text-[14px] leading-relaxed text-foreground/85">{place.description}</p>
          )}

          {place.amenities.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {place.amenities.map((slug) => (
                <li
                  key={slug}
                  className="rounded-full bg-foreground/[0.06] px-2.5 py-1 text-[11.5px] font-medium capitalize text-foreground/75"
                >
                  {slug.replace(/-/g, ' ')}
                </li>
              ))}
            </ul>
          )}

          {place.canDelete && (
            <button
              type="button"
              onClick={remove}
              className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-destructive"
            >
              <Trash2 className="size-3.5" aria-hidden />
              Remove this place
            </button>
          )}
        </div>

        {notice && (
          <p role="status" className="glass mt-2 rounded-2xl px-3.5 py-2 text-[12.5px]">
            {notice}
          </p>
        )}

        {place.events.length > 0 && (
          <section className="mt-4">
            <h2 className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Happening here
            </h2>
            <ul className="space-y-1.5">
              {place.events.map((event) => (
                <li key={event.id} className="glass flex items-center gap-2.5 rounded-[18px] p-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                    <CalendarDays className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold">{event.title}</p>
                    <p className="text-[11.5px] text-muted-foreground">
                      {formatDateTime(event.startsAt)} · {event.goingCount} going
                    </p>
                  </div>
                  <Link
                    href="/events"
                    className="shrink-0 rounded-full bg-foreground/[0.06] px-3 py-1.5 text-[11.5px] font-semibold"
                  >
                    RSVP
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-4">
          <h2 className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Reviews
          </h2>

          <form onSubmit={submitReview} className="glass rounded-[22px] p-3.5">
            <p className="text-[13px] font-semibold">{place.myReview ? 'Your review' : 'Been here?'}</p>
            <div className="mt-1.5 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  aria-label={`${value} star${value === 1 ? '' : 's'}`}
                  aria-pressed={rating === value}
                  className="p-0.5"
                >
                  <Star
                    className={cn(
                      'size-6 transition-colors',
                      value <= rating ? 'fill-amber-400 text-amber-400' : 'text-foreground/25',
                    )}
                    aria-hidden
                  />
                </button>
              ))}
            </div>
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              rows={2}
              placeholder="What is it like on a Saturday morning?"
              aria-label="Your review"
              className="mt-2 w-full resize-none rounded-2xl bg-foreground/[0.06] px-3.5 py-2.5 text-[13.5px] outline-none focus:ring-2 focus:ring-primary/40"
            />
            <button
              type="submit"
              disabled={posting}
              className="glass-press mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-[13.5px] font-semibold text-primary-foreground disabled:opacity-60"
            >
              {posting && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {place.myReview ? 'Update review' : 'Post review'}
            </button>
          </form>

          {place.reviews.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {place.reviews.map((review) => (
                <li key={review.id} className="glass rounded-[18px] p-3">
                  <div className="flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
                      {review.author.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="text-[12.5px] font-semibold">{review.author.name}</span>
                    <span className="ml-auto flex items-center gap-0.5">
                      {Array.from({ length: review.rating }).map((_, index) => (
                        <Star key={index} className="size-3 fill-amber-400 text-amber-400" aria-hidden />
                      ))}
                    </span>
                  </div>
                  {review.comment && (
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-foreground/80">{review.comment}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {place.nearby.length > 0 && (
          <section className="mt-4">
            <h2 className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Nearby
            </h2>
            <ul className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
              {place.nearby.map((nearby) => (
                <li key={nearby.id} className="shrink-0">
                  <Link
                    href={`/places/${nearby.id}`}
                    className="glass glass-press flex w-[180px] items-center gap-2 rounded-2xl p-2"
                  >
                    <span
                      className="flex size-8 shrink-0 items-center justify-center rounded-xl text-white"
                      style={{ backgroundColor: TINT_HEX[PLACE_TYPE_META[nearby.type].tint] }}
                    >
                      <PlaceTypeIcon type={nearby.type} className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[12.5px] font-semibold">{nearby.name}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {nearby.distanceKm !== undefined ? `${nearby.distanceKm} km` : nearby.area}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}
