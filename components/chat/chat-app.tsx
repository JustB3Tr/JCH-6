'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import { Loader2, MessagesSquare, Plus, Send } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { formatTime } from '@/lib/format'
import type { ChatMessageLite, ChatThreadLite } from '@/lib/types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function ChatApp() {
  const searchParams = useSearchParams()
  const initialThread = searchParams.get('thread')
  const { status } = useSession()

  const { data: threadsData, mutate: mutateThreads } = useSWR<{ threads: ChatThreadLite[] }>(
    status === 'authenticated' ? '/api/chat/threads' : null,
    fetcher,
    { refreshInterval: 5000 },
  )
  const threads = threadsData?.threads ?? []

  const [activeId, setActiveId] = useState<string | null>(initialThread)
  const activeThread = threads.find((t) => t.id === activeId) ?? null

  // Default to the first thread once loaded.
  useEffect(() => {
    if (!activeId && threads.length) setActiveId(threads[0].id)
  }, [activeId, threads])

  const { data: messagesData, mutate: mutateMessages } = useSWR<{ messages: ChatMessageLite[] }>(
    activeId && status === 'authenticated' ? `/api/chat/threads/${activeId}/messages` : null,
    fetcher,
    { refreshInterval: 3000 },
  )
  const messages = messagesData?.messages ?? []

  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const body = draft.trim()
    if (!body || !activeId) return
    setSending(true)
    setDraft('')
    try {
      await fetch(`/api/chat/threads/${activeId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      })
      mutateMessages()
      mutateThreads()
    } finally {
      setSending(false)
    }
  }

  const [newChatOpen, setNewChatOpen] = useState(false)
  const [newChatName, setNewChatName] = useState('')
  const [newChatError, setNewChatError] = useState<string | null>(null)

  async function createDirectChat(e: React.FormEvent) {
    e.preventDefault()
    setNewChatError(null)
    try {
      const res = await fetch('/api/chat/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'direct', name: newChatName.trim() || 'Direct chat' }),
      })
      if (!res.ok) throw new Error('Could not start the chat.')
      setNewChatOpen(false)
      setNewChatName('')
      mutateThreads()
    } catch (err) {
      setNewChatError(err instanceof Error ? err.message : 'Something went wrong.')
    }
  }

  if (status === 'unauthenticated') {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-20 text-center">
        <MessagesSquare className="size-10 text-muted-foreground" aria-hidden />
        <h1 className="text-xl font-semibold">Chat with your people</h1>
        <p className="text-sm text-muted-foreground">Sign in to join community and direct conversations.</p>
        <a href="/sign-in" className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          Sign in
        </a>
      </div>
    )
  }

  return (
    <div className="mx-auto grid h-[calc(100vh-3.5rem)] w-full max-w-6xl grid-cols-1 md:grid-cols-[300px_1fr]">
      {/* Thread list */}
      <aside className="hidden flex-col border-e border-border bg-card md:flex">
        <div className="flex items-center justify-between p-4">
          <h1 className="font-semibold">Conversations</h1>
          <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
            <DialogTrigger render={<Button size="icon" variant="ghost" aria-label="New direct chat"><Plus className="size-4" aria-hidden /></Button>} />
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Start a direct chat</DialogTitle>
                <DialogDescription>Name it after the person or topic so you can find it later.</DialogDescription>
              </DialogHeader>
              <form onSubmit={createDirectChat} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="thread-name">Chat name</Label>
                  <Input id="thread-name" value={newChatName} onChange={(e) => setNewChatName(e.target.value)} placeholder="e.g. Trail buddies" />
                </div>
                {newChatError && (
                  <p role="alert" className="text-sm text-destructive">
                    {newChatError}
                  </p>
                )}
                <DialogFooter>
                  <Button type="submit">Start chat</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <ul className="flex-1 overflow-y-auto">
          {threads.length ? (
            threads.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(t.id)}
                  aria-current={t.id === activeId}
                  className={`w-full px-4 py-3 text-start hover:bg-secondary ${t.id === activeId ? 'bg-secondary' : ''}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">{t.name}</span>
                    <Badge variant="outline" className="shrink-0 text-[10px] capitalize">
                      {t.kind}
                    </Badge>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{t.lastMessage ?? 'No messages yet'}</p>
                </button>
              </li>
            ))
          ) : (
            <li className="p-4 text-sm text-muted-foreground">No conversations yet. Join a community to get one.</li>
          )}
        </ul>
      </aside>

      {/* Thread view */}
      <section className="flex min-h-0 flex-col">
        {/* Mobile thread picker */}
        <div className="border-b border-border p-3 md:hidden">
          <label htmlFor="thread-select" className="sr-only">
            Choose conversation
          </label>
          <select
            id="thread-select"
            value={activeId ?? ''}
            onChange={(e) => setActiveId(e.target.value)}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
          >
            {threads.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {activeThread ? (
          <>
            <header className="border-b border-border px-4 py-3">
              <h2 className="font-semibold">{activeThread.name}</h2>
              <p className="text-xs capitalize text-muted-foreground">{activeThread.kind} conversation</p>
            </header>
            <div className="flex-1 overflow-y-auto p-4">
              <ul className="flex flex-col gap-3">
                {messages.map((m) => (
                  <li key={m.id} className="max-w-[80%] self-start">
                    <div className="rounded-2xl rounded-tl-sm bg-secondary px-3.5 py-2.5">
                      <p className="text-xs font-medium text-secondary-foreground/70">{m.userName}</p>
                      <p className="mt-0.5 whitespace-pre-wrap text-sm">{m.body}</p>
                    </div>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{formatTime(m.createdAt)}</p>
                  </li>
                ))}
                <div ref={bottomRef} />
              </ul>
            </div>
            <form onSubmit={send} className="flex gap-2 border-t border-border p-3">
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Write a message..."
                aria-label="Message"
              />
              <Button type="submit" size="icon" aria-label="Send message" disabled={sending || !draft.trim()}>
                {sending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
              </Button>
            </form>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
            <MessagesSquare className="size-10 text-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground">Pick a conversation to start chatting.</p>
          </div>
        )}
      </section>
    </div>
  )
}
