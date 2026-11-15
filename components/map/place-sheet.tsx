'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Bookmark, CalendarDays, Footprints, Loader2, Star, X } from 'lucide-react'
import { PLACE_TYPE_META, TINT_HEX } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { PlaceTypeIcon } from '@/components/place/place-type-icon'
import type { PlaceSummary } from '@/lib/types'

const KM_TO_MI = 0.621371

export function PlaceSheet({
  place,
  onClose,
  onToggleSave,
  saving,
}: {
  place: PlaceSummary
  onClose: () => void
  onToggleSave: (place: PlaceSummary) => void
  saving: boolean
}) {
  const meta = PLACE_TYPE_META[place.type]
  const tint = TINT_HEX[meta.tint]
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`
  const [photoFailed, setPhotoFailed] = useState(false)
  const showPhoto = place.hasPhoto && !photoFailed

  return (
    <section
      key={place.id}
      aria-label={place.name}
      className="glass glass-strong animate-sheet-in pointer-events-auto fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] z-40 mx-auto max-w-[420px] rounded-3xl p-4 md:absolute md:inset-x-auto md:bottom-auto md:left-6 md:top-[8.75rem] md:w-[360px] md:max-w-none"
    >
      <div className="flex items-start gap-3.5 pr-8">
        <div className="size-20 shrink-0 overflow-hidden rounded-2xl" style={{ backgroundColor: `${tint}1f` }}>
          {showPhoto ? (
            <img
              src={`/api/places/${place.id}/photo`}
              alt=""
              className="size-full object-cover"
              onError={() => setPhotoFailed(true)}
            />
          ) : (
            <span className="flex size-full items-center justify-center" style={{ color: tint }}>
              <PlaceTypeIcon type={place.type} className="size-8" />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span className="rounded-full bg-accent px-2 py-0.5 font-bold uppercase tracking-wide text-accent-foreground">
              {meta.label}
            </span>
            {place.distanceKm !== undefined ? (
              <span className="text-tertiary">{(place.distanceKm * KM_TO_MI).toFixed(1)} mi away</span>
            ) : (
              place.area && <span className="truncate text-tertiary">{place.area}</span>
            )}
          </p>
          <h2 className="mt-1 font-heading text-xl font-bold leading-tight text-foreground">{place.name}</h2>
          <p className="mt-0.5 flex items-center gap-1 text-[13px] text-muted-foreground">
            {place.ratingAvg !== null ? (
              <>
                <span className="font-semibold text-foreground">{place.ratingAvg.toFixed(1)}</span>
                <Star className="size-3.5 fill-tertiary text-tertiary" aria-hidden />
                <span>
                  ({place.ratingCount} {place.ratingCount === 1 ? 'neighbor' : 'neighbors'})
                </span>
              </>
            ) : (
              <span>No reviews yet</span>
            )}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="glass-press absolute right-3.5 top-3.5 flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground"
      >
        <X className="size-4" aria-hidden />
      </button>

      {place.blurb && <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">{place.blurb}</p>}

      {(place.amenities.length > 0 || place.upcomingEvents > 0) && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {place.upcomingEvents > 0 && (
            <li className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">
              <CalendarDays className="size-3.5 text-primary" aria-hidden />
              {place.upcomingEvents} upcoming
            </li>
          )}
          {place.amenities.slice(0, 4).map((slug) => (
            <li
              key={slug}
              className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium capitalize text-foreground/80"
            >
              {slug.replace(/-/g, ' ')}
            </li>
          ))}
          {place.amenities.length > 4 && (
            <li className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              +{place.amenities.length - 4}
            </li>
          )}
        </ul>
      )}

      <div className="mt-4 flex items-center gap-2">
        <Link
          href={`/places/${place.id}`}
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          Explore
          <ArrowRight className="size-4" aria-hidden />
        </Link>
        <a
          href={directions}
          target="_blank"
          rel="noreferrer"
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-secondary text-sm font-bold text-secondary-foreground transition-colors hover:bg-[#e9dfcd]"
        >
          <Footprints className="size-4 text-primary" aria-hidden />
          Directions
        </a>
        <button
          type="button"
          onClick={() => onToggleSave(place)}
          disabled={saving}
          aria-pressed={place.saved}
          aria-label={place.saved ? 'Saved' : 'Save place'}
          className={cn(
            'glass-press flex size-11 shrink-0 items-center justify-center rounded-xl border transition-colors',
            place.saved
              ? 'border-primary bg-accent text-accent-foreground'
              : 'border-border bg-card text-foreground/75 hover:text-primary',
          )}
        >
          {saving ? (
            <Loader2 className="size-5 animate-spin" aria-hidden />
          ) : (
            <Bookmark className={cn('size-5', place.saved && 'fill-current')} aria-hidden />
          )}
        </button>
      </div>
    </section>
  )
}
