import Link from 'next/link'
import { MapPin } from 'lucide-react'
import { PLACE_TYPE_META, type PlaceType } from '@/lib/constants'
import { formatDateTime } from '@/lib/format'
import type { EventSummary } from '@/lib/types'

const IMAGE_FOR_TYPE: Partial<Record<PlaceType, string>> = {
  trail: '/images/gather-walk.png',
  viewpoint: '/images/gather-walk.png',
  beach: '/images/gather-beach.png',
  sports: '/images/gather-games.png',
}

function imageFor(event: EventSummary) {
  return (event.place && IMAGE_FOR_TYPE[event.place.type]) ?? '/images/gather-picnic.png'
}

export function WeekendGatherings({ events }: { events: EventSummary[] }) {
  return (
    <section id="gatherings" className="mx-auto w-full max-w-7xl scroll-mt-20 px-4 py-12 sm:px-6 lg:px-12">
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-primary">Wholesome local gatherings</p>
          <h2 className="font-heading text-3xl font-bold text-foreground">Friendly meetups coming up</h2>
        </div>
        <Link
          href="/events"
          className="self-start rounded-xl border border-input bg-muted px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary md:self-auto"
        >
          See all gatherings →
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-input bg-surface px-6 py-12 text-center">
          <p className="font-heading text-lg font-semibold">Nothing on the calendar yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Be the first to host a walk, picnic, or pickup game.</p>
          <Link
            href="/events"
            className="mt-4 inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover"
          >
            Host a gathering
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {events.map((event) => (
            <li
              key={event.id}
              className="flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
            >
              <div>
                <div className="relative h-44 w-full overflow-hidden">
                  <img src={imageFor(event)} alt="" className="size-full object-cover" loading="lazy" />
                  {event.place && (
                    <span className="absolute left-3 top-3 rounded-full bg-card/95 px-2.5 py-1 text-xs font-bold text-primary shadow-sm">
                      {PLACE_TYPE_META[event.place.type].label}
                    </span>
                  )}
                  <span className="absolute right-3 top-3 rounded-full bg-card/95 px-2.5 py-1 text-xs font-bold text-foreground shadow-sm">
                    {formatDateTime(event.startsAt)}
                  </span>
                </div>
                <div className="p-5">
                  <h3 className="font-heading text-lg font-bold leading-snug text-foreground">{event.title}</h3>
                  {event.description && (
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{event.description}</p>
                  )}
                  <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="size-4 shrink-0 text-primary" aria-hidden />
                    <span className="truncate">
                      {event.place?.name ?? 'Location shared on RSVP'} · {event.goingCount} going
                    </span>
                  </p>
                </div>
              </div>
              <div className="px-5 pb-5">
                <Link
                  href="/events"
                  className="block w-full rounded-xl bg-primary py-2.5 text-center text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-hover"
                >
                  Join this gathering (free)
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
