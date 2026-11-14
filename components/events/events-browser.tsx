'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { CalendarDays, Loader2, MapPin, Plus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CreateEventDialog } from '@/components/events/create-event-dialog'
import { RsvpButtons } from '@/components/events/rsvp-buttons'
import { formatDateTime } from '@/lib/format'
import type { EventLite } from '@/lib/types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function EventsBrowser({ amenityCount }: { amenityCount: number }) {
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')
  const { data, isLoading, mutate } = useSWR<{ events: EventLite[] }>(`/api/events?when=${tab}`, fetcher, {
    keepPreviousData: true,
  })
  const events = data?.events ?? []

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
          <p className="text-sm text-muted-foreground">Meetups at hangout spots around town.</p>
        </div>
        <CreateEventDialog onCreated={() => mutate()} />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'upcoming' | 'past')} className="mt-4">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading && !data ? (
        <div className="mt-10 flex justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
        </div>
      ) : events.length ? (
        <ul className="mt-4 flex flex-col gap-3">
          {events.map((e) => (
            <li key={e.id} id={e.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {e.communityEmoji && e.communityName && (
                      <span className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5">
                        {e.communityEmoji} {e.communityName}
                      </span>
                    )}
                    <span>Hosted by {e.hostName}</span>
                  </div>
                  <h2 className="mt-1 font-semibold">{e.title}</h2>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <CalendarDays className="size-4 shrink-0" aria-hidden /> {formatDateTime(e.startsAt)}
                  </p>
                  {e.placeName && (
                    <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="size-4 shrink-0" aria-hidden /> {e.placeName}
                    </p>
                  )}
                  {e.description && <p className="mt-2 text-sm text-muted-foreground">{e.description}</p>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="size-4" aria-hidden /> {e.goingCount} going
                  </span>
                  <RsvpButtons eventId={e.id} myRsvp={e.myRsvp} onChanged={() => mutate()} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-10 flex flex-col items-center gap-2 rounded-3xl border border-dashed border-border py-12 text-center">
          <CalendarDays className="size-8 text-muted-foreground" aria-hidden />
          <p className="font-medium">No {tab} events</p>
          <p className="text-sm text-muted-foreground">
            {tab === 'upcoming' ? 'Host the first one — pick a place and a time.' : 'Past events will show up here.'}
          </p>
        </div>
      )}
      {/* amenityCount is surfaced for future filter chips on this page */}
      <span className="sr-only">{amenityCount} amenities available for tagging</span>
    </div>
  )
}
