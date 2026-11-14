'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Check, Loader2, Plus, Search, Users, X } from 'lucide-react'
import { api, errorMessage, useApi } from '@/lib/client'
import { COMMUNITY_ICONS, TINT_HEX, TINTS, type CommunityIcon, type Tint } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { EmptyState, GlassCard, PageShell } from '@/components/shell/page-shell'
import { CommunityIcon as CommunityGlyph } from '@/components/communities/community-icon'
import type { CommunitySummary } from '@/lib/types'

export function CommunitiesView() {
  const { status } = useSession()
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const path = query.trim() ? `/api/communities?q=${encodeURIComponent(query.trim())}` : '/api/communities'
  const { data, isLoading, mutate } = useApi<{ communities: CommunitySummary[] }>(path)
  const communities = data?.communities ?? []

  async function toggleJoin(community: CommunitySummary) {
    if (status !== 'authenticated') {
      setNotice('Sign in to join a group.')
      return
    }
    setBusyId(community.id)
    try {
      await api(`/api/communities/${community.id}/membership`, { method: community.joined ? 'DELETE' : 'PUT' })
      await mutate()
    } catch (error) {
      setNotice(errorMessage(error))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <PageShell
      title="Groups"
      subtitle="People who meet up on purpose"
      action={
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="glass-press flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground"
          aria-label="Create a group"
        >
          <Plus className="size-4.5" aria-hidden />
        </button>
      }
    >
      <div className="glass mb-3 flex items-center gap-2 rounded-full px-3.5 py-2.5">
        <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search groups"
          aria-label="Search groups"
          className="min-w-0 flex-1 bg-transparent text-[14.5px] outline-none placeholder:text-muted-foreground"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Clear search"
            className="flex size-6 items-center justify-center rounded-full bg-foreground/10 text-muted-foreground"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        )}
      </div>

      {notice && (
        <p role="status" className="glass mb-3 rounded-2xl px-3.5 py-2 text-[12.5px]">
          {notice}
        </p>
      )}

      {isLoading && (
        <p className="flex items-center justify-center gap-2 py-10 text-[13px] text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Loading groups…
        </p>
      )}

      {!isLoading && communities.length === 0 && (
        <EmptyState
          title="No groups yet"
          body="Start one around something you already do — Sunday markets, dog walks, sunrise hikes."
          action={
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="rounded-full bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground"
            >
              Create a group
            </button>
          }
        />
      )}

      <ul className="grid gap-2 sm:grid-cols-2">
        {communities.map((community) => {
          const tint = TINT_HEX[community.tint as Tint] ?? TINT_HEX.gray
          return (
            <GlassCard as="li" key={community.id} className="animate-rise flex flex-col">
              <div className="flex items-start gap-3">
                <span
                  className="flex size-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm"
                  style={{ backgroundColor: tint }}
                >
                  <CommunityGlyph name={community.icon} className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <Link href={`/communities/${community.slug}`} className="block">
                    <h2 className="truncate text-[15.5px] font-semibold leading-tight tracking-[-0.01em]">
                      {community.name}
                    </h2>
                  </Link>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    {community.memberCount} {community.memberCount === 1 ? 'member' : 'members'}
                    {community.upcomingEvents > 0 ? ` · ${community.upcomingEvents} upcoming` : ''}
                  </p>
                </div>
              </div>

              <p className="mt-2 line-clamp-2 text-[12.5px] leading-relaxed text-muted-foreground">
                {community.description}
              </p>

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleJoin(community)}
                  disabled={busyId === community.id}
                  className={cn(
                    'glass-press flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full text-[12.5px] font-semibold transition-colors',
                    community.joined
                      ? 'bg-foreground/[0.06] text-foreground/70'
                      : 'bg-primary text-primary-foreground',
                  )}
                >
                  {busyId === community.id ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  ) : community.joined ? (
                    <Check className="size-3.5" aria-hidden />
                  ) : (
                    <Users className="size-3.5" aria-hidden />
                  )}
                  {community.joined ? 'Joined' : 'Join'}
                </button>
                <Link
                  href={`/communities/${community.slug}`}
                  className="glass-press flex h-9 items-center justify-center rounded-full bg-foreground/[0.06] px-3.5 text-[12.5px] font-semibold"
                >
                  Open
                </Link>
              </div>
            </GlassCard>
          )
        })}
      </ul>

      {creating && (
        <CreateGroupSheet
          onClose={() => setCreating(false)}
          onCreated={async () => {
            setCreating(false)
            await mutate()
          }}
        />
      )}
    </PageShell>
  )
}

function CreateGroupSheet({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState<CommunityIcon>('users')
  const [tint, setTint] = useState<Tint>('blue')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await api('/api/communities', { method: 'POST', body: JSON.stringify({ name, description, icon, tint }) })
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
          <h2 className="text-[18px] font-semibold tracking-tight">New group</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-8 items-center justify-center rounded-full bg-foreground/[0.06] text-muted-foreground"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <label htmlFor="group-name" className="mt-3 block text-[12px] font-medium text-muted-foreground">
          Name
        </label>
        <input
          id="group-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          minLength={2}
          placeholder="Echo Park Evening Walkers"
          className="mt-1 h-11 w-full rounded-2xl bg-foreground/[0.06] px-3.5 text-[15px] outline-none focus:ring-2 focus:ring-primary/40"
        />

        <label htmlFor="group-about" className="mt-3 block text-[12px] font-medium text-muted-foreground">
          What is it for?
        </label>
        <textarea
          id="group-about"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={2}
          placeholder="A short line about who should join and what you do."
          className="mt-1 w-full resize-none rounded-2xl bg-foreground/[0.06] px-3.5 py-2.5 text-[15px] outline-none focus:ring-2 focus:ring-primary/40"
        />

        <p className="mt-3 text-[12px] font-medium text-muted-foreground">Icon</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {COMMUNITY_ICONS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setIcon(value)}
              aria-pressed={icon === value}
              aria-label={value}
              className={cn(
                'flex size-9 items-center justify-center rounded-xl transition-colors',
                icon === value ? 'bg-primary text-primary-foreground' : 'bg-foreground/[0.06] text-foreground/70',
              )}
            >
              <CommunityGlyph name={value} className="size-4" />
            </button>
          ))}
        </div>

        <p className="mt-3 text-[12px] font-medium text-muted-foreground">Color</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {TINTS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setTint(value)}
              aria-pressed={tint === value}
              aria-label={value}
              className={cn(
                'size-7 rounded-full ring-offset-2 ring-offset-background transition-shadow',
                tint === value && 'ring-2 ring-foreground/60',
              )}
              style={{ backgroundColor: TINT_HEX[value] }}
            />
          ))}
        </div>

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
          Create group
        </button>
      </form>
    </div>
  )
}
