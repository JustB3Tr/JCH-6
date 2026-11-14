'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { signOut, useSession } from 'next-auth/react'
import { Bookmark, Check, Loader2, LogOut, Lock, MapPin, Pencil, Star, Users } from 'lucide-react'
import { api, errorMessage, useApi } from '@/lib/client'
import { PLACE_TYPE_META, TINT_HEX } from '@/lib/constants'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { EmptyState, GlassCard, PageShell } from '@/components/shell/page-shell'
import { PlaceTypeIcon } from '@/components/place/place-type-icon'
import type { Me, PlaceSummary } from '@/lib/types'

export function ProfileView() {
  const { status } = useSession()
  const { data, isLoading, mutate } = useApi<{ user: Me | null }>(status === 'authenticated' ? '/api/me' : null)
  const { data: savedData } = useApi<{ places: PlaceSummary[] }>(
    status === 'authenticated' ? '/api/places?saved=1&limit=100' : null,
  )

  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [homeArea, setHomeArea] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const user = data?.user ?? null

  useEffect(() => {
    if (!user) return
    setName(user.name)
    setBio(user.bio)
    setHomeArea(user.homeArea ?? '')
  }, [user])

  if (status === 'loading' || (status === 'authenticated' && isLoading)) {
    return (
      <PageShell title="You">
        <p className="flex items-center justify-center gap-2 py-10 text-[13px] text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Loading…
        </p>
      </PageShell>
    )
  }

  if (status !== 'authenticated' || !user) {
    return (
      <PageShell title="You" subtitle="Your spots, plans and privacy">
        <EmptyState
          title="You are browsing as a guest"
          body="Sign in to save places, RSVP to meetups, join groups and keep your own private account."
          action={
            <div className="flex gap-2">
              <Link
                href="/sign-in"
                className="rounded-full bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="rounded-full bg-foreground/[0.06] px-4 py-2 text-[13px] font-semibold"
              >
                Create account
              </Link>
            </div>
          }
        />
      </PageShell>
    )
  }

  async function patch(body: Record<string, unknown>, message: string) {
    setSaving(true)
    setError(null)
    try {
      await api('/api/me', { method: 'PATCH', body: JSON.stringify(body) })
      await mutate()
      setNotice(message)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const saved = savedData?.places ?? []

  return (
    <PageShell
      title="You"
      subtitle={user.isPrivate ? 'Private account' : 'Public account'}
      action={
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: '/' })}
          aria-label="Sign out"
          className="glass-press flex size-9 items-center justify-center rounded-full bg-foreground/[0.06] text-foreground/70"
        >
          <LogOut className="size-4" aria-hidden />
        </button>
      }
    >
      <GlassCard className="animate-rise">
        <div className="flex items-center gap-3">
          <span className="flex size-14 items-center justify-center rounded-full bg-primary/15 text-[20px] font-semibold text-primary">
            {user.name.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[19px] font-semibold tracking-[-0.02em]">{user.name}</h2>
            <p className="truncate text-[12.5px] text-muted-foreground">{user.email}</p>
            <p className="mt-0.5 flex items-center gap-1 text-[12px] text-muted-foreground">
              {user.homeArea ? (
                <>
                  <MapPin className="size-3.5" aria-hidden />
                  {user.homeArea}
                </>
              ) : (
                <>Joined {formatDate(user.createdAt)}</>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditing((value) => !value)}
            aria-label={editing ? 'Close editor' : 'Edit profile'}
            className="glass-press flex size-9 items-center justify-center rounded-full bg-foreground/[0.06] text-foreground/70"
          >
            {editing ? <Check className="size-4" aria-hidden /> : <Pencil className="size-4" aria-hidden />}
          </button>
        </div>

        {user.bio && !editing && (
          <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">{user.bio}</p>
        )}

        {editing && (
          <div className="mt-3 space-y-2">
            <label htmlFor="profile-name" className="block text-[12px] font-medium text-muted-foreground">
              Name
            </label>
            <input
              id="profile-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="h-10 w-full rounded-2xl bg-foreground/[0.06] px-3.5 text-[14px] outline-none focus:ring-2 focus:ring-primary/40"
            />
            <label htmlFor="profile-area" className="block text-[12px] font-medium text-muted-foreground">
              Home area
            </label>
            <input
              id="profile-area"
              value={homeArea}
              onChange={(event) => setHomeArea(event.target.value)}
              placeholder="Silver Lake"
              className="h-10 w-full rounded-2xl bg-foreground/[0.06] px-3.5 text-[14px] outline-none focus:ring-2 focus:ring-primary/40"
            />
            <label htmlFor="profile-bio" className="block text-[12px] font-medium text-muted-foreground">
              About you
            </label>
            <textarea
              id="profile-bio"
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              rows={2}
              placeholder="Weekend hiker, coffee person, always up for a picnic."
              className="w-full resize-none rounded-2xl bg-foreground/[0.06] px-3.5 py-2.5 text-[14px] outline-none focus:ring-2 focus:ring-primary/40"
            />
            <button
              type="button"
              disabled={saving}
              onClick={async () => {
                await patch({ name, bio, homeArea: homeArea || null }, 'Profile updated.')
                setEditing(false)
              }}
              className="glass-press flex h-10 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-[13.5px] font-semibold text-primary-foreground disabled:opacity-60"
            >
              {saving && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Save changes
            </button>
          </div>
        )}

        <dl className="mt-4 grid grid-cols-4 gap-1.5">
          {[
            { label: 'Saved', value: user.stats.saved, icon: Bookmark },
            { label: 'Plans', value: user.stats.rsvps, icon: Check },
            { label: 'Groups', value: user.stats.communities, icon: Users },
            { label: 'Reviews', value: user.stats.reviews, icon: Star },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl bg-foreground/[0.05] px-2 py-2 text-center">
              <dt className="sr-only">{stat.label}</dt>
              <dd>
                <span className="block text-[17px] font-semibold tabular-nums leading-tight">{stat.value}</span>
                <span className="block text-[10.5px] uppercase tracking-wide text-muted-foreground">
                  {stat.label}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </GlassCard>

      <GlassCard className="mt-2">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-foreground/[0.06] text-foreground/70">
            <Lock className="size-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-[14px] font-semibold">Private account</h3>
            <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
              Hides you from people search, member lists and attendee lists. You still appear as the author of
              places, reviews and events you post.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={user.isPrivate}
            aria-label="Private account"
            disabled={saving}
            onClick={() => patch({ isPrivate: !user.isPrivate }, user.isPrivate ? 'Account is public.' : 'Account is private.')}
            className={cn(
              'relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors',
              user.isPrivate ? 'bg-primary' : 'bg-foreground/20',
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 size-6 rounded-full bg-white shadow transition-transform',
                user.isPrivate ? 'translate-x-[22px]' : 'translate-x-0.5',
              )}
            />
          </button>
        </div>
      </GlassCard>

      {(notice || error) && (
        <p
          role="status"
          className={cn(
            'glass mt-2 rounded-2xl px-3.5 py-2 text-[12.5px]',
            error ? 'text-destructive' : 'text-foreground/80',
          )}
        >
          {error ?? notice}
        </p>
      )}

      <section className="mt-4">
        <h2 className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Saved places
        </h2>
        {saved.length === 0 ? (
          <GlassCard>
            <p className="text-[13px] text-muted-foreground">
              Nothing saved yet. Tap the bookmark on any place to keep it here.
            </p>
          </GlassCard>
        ) : (
          <ul className="space-y-1.5">
            {saved.map((place) => (
              <li key={place.id}>
                <Link
                  href={`/places/${place.id}`}
                  className="glass glass-press flex items-center gap-2.5 rounded-[18px] p-2.5"
                >
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-xl text-white"
                    style={{ backgroundColor: TINT_HEX[PLACE_TYPE_META[place.type].tint] }}
                  >
                    <PlaceTypeIcon type={place.type} className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-semibold">{place.name}</span>
                    <span className="block truncate text-[11.5px] text-muted-foreground">
                      {PLACE_TYPE_META[place.type].label}
                      {place.area ? ` · ${place.area}` : ''}
                    </span>
                  </span>
                  <Bookmark className="size-4 shrink-0 fill-current text-primary" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageShell>
  )
}
