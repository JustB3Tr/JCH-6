'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { CalendarDays, Check, Loader2, MapPin, Plus, Users, X } from 'lucide-react'
import { format, isToday, isTomorrow } from 'date-fns'
import { api, errorMessage, useApi } from '@/lib/client'
import { RSVP_LABELS, RSVP_STATUSES, type RsvpStatus } from '@/lib/constants'
import { formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { EmptyState, GlassCard, PageShell } from '@/components/shell/page-shell'
import type { CommunitySummary, EventSummary, PlaceSummary } from '@/lib/types'

function dayLabel(iso: string) {
  const date = new Date(iso)
  if (isToday(date)) return 'Today'
  if (isTomorrow(date)) return 'Tomorrow'
  return format(date, 'EEEE, MMM d')
}

export function EventsView() {
  const { status } = useSession()
  const [scope, setScope] = useState<'upcoming' | 'mine'>('upcoming')
  const [creating, setCreating] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const path = scope === 'mine' ? '/api/events?mine=1&limit=100' : '/api/events?limit=100'
  const { data, isLoading, mutate } = useApi<{ events: EventSummary[] }>(path)
  const events = data?.events ?? []

  const groups = useMemo(() => {
    const map = new Map<string, EventSummary[]>()
    for (const event of events) {
      const key = format(new Date(event.startsAt), 'yyyy-MM-dd')
      map.set(key, [...(map.get(key) ?? []), event])
    }
    return [...map.entries()]
  }, [events])

  async function setRsvp(event: EventSummary, next: RsvpStatus | null) {
    if (status !== 'authenticated') {
      setNotice('Sign in to RSVP.')
      return
    }
    setBusyId(event.id)
    try {
      await api(`/api/events/${event.id}/rsvp`, {
        method: 'PUT',
        body: JSON.stringify({ status: next }),
      })
      await mutate()
    } catch (error) {
      setNotice(errorMessage(error))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <PageShell
      title="Events"
      subtitle="Meetups across LA County"
      action={
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="glass-press flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground"
          aria-label="Create an event"
        >
          <Plus className="size-4.5" aria-hidden />
        </button>
      }
    >
      <div className="glass mb-3 flex rounded-full p-1">
        {(['upcoming', 'mine'] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setScope(value)}
            aria-pressed={scope === value}
            className={cn(
              'flex-1 rounded-full py-1.5 text-[13px] font-semibold transition-colors',
              scope === value ? 'bg-primary text-primary-foreground' : 'text-foreground/70',
            )}
          >
            {value === 'upcoming' ? 'Upcoming' : 'My plans'}
          </button>
        ))}
      </div>

      {notice && (
        <p role="status" className="glass mb-3 rounded-2xl px-3.5 py-2 text-[12.5px]">
          {notice}
        </p>
      )}

      {isLoading && (
        <p className="flex items-center justify-center gap-2 py-10 text-[13px] text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Loading events…
        </p>
      )}

      {!isLoading && events.length === 0 && (
        <EmptyState
          title={scope === 'mine' ? 'No plans yet' : 'Nothing on the calendar'}
          body={
            scope === 'mine'
              ? 'RSVP to a meetup and it will show up here, with the place and who is going.'
              : 'Be the first to post something. A coffee walk or a park picnic is enough to start.'
          }
          action={
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="rounded-full bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground"
            >
              Create an event
            </button>
          }
        />
      )}

      <div className="space-y-5">
        {groups.map(([key, dayEvents]) => (
          <section key={key}>
            <h2 className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {dayLabel(dayEvents[0].startsAt)}
            </h2>
            <ul className="space-y-2">
              {dayEvents.map((event) => (
                <GlassCard as="li" key={event.id} className="animate-rise">
                  <div className="flex items-start gap-3">
                    <div className="w-14 shrink-0 pt-0.5 text-center">
                      <p className="text-[13px] font-semibold tabular-nums">{formatTime(event.startsAt)}</p>
                      <p className="text-[10.5px] uppercase tracking-wide text-muted-foreground">
                        {format(new Date(event.startsAt), 'MMM d')}
                      </p>
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="text-[15.5px] font-semibold leading-snug tracking-[-0.01em]">{event.title}</h3>

                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
                        {event.place && (
                          <Link
                            href={`/places/${event.place.id}`}
                            className="inline-flex items-center gap-1 hover:text-foreground"
                          >
                            <MapPin className="size-3.5" aria-hidden />
                            {event.place.name}
                          </Link>
                        )}
                        {event.community && (
                          <Link
                            href={`/communities/${event.community.slug}`}
                            className="inline-flex items-center gap-1 hover:text-foreground"
                          >
                            <Users className="size-3.5" aria-hidden />
                            {event.community.name}
                          </Link>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="size-3.5" aria-hidden />
                          {event.goingCount} going
                        </span>
                      </div>

                      {event.description && (
                        <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-muted-foreground">
                          {event.description}
                        </p>
                      )}

                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        {RSVP_STATUSES.map((value) => {
                          const active = event.myRsvp === value
                          return (
                            <button
                              key={value}
                              type="button"
                              onClick={() => setRsvp(event, active ? null : value)}
                              disabled={busyId === event.id}
                              aria-pressed={active}
                              className={cn(
                                'glass-press flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-semibold transition-colors',
                                active
                                  ? value === 'going'
                                    ? 'bg-emerald-500 text-white'
                                    : value === 'maybe'
                                      ? 'bg-amber-500 text-white'
                                      : 'bg-foreground/70 text-background'
                                  : 'bg-foreground/[0.06] text-foreground/70',
                              )}
                            >
                              {active && <Check className="size-3" aria-hidden />}
                              {RSVP_LABELS[value]}
                            </button>
                          )
                        })}
                        {event.isHost && (
                          <span className="rounded-full bg-primary/12 px-2.5 py-1 text-[11.5px] font-semibold text-primary">
                            Hosting
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {creating && (
        <CreateEventSheet
          onClose={() => setCreating(false)}
          onCreated={async () => {
            setCreating(false)
            setScope('upcoming')
            await mutate()
          }}
        />
      )}
    </PageShell>
  )
}

function CreateEventSheet({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startsAt, setStartsAt] = useState(() => {
    const date = new Date(Date.now() + 24 * 60 * 60 * 1000)
    date.setMinutes(0, 0, 0)
    return format(date, "yyyy-MM-dd'T'HH:mm")
  })
  const [placeId, setPlaceId] = useState('')
  const [communityId, setCommunityId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: placesData } = useApi<{ places: PlaceSummary[] }>('/api/places?limit=500')
  const { data: communitiesData } = useApi<{ communities: CommunitySummary[] }>('/api/communities')

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await api('/api/events', {
        method: 'POST',
        body: JSON.stringify({
          title,
          description,
          startsAt: new Date(startsAt).toISOString(),
          placeId: placeId || null,
          communityId: communityId || null,
        }),
      })
      onCreated()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/25 backdrop-blur-[2px]" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(event) => event.stopPropagation()}
        className="glass glass-strong animate-sheet-in max-h-[88dvh] w-full max-w-[480px] overflow-y-auto rounded-t-[30px] px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 sm:mb-6 sm:rounded-[30px]"
      >
        <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-foreground/20" aria-hidden />
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] font-semibold tracking-tight">New meetup</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-8 items-center justify-center rounded-full bg-foreground/[0.06] text-muted-foreground"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <label htmlFor="event-title" className="mt-3 block text-[12px] font-medium text-muted-foreground">
          What is the plan?
        </label>
        <input
          id="event-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          minLength={2}
          placeholder="Sunset picnic at Barnsdall"
          className="mt-1 h-11 w-full rounded-2xl bg-foreground/[0.06] px-3.5 text-[15px] outline-none focus:ring-2 focus:ring-primary/40"
        />

        <label htmlFor="event-when" className="mt-3 block text-[12px] font-medium text-muted-foreground">
          When
        </label>
        <input
          id="event-when"
          type="datetime-local"
          value={startsAt}
          onChange={(event) => setStartsAt(event.target.value)}
          required
          className="mt-1 h-11 w-full rounded-2xl bg-foreground/[0.06] px-3.5 text-[15px] outline-none focus:ring-2 focus:ring-primary/40"
        />

        <label htmlFor="event-place" className="mt-3 block text-[12px] font-medium text-muted-foreground">
          Where
        </label>
        <select
          id="event-place"
          value={placeId}
          onChange={(event) => setPlaceId(event.target.value)}
          className="mt-1 h-11 w-full rounded-2xl bg-foreground/[0.06] px-3 text-[15px] outline-none focus:ring-2 focus:ring-primary/40"
        >
          <option value="">Pick a spot on the map</option>
          {(placesData?.places ?? []).map((place) => (
            <option key={place.id} value={place.id}>
              {place.name}
              {place.area ? ` — ${place.area}` : ''}
            </option>
          ))}
        </select>

        <label htmlFor="event-group" className="mt-3 block text-[12px] font-medium text-muted-foreground">
          Group (optional)
        </label>
        <select
          id="event-group"
          value={communityId}
          onChange={(event) => setCommunityId(event.target.value)}
          className="mt-1 h-11 w-full rounded-2xl bg-foreground/[0.06] px-3 text-[15px] outline-none focus:ring-2 focus:ring-primary/40"
        >
          <option value="">Open to everyone</option>
          {(communitiesData?.communities ?? []).map((community) => (
            <option key={community.id} value={community.id}>
              {community.name}
            </option>
          ))}
        </select>

        <label htmlFor="event-notes" className="mt-3 block text-[12px] font-medium text-muted-foreground">
          Details
        </label>
        <textarea
          id="event-notes"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          placeholder="How long, how far, what to bring, whether dogs are welcome."
          className="mt-1 w-full resize-none rounded-2xl bg-foreground/[0.06] px-3.5 py-2.5 text-[15px] outline-none focus:ring-2 focus:ring-primary/40"
        />

        {error && (
          <p role="alert" className="mt-2 rounded-xl bg-destructive/10 px-3 py-2 text-[12.5px] text-destructive">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="glass-press mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-[15px] font-semibold text-primary-foreground disabled:opacity-60"
        >
          {saving && <Loader2 className="size-4 animate-spin" aria-hidden />}
          Post meetup
        </button>
      </form>
    </div>
  )
}
