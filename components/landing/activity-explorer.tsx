import Link from 'next/link'
import { BadgeCheck, Map, MapPin, Star, Users } from 'lucide-react'
import { PLACE_TYPE_META, TINT_HEX, type PlaceType } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { PlaceTypeIcon } from '@/components/place/place-type-icon'
import type { Meta, PlaceSummary } from '@/lib/types'

const TAGLINES: Record<PlaceType, { line: string; badge: string }> = {
  park: { line: 'Shade trees, open lawns & easy loops', badge: 'All ages & strollers' },
  beach: { line: 'Sea breeze, sand & boardwalk strolls', badge: 'Sunset friendly' },
  trail: { line: 'Hillside paths at your own pace', badge: 'Go at your pace' },
  garden: { line: 'Quiet blooms & shaded benches', badge: 'Zero pressure' },
  viewpoint: { line: 'Big skies & golden-hour overlooks', badge: 'Bring a camera' },
  plaza: { line: 'Open-air squares to meet up', badge: 'Easy to find' },
  market: { line: 'Farmers markets & weekend stalls', badge: 'Weekends' },
  cafe: { line: 'Patio coffee & easy conversation', badge: 'Cozy' },
  library: { line: 'Reading rooms & free programs', badge: 'Free programs' },
  museum: { line: 'Free days & courtyard gardens', badge: 'Rainy-day pick' },
  sports: { line: 'Courts & fields, beginners welcome', badge: 'Drop-in friendly' },
  other: { line: 'Hidden gems shared by neighbors', badge: 'Local secrets' },
}

const FALLBACK_PHOTO = '/images/gather-picnic.png'

export function ActivityExplorer({ meta, featured }: { meta: Meta; featured: PlaceSummary | null }) {
  const types = [...meta.types].sort((a, b) => b.count - a.count).slice(0, 8)
  const amenityLabel = new globalThis.Map(meta.amenities.map((amenity) => [amenity.slug, amenity.label]))

  return (
    <section id="explore" className="mx-auto w-full max-w-7xl scroll-mt-20 px-4 pb-16 sm:px-6 lg:px-12">
      <div className="rounded-3xl border border-border bg-surface p-5 shadow-md sm:p-8">
        <div className="mb-8 flex flex-col justify-between gap-4 border-b border-border pb-6 md:flex-row md:items-center">
          <div>
            <p className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[#c4a66a]/30 bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground">
              <MapPin className="size-4 text-primary" aria-hidden />
              <span>Explore your neighborhood</span>
            </p>
            <h2 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">
              Pick an activity, meet kind neighbors
            </h2>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">
              Everything is free, close by, and beginner-welcoming. Pick a kind of place to see it on the map.
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl border border-input bg-card px-3.5 py-2 text-xs font-bold text-foreground shadow-sm md:self-center">
            <Map className="size-4 text-[#c4a66a]" aria-hidden />
            <span>{meta.totals.places.toLocaleString()} spots across LA County</span>
          </span>
        </div>

        <ul
          className={cn(
            'mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2',
            types.length % 4 === 0 || types.length > 6 ? 'lg:grid-cols-4' : 'lg:grid-cols-3',
          )}
        >
          {types.map(({ type, count }) => {
            const info = PLACE_TYPE_META[type]
            const copy = TAGLINES[type]
            const tint = TINT_HEX[info.tint]
            return (
              <li key={type}>
                <Link
                  href={`/map?type=${type}`}
                  className="group flex h-full flex-col justify-between rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary hover:bg-background"
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <span
                      className="flex size-10 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${tint}1f`, color: tint }}
                    >
                      <PlaceTypeIcon type={type} className="size-[22px]" />
                    </span>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-bold text-secondary-foreground">
                      {copy.badge}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-heading text-base font-bold text-foreground transition-colors group-hover:text-primary">
                      {info.plural}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{copy.line}</p>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs">
                    <span className="font-bold text-primary">
                      {count.toLocaleString()} {count === 1 ? 'spot' : 'spots'}
                    </span>
                    <span className="text-muted-foreground transition-colors group-hover:text-primary">
                      Show on map →
                    </span>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>

        {featured && (
          <article className="grid grid-cols-1 items-center gap-6 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-8">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted shadow-md">
              <img
                src={featured.hasPhoto ? `/api/places/${featured.id}/photo` : FALLBACK_PHOTO}
                alt={`${featured.name}${featured.area ? `, ${featured.area}` : ''}`}
                className="size-full object-cover"
                loading="lazy"
              />
              <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground shadow-sm">
                <Star className="size-3.5" aria-hidden />
                Featured gathering spot
              </span>
              <span className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2 rounded-xl bg-card/95 px-3 py-2 text-xs shadow-sm">
                <span className="flex min-w-0 items-center gap-1.5 font-semibold text-foreground">
                  <MapPin className="size-3.5 shrink-0 text-primary" aria-hidden />
                  <span className="truncate">
                    {featured.name}
                    {featured.area ? ` · ${featured.area}` : ''}
                  </span>
                </span>
                {featured.ratingAvg !== null && (
                  <span className="shrink-0 font-bold text-primary">{featured.ratingAvg.toFixed(1)} ★</span>
                )}
              </span>
            </div>

            <div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground">
                  <Users className="size-3.5 text-primary" aria-hidden />
                  {featured.upcomingEvents > 0
                    ? `${featured.upcomingEvents} upcoming ${featured.upcomingEvents === 1 ? 'gathering' : 'gatherings'}`
                    : 'Great for a first meetup'}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-primary">
                  <BadgeCheck className="size-4" aria-hidden />
                  Neighbor-rated
                </span>
              </div>
              <h3 className="font-heading text-2xl font-bold text-foreground">{featured.name}</h3>
              {featured.blurb && (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{featured.blurb}</p>
              )}

              {featured.amenities.length > 0 && (
                <>
                  <p className="mb-3 mt-6 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Park amenities &amp; comforts
                  </p>
                  <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {featured.amenities.slice(0, 6).map((slug) => (
                      <li
                        key={slug}
                        className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2 text-xs font-semibold text-foreground"
                      >
                        <BadgeCheck className="size-4 shrink-0 text-primary" aria-hidden />
                        <span className="truncate">{amenityLabel.get(slug) ?? slug.replace(/-/g, ' ')}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={`/places/${featured.id}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover"
                >
                  <Users className="size-4" aria-hidden />
                  See who&apos;s going
                </Link>
                <Link
                  href={`/map?q=${encodeURIComponent(featured.name)}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#c4a66a]/50 bg-secondary px-5 py-3 text-sm font-bold text-secondary-foreground transition-colors hover:bg-[#e9dfcd]"
                >
                  <Map className="size-4" aria-hidden />
                  View on map
                </Link>
              </div>
            </div>
          </article>
        )}
      </div>
    </section>
  )
}
