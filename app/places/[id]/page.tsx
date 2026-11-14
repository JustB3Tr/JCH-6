import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, CalendarDays, MapPin, Star, Trees, Coffee, Landmark, Footprints, Compass } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { Badge } from '@/components/ui/badge'
import { FeedbackForm } from '@/components/place/feedback-form'
import { formatDateTime } from '@/lib/format'

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  park: Trees,
  plaza: Landmark,
  cafe: Coffee,
  trail: Footprints,
  other: Compass,
}

export default async function PlacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const place = await prisma.place.findUnique({
    where: { id },
    include: {
      amenities: { include: { amenity: true } },
      feedbacks: { include: { user: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 20 },
      events: {
        where: { startsAt: { gte: new Date() } },
        orderBy: { startsAt: 'asc' },
        include: { rsvps: { where: { status: 'going' }, select: { id: true } } },
      },
    },
  })
  if (!place) notFound()

  const ratings = place.feedbacks.map((f) => f.rating)
  const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null
  const TypeIcon = typeIcons[place.type] ?? Compass

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <Link href="/" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Back to map
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Main panel */}
        <div className="flex flex-col gap-6">
          <div className="overflow-hidden rounded-3xl border border-border bg-card">
            <div className="flex h-44 items-center justify-center bg-gradient-to-br from-primary/80 via-primary/60 to-accent/60 text-primary-foreground">
              <TypeIcon className="size-16 opacity-90" aria-hidden />
            </div>
            <div className="p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="capitalize">{place.type}</Badge>
                {avgRating != null && (
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Star className="size-4 fill-amber-500 text-amber-500" aria-hidden />
                    {avgRating.toFixed(1)} · {ratings.length} review{ratings.length === 1 ? '' : 's'}
                  </span>
                )}
              </div>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">{place.name}</h1>
              {place.address && (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="size-4 shrink-0" aria-hidden /> {place.address}
                </p>
              )}
              <p className="mt-3 leading-relaxed text-muted-foreground">{place.description}</p>

              <h2 className="mt-5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Amenities</h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {place.amenities.length ? (
                  place.amenities.map((pa) => (
                    <Badge key={pa.amenity.id} variant="outline">
                      {pa.amenity.label}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">No amenities tagged yet.</span>
                )}
              </div>
            </div>
          </div>

          <section aria-labelledby="place-events">
            <h2 id="place-events" className="text-lg font-semibold tracking-tight">
              Upcoming events here
            </h2>
            {place.events.length ? (
              <ul className="mt-3 flex flex-col gap-2">
                {place.events.map((e) => (
                  <li key={e.id}>
                    <Link
                      href={`/events#${e.id}`}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 hover:bg-secondary"
                    >
                      <div>
                        <p className="font-medium">{e.title}</p>
                        <p className="text-sm text-muted-foreground">{formatDateTime(e.startsAt)}</p>
                      </div>
                      <span className="flex shrink-0 items-center gap-1 text-sm text-muted-foreground">
                        <CalendarDays className="size-4" aria-hidden /> {e.rsvps.length} going
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">No upcoming events here yet — host one from the Events page.</p>
            )}
          </section>
        </div>

        {/* Side panel: feedback */}
        <aside className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold tracking-tight">Neighbor feedback</h2>
          <FeedbackForm placeId={place.id} />
          <ul className="flex flex-col gap-3">
            {place.feedbacks.length ? (
              place.feedbacks.map((f) => (
                <li key={f.id} className="rounded-2xl bg-secondary/60 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{f.user.name}</span>
                    <span className="flex" aria-label={`${f.rating} out of 5 stars`}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`size-3.5 ${i < f.rating ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground/40'}`}
                          aria-hidden
                        />
                      ))}
                    </span>
                  </div>
                  {f.comment && <p className="mt-1 text-sm text-muted-foreground">{f.comment}</p>}
                </li>
              ))
            ) : (
              <li className="text-sm text-muted-foreground">Be the first to leave feedback.</li>
            )}
          </ul>
        </aside>
      </div>
    </div>
  )
}
