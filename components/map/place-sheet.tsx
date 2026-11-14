'use client'

import Link from 'next/link'
import { Bookmark, CalendarDays, ChevronRight, Navigation, Star, X } from 'lucide-react'
import { PLACE_TYPE_META, TINT_HEX } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { PlaceTypeIcon } from '@/components/place/place-type-icon'
import type { PlaceSummary } from '@/lib/types'

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

  return (
    <section
      aria-label={place.name}
      className="glass glass-strong animate-sheet-in pointer-events-auto fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[460px] rounded-t-[30px] px-4 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] pt-2.5 sm:bottom-24 sm:rounded-[30px] sm:pb-4"
    >
      <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-foreground/20" aria-hidden />

      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm"
          style={{ backgroundColor: tint }}
        >
          <PlaceTypeIcon type={place.type} className="size-5" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: tint }}>
            {meta.label}
            {place.area ? <span className="text-muted-foreground"> · {place.area}</span> : null}
          </p>
          <h2 className="truncate text-[21px] font-semibold leading-tight tracking-[-0.02em]">{place.name}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
            {place.ratingAvg !== null ? (
              <span className="inline-flex items-center gap-1">
                <Star className="size-3.5 fill-amber-400 text-amber-400" aria-hidden />
                <span className="font-medium text-foreground">{place.ratingAvg.toFixed(1)}</span>
                <span>({place.ratingCount})</span>
              </span>
            ) : (
              <span>No reviews yet</span>
            )}
            {place.distanceKm !== undefined && <span>{place.distanceKm} km away</span>}
            {place.upcomingEvents > 0 && (
              <span className="inline-flex items-center gap-1 text-primary">
                <CalendarDays className="size-3.5" aria-hidden />
                {place.upcomingEvents} upcoming
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="glass glass-press -mr-1 -mt-1 flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>

      {place.blurb && <p className="mt-3 line-clamp-2 text-[13.5px] leading-relaxed text-muted-foreground">{place.blurb}</p>}

      {place.amenities.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {place.amenities.slice(0, 4).map((slug) => (
            <li
              key={slug}
              className="rounded-full bg-foreground/[0.06] px-2.5 py-1 text-[11.5px] font-medium capitalize text-foreground/75"
            >
              {slug.replace(/-/g, ' ')}
            </li>
          ))}
          {place.amenities.length > 4 && (
            <li className="rounded-full bg-foreground/[0.06] px-2.5 py-1 text-[11.5px] font-medium text-muted-foreground">
              +{place.amenities.length - 4}
            </li>
          )}
        </ul>
      )}

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onToggleSave(place)}
          disabled={saving}
          aria-pressed={place.saved}
          className={cn(
            'glass-press flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl text-[13.5px] font-semibold transition-colors',
            place.saved ? 'bg-primary text-primary-foreground' : 'bg-foreground/[0.06] text-foreground',
          )}
        >
          <Bookmark className={cn('size-4', place.saved && 'fill-current')} aria-hidden />
          {place.saved ? 'Saved' : 'Save'}
        </button>

        <a
          href={directions}
          target="_blank"
          rel="noreferrer"
          className="glass-press flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-foreground/[0.06] text-[13.5px] font-semibold"
        >
          <Navigation className="size-4" aria-hidden />
          Directions
        </a>

        <Link
          href={`/places/${place.id}`}
          className="glass-press flex h-11 items-center justify-center gap-1 rounded-2xl bg-primary px-4 text-[13.5px] font-semibold text-primary-foreground"
        >
          Open
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      </div>
    </section>
  )
}
