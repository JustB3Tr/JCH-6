'use client'

import Link from 'next/link'
import { Bookmark, CalendarDays, ChevronRight, Loader2, Navigation, Star, X } from 'lucide-react'
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
      className="glass glass-strong animate-sheet-in pointer-events-auto fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[420px] rounded-t-[28px] px-4 pb-[calc(env(safe-area-inset-bottom)+6rem)] pt-2.5 sm:bottom-[6.5rem] sm:rounded-[28px] sm:pb-4"
    >
      <div className="mx-auto mb-3 h-[5px] w-9 rounded-full bg-foreground/20" aria-hidden />

      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="glass-press absolute right-3.5 top-4 flex size-7 items-center justify-center rounded-full bg-foreground/[0.07] text-muted-foreground"
      >
        <X className="size-3.5" aria-hidden />
      </button>

      <div className="pr-8">
        <p className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
          <PlaceTypeIcon type={place.type} className="size-3.5" style={{ color: tint }} />
          {meta.label}
          {place.area ? ` · ${place.area}` : ''}
        </p>
        <h2 className="mt-0.5 text-[24px] font-semibold leading-tight tracking-[-0.03em]">{place.name}</h2>
        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] text-muted-foreground">
          {place.ratingAvg !== null ? (
            <span className="inline-flex items-center gap-1">
              <span className="font-medium text-foreground">{place.ratingAvg.toFixed(1)}</span>
              <Star className="size-3.5 fill-amber-400 text-amber-400" aria-hidden />
              <span>({place.ratingCount})</span>
            </span>
          ) : (
            <span>No reviews yet</span>
          )}
          {place.distanceKm !== undefined && <span>· {place.distanceKm} km</span>}
          {place.upcomingEvents > 0 && (
            <span className="inline-flex items-center gap-1 text-primary">
              <CalendarDays className="size-3.5" aria-hidden />
              {place.upcomingEvents} upcoming
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-start gap-5">
        <a
          href={directions}
          target="_blank"
          rel="noreferrer"
          className="glass-press group flex w-16 flex-col items-center gap-1.5"
        >
          <span className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_6px_16px_-6px_var(--primary)]">
            <Navigation className="size-5" aria-hidden />
          </span>
          <span className="text-[11px] font-medium text-primary">Directions</span>
        </a>

        <button
          type="button"
          onClick={() => onToggleSave(place)}
          disabled={saving}
          aria-pressed={place.saved}
          className="glass-press flex w-16 flex-col items-center gap-1.5"
        >
          <span
            className={cn(
              'flex size-11 items-center justify-center rounded-full',
              place.saved ? 'bg-primary/15 text-primary' : 'bg-foreground/[0.07] text-foreground/80',
            )}
          >
            {saving ? (
              <Loader2 className="size-5 animate-spin" aria-hidden />
            ) : (
              <Bookmark className={cn('size-5', place.saved && 'fill-current')} aria-hidden />
            )}
          </span>
          <span className={cn('text-[11px] font-medium', place.saved ? 'text-primary' : 'text-foreground/70')}>
            {place.saved ? 'Saved' : 'Save'}
          </span>
        </button>

        <Link href={`/places/${place.id}`} className="glass-press flex w-16 flex-col items-center gap-1.5">
          <span className="flex size-11 items-center justify-center rounded-full bg-foreground/[0.07] text-foreground/80">
            <ChevronRight className="size-5" aria-hidden />
          </span>
          <span className="text-[11px] font-medium text-foreground/70">Details</span>
        </Link>
      </div>

      {place.blurb && <p className="mt-4 line-clamp-2 text-[13.5px] leading-relaxed text-muted-foreground">{place.blurb}</p>}

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
    </section>
  )
}
