'use client'

import { useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { CalendarDays, Loader2, Plus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { CommunityLite } from '@/lib/types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function CommunitiesBrowser() {
  const { data, isLoading, mutate } = useSWR<{ communities: CommunityLite[] }>('/api/communities', fetcher)
  const communities = data?.communities ?? []
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [emoji, setEmoji] = useState('📍')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)

  async function toggleJoin(c: CommunityLite) {
    setPendingId(c.id)
    try {
      const res = await fetch(`/api/communities/${c.id}/membership`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ join: !c.joined }),
      })
      if (res.ok) mutate()
    } finally {
      setPendingId(null)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) {
      setError('Give your community a name.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/communities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim(), emoji: emoji.trim() || '📍' }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? 'Could not create the community.')
      }
      setOpen(false)
      setName('')
      setDescription('')
      setEmoji('📍')
      mutate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Communities</h1>
          <p className="text-sm text-muted-foreground">Groups that organize hangouts around shared interests.</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button><Plus className="size-4" aria-hidden /> Start a community</Button>} />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Start a community</DialogTitle>
              <DialogDescription>You will be its first organizer.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="community-name">Name</Label>
                <Input id="community-name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="community-description">Description</Label>
                <Textarea id="community-description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="community-emoji">Emoji badge</Label>
                <Input id="community-emoji" value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={4} className="w-20" />
              </div>
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              <DialogFooter>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="size-4 animate-spin" aria-hidden />}
                  Create
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && !data ? (
        <div className="mt-10 flex justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
        </div>
      ) : (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {communities.map((c) => (
            <li key={c.id} className="flex flex-col rounded-3xl border border-border bg-card p-5">
              <div className="flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-xl" aria-hidden>
                  {c.emoji}
                </span>
                <div className="min-w-0">
                  <Link href={`/communities/${c.slug}`} className="font-semibold hover:underline">
                    {c.name}
                  </Link>
                  <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between gap-2">
                <span className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="size-3.5" aria-hidden /> {c.memberCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <CalendarDays className="size-3.5" aria-hidden /> {c.upcomingEvents} upcoming
                  </span>
                </span>
                <Button
                  size="sm"
                  variant={c.joined ? 'outline' : 'default'}
                  disabled={pendingId === c.id}
                  onClick={() => toggleJoin(c)}
                >
                  {c.joined ? 'Leave' : 'Join'}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
