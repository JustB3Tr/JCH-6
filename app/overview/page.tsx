import Link from 'next/link'
import { ArrowRight, CalendarDays, MapPin, Star, Users } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { MonthCalendar } from '@/components/overview/month-calendar'
import { formatDateTime } from '@/lib/format'

export default async function OverviewPage() {
  const session = await auth()
  const userId = session?.user?.id

  const [amenities, upcomingEvents, myRsvps, placeCounts] = await Promise.all([
    prisma.amenity.findMany({
      orderBy: { label: 'asc' },
      include: { places: { select: { placeId: true } } },
    }),
    prisma.event.findMany({
      where: { startsAt: { gte: new Date() } },
      orderBy: { startsAt: 'asc' },
      take: 6,
      include: {
        place: { select: { name: true } },
        community: { select: { name: true, emoji: true } },
        rsvps: { where: { status: 'going' }, select: { id: true } },
      },
    }),
    userId
      ? prisma.rsvp.findMany({
          where: { userId, status: { in: ['going', 'maybe'] }, event: { startsAt: { gte: new Date() } } },
          include: { event: { select: { title: true, startsAt: true } } },
        })
      : Promise.resolve([]),
    prisma.place.count(),
  ])

  const calendarEvents = [
    ...upcomingEvents.map((e) => ({ date: e.startsAt.toISOString(), title: e.title, mine: false })),
    ...myRsvps.map((r) => ({ date: r.event.startsAt.toISOString(), title: r.event.title, mine: true })),
  ]

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      {/* Featured hero */}
      <section className="overflow-hidden rounded-3xl border border-border bg-card">
        <div className="grid md:grid-cols-2">
          <div className="flex flex-col justify-center gap-3 p-6 md:p-10">
            <p className="text-sm font-medium uppercase tracking-wide text-primary">Get outside, together</p>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              All of LA County is full of places to hang out
            </h1>
            <p className="text-muted-foreground">
              Discover parks, plazas, cafes and trails from Malibu to San Dimas, tagged with the amenities you care
              about — then meet people there. {placeCounts} places and counting.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                <MapPin className="size-4" aria-hidden /> Open the map
              </Link>
              <Link
                href="/events"
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-secondary"
              >
                Browse events <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </div>
          <div className="relative min-h-56">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/hero.png" alt="Illustration of neighbors gathering in a park at golden hour" className="absolute inset-0 h-full w-full object-cover" />
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Amenity checklist */}
        <section aria-labelledby="amenity-checklist" className="rounded-3xl border border-border bg-card p-5">
          <h2 id="amenity-checklist" className="text-lg font-semibold tracking-tight">
            Find a spot with...
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Tap a tag to filter the map.</p>
          <ul className="mt-3 flex flex-col gap-1">
            {amenities.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/?amenity=${a.slug}`}
                  className="flex items-center justify-between rounded-xl px-3 py-2 text-sm hover:bg-secondary"
                >
                  <span className="flex items-center gap-2">
                    <span className="flex size-5 items-center justify-center rounded-md border border-primary/40 text-primary">
                      <Star className="size-3" aria-hidden />
                    </span>
                    {a.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{a.places.length} places</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <div className="flex flex-col gap-6">
          {/* Upcoming events card row */}
          <section aria-labelledby="upcoming-events">
            <div className="flex items-center justify-between">
              <h2 id="upcoming-events" className="text-lg font-semibold tracking-tight">
                Upcoming events
              </h2>
              <Link href="/events" className="text-sm font-medium text-primary hover:underline">
                See all
              </Link>
            </div>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {upcomingEvents.length ? (
                upcomingEvents.map((e) => (
                  <li key={e.id}>
                    <Link
                      href={`/events#${e.id}`}
                      className="flex h-full flex-col rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-secondary"
                    >
                      {e.community && (
                        <span className="mb-2 w-fit rounded-full bg-secondary px-2 py-0.5 text-xs">
                          {e.community.emoji} {e.community.name}
                        </span>
                      )}
                      <span className="font-medium">{e.title}</span>
                      <span className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CalendarDays className="size-3.5 shrink-0" aria-hidden /> {formatDateTime(e.startsAt)}
                      </span>
                      {e.place && (
                        <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="size-3.5 shrink-0" aria-hidden /> {e.place.name}
                        </span>
                      )}
                      <span className="mt-auto pt-2 flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="size-3.5" aria-hidden /> {e.rsvps.length} going
                      </span>
                    </Link>
                  </li>
                ))
              ) : (
                <li className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground sm:col-span-2 xl:col-span-3">
                  No upcoming events yet — host the first one.
                </li>
              )}
            </ul>
          </section>

          {/* Month calendar */}
          <section aria-labelledby="month-calendar">
            <h2 id="month-calendar" className="text-lg font-semibold tracking-tight">
              This month
            </h2>
            <MonthCalendar events={calendarEvents} />
          </section>
        </div>
      </div>
    </div>
  )
}
