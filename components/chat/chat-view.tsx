'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ChevronLeft, Loader2, MessageCircle, Plus, Search, Send, Users, X } from 'lucide-react'
import { api, errorMessage, useApi } from '@/lib/client'
import { TINT_HEX, type Tint } from '@/lib/constants'
import { formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { EmptyState, PageShell } from '@/components/shell/page-shell'
import { CommunityIcon } from '@/components/communities/community-icon'
import type { ChatMessageInfo, ThreadSummary } from '@/lib/types'

type Person = { id: string; name: string; homeArea: string | null }

export function ChatView() {
  const params = useSearchParams()
  const { status } = useSession()
  const [activeId, setActiveId] = useState<string | null>(params.get('thread'))
  const [composing, setComposing] = useState(false)

  const { data, isLoading, mutate } = useApi<{ threads: ThreadSummary[] }>(
    status === 'authenticated' ? '/api/chat/threads' : null,
    { refreshInterval: 8000 },
  )
  const threads = data?.threads ?? []
  const active = threads.find((thread) => thread.id === activeId) ?? null

  if (status === 'loading') {
    return (
      <PageShell title="Chat">
        <p className="flex items-center justify-center gap-2 py-10 text-[13px] text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Loading…
        </p>
      </PageShell>
    )
  }

  if (status !== 'authenticated') {
    return (
      <PageShell title="Chat" subtitle="Plans happen in the group chat">
        <EmptyState
          title="Sign in to chat"
          body="Group chats and direct messages are private to their members. Sign in to see yours."
          action={
            <a
              href="/sign-in"
              className="rounded-full bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground"
            >
              Sign in
            </a>
          }
        />
      </PageShell>
    )
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-3 pb-32">
      <div className="grid gap-3 pt-[max(env(safe-area-inset-top),0.75rem)] sm:grid-cols-[300px_1fr]">
        <div className={cn('min-w-0', active && 'hidden sm:block')}>
          <div className="glass glass-strong mb-2 flex items-center gap-2 rounded-[22px] px-3.5 py-2.5">
            <MessageCircle className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <h1 className="flex-1 text-[17px] font-semibold tracking-[-0.02em]">Chat</h1>
            <button
              type="button"
              onClick={() => setComposing(true)}
              aria-label="Start a conversation"
              className="glass-press flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground"
            >
              <Plus className="size-4" aria-hidden />
            </button>
          </div>

          {isLoading && (
            <p className="flex items-center justify-center gap-2 py-8 text-[13px] text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Loading chats…
            </p>
          )}

          {!isLoading && threads.length === 0 && (
            <EmptyState
              title="No conversations yet"
              body="Join a group to get its chat, or start a direct message with someone you met at a meetup."
              action={
                <button
                  type="button"
                  onClick={() => setComposing(true)}
                  className="rounded-full bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground"
                >
                  New message
                </button>
              }
            />
          )}

          <ul className="space-y-1.5">
            {threads.map((thread) => {
              const tint = thread.community ? (TINT_HEX[thread.community.tint as Tint] ?? TINT_HEX.gray) : null
              return (
                <li key={thread.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(thread.id)}
                    className={cn(
                      'glass-press flex w-full items-center gap-2.5 rounded-[18px] px-3 py-2.5 text-left transition-colors',
                      activeId === thread.id ? 'glass glass-strong' : 'bg-foreground/[0.04]',
                    )}
                  >
                    <span
                      className="flex size-9 shrink-0 items-center justify-center rounded-full text-white"
                      style={{ backgroundColor: tint ?? '#8E8E93' }}
                    >
                      {thread.community ? (
                        <CommunityIcon name={thread.community.icon} className="size-4" />
                      ) : thread.kind === 'group' ? (
                        <Users className="size-4" aria-hidden />
                      ) : (
                        <span className="text-[12px] font-semibold">{thread.name.slice(0, 1).toUpperCase()}</span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-2">
                        <span className="truncate text-[13.5px] font-semibold">{thread.name}</span>
                        <span className="ml-auto shrink-0 text-[10.5px] text-muted-foreground">
                          {formatTime(thread.lastMessageAt)}
                        </span>
                      </span>
                      <span className="mt-0.5 flex items-center gap-1.5">
                        <span className="truncate text-[12px] text-muted-foreground">
                          {thread.lastMessage
                            ? `${thread.lastMessage.author.split(' ')[0]}: ${thread.lastMessage.body}`
                            : 'No messages yet'}
                        </span>
                        {thread.unread > 0 && (
                          <span className="ml-auto flex size-4 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                            {thread.unread}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        <div className={cn('min-w-0', !active && 'hidden sm:block')}>
          {active ? (
            <Conversation thread={active} onBack={() => setActiveId(null)} onSent={mutate} />
          ) : (
            <div className="glass hidden h-[70dvh] items-center justify-center rounded-[22px] sm:flex">
              <p className="max-w-[28ch] text-center text-[13px] leading-relaxed text-muted-foreground">
                Pick a conversation. Group chats are where the plan actually gets made.
              </p>
            </div>
          )}
        </div>
      </div>

      {composing && (
        <NewChatSheet
          onClose={() => setComposing(false)}
          onOpened={async (threadId) => {
            setComposing(false)
            await mutate()
            setActiveId(threadId)
          }}
        />
      )}
    </div>
  )
}

function Conversation({
  thread,
  onBack,
  onSent,
}: {
  thread: ThreadSummary
  onBack: () => void
  onSent: () => void
}) {
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottom = useRef<HTMLDivElement | null>(null)

  const { data, mutate, isLoading } = useApi<{ messages: ChatMessageInfo[] }>(
    `/api/chat/threads/${thread.id}/messages`,
    { refreshInterval: 4000 },
  )
  const messages = data?.messages ?? []

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' })
  }, [messages.length, thread.id])

  async function send(event: React.FormEvent) {
    event.preventDefault()
    const body = draft.trim()
    if (!body || sending) return
    setSending(true)
    setError(null)
    setDraft('')
    try {
      await api(`/api/chat/threads/${thread.id}/messages`, { method: 'POST', body: JSON.stringify({ body }) })
      await mutate()
      onSent()
    } catch (err) {
      setDraft(body)
      setError(errorMessage(err))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="glass glass-strong flex h-[calc(100dvh-9rem)] flex-col overflow-hidden rounded-[22px] sm:h-[70dvh]">
      <header className="flex items-center gap-2 border-b border-border/60 px-3 py-2.5">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to conversations"
          className="glass-press flex size-8 items-center justify-center rounded-full bg-foreground/[0.06] sm:hidden"
        >
          <ChevronLeft className="size-4" aria-hidden />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[14.5px] font-semibold">{thread.name}</h2>
          <p className="text-[11.5px] text-muted-foreground">
            {thread.memberCount} {thread.memberCount === 1 ? 'member' : 'members'}
          </p>
        </div>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto overscroll-contain px-3 py-3">
        {isLoading && (
          <p className="flex items-center justify-center gap-2 py-6 text-[12.5px] text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
            Loading messages…
          </p>
        )}

        {!isLoading && messages.length === 0 && (
          <p className="py-8 text-center text-[12.5px] text-muted-foreground">
            No messages yet. Say hello and suggest a plan.
          </p>
        )}

        {messages.map((message) => (
          <div key={message.id} className={cn('flex', message.mine ? 'justify-end' : 'justify-start')}>
            <div className={cn('max-w-[78%]', message.mine && 'text-right')}>
              {!message.mine && (
                <p className="mb-0.5 px-1 text-[11px] font-medium text-muted-foreground">{message.author.name}</p>
              )}
              <div
                className={cn(
                  'inline-block rounded-[18px] px-3 py-2 text-left text-[13.5px] leading-snug',
                  message.mine
                    ? 'rounded-br-md bg-primary text-primary-foreground'
                    : 'rounded-bl-md bg-foreground/[0.07] text-foreground',
                )}
              >
                {message.body}
              </div>
              <p className="mt-0.5 px-1 text-[10.5px] text-muted-foreground">{formatTime(message.createdAt)}</p>
            </div>
          </div>
        ))}
        <div ref={bottom} />
      </div>

      {error && (
        <p role="alert" className="px-3 pb-1 text-[12px] text-destructive">
          {error}
        </p>
      )}

      <form onSubmit={send} className="flex items-center gap-2 border-t border-border/60 p-2.5">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' || event.shiftKey) return
            if (event.nativeEvent.isComposing || event.keyCode === 229) return
            event.preventDefault()
            event.currentTarget.form?.requestSubmit()
          }}
          placeholder="Message"
          aria-label="Message"
          className="h-10 min-w-0 flex-1 rounded-full bg-foreground/[0.06] px-3.5 text-[14px] outline-none focus:ring-2 focus:ring-primary/40"
        />
        <button
          type="submit"
          disabled={!draft.trim() || sending}
          aria-label="Send"
          className="glass-press flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
        >
          {sending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
        </button>
      </form>
    </div>
  )
}

function NewChatSheet({ onClose, onOpened }: { onClose: () => void; onOpened: (threadId: string) => void }) {
  const [query, setQuery] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { data, isLoading } = useApi<{ people: Person[] }>(
    query.trim().length >= 1 ? `/api/users?q=${encodeURIComponent(query.trim())}` : null,
  )
  const people = data?.people ?? []

  async function open(person: Person) {
    setBusyId(person.id)
    setError(null)
    try {
      const result = await api<{ thread: { id: string } }>('/api/chat/threads', {
        method: 'POST',
        body: JSON.stringify({ kind: 'direct', userId: person.id }),
      })
      onOpened(result.thread.id)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/25 backdrop-blur-[2px]" onClick={onClose}>
      <div
        onClick={(event) => event.stopPropagation()}
        className="glass glass-strong animate-sheet-in max-h-[80dvh] w-full max-w-[480px] overflow-y-auto rounded-t-[30px] px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 sm:mb-6 sm:rounded-[30px]"
      >
        <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-foreground/20" aria-hidden />
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] font-semibold tracking-tight">New message</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-8 items-center justify-center rounded-full bg-foreground/[0.06] text-muted-foreground"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-full bg-foreground/[0.06] px-3.5 py-2.5">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search people by name"
            aria-label="Search people"
            className="min-w-0 flex-1 bg-transparent text-[14.5px] outline-none placeholder:text-muted-foreground"
          />
        </div>

        {error && (
          <p role="alert" className="mt-2 rounded-xl bg-destructive/10 px-3 py-2 text-[12.5px] text-destructive">
            {error}
          </p>
        )}

        <ul className="mt-2">
          {isLoading && (
            <li className="flex items-center gap-2 px-2 py-3 text-[12.5px] text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              Searching…
            </li>
          )}
          {!isLoading && query.trim() && people.length === 0 && (
            <li className="px-2 py-4 text-center text-[12.5px] text-muted-foreground">
              No one matched. Private accounts do not appear in search.
            </li>
          )}
          {people.map((person) => (
            <li key={person.id}>
              <button
                type="button"
                onClick={() => open(person)}
                disabled={busyId === person.id}
                className="flex w-full items-center gap-2.5 rounded-2xl px-2 py-2 text-left transition-colors hover:bg-foreground/[0.06]"
              >
                <span className="flex size-9 items-center justify-center rounded-full bg-primary/15 text-[12px] font-semibold text-primary">
                  {person.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium">{person.name}</span>
                  {person.homeArea && (
                    <span className="block truncate text-[12px] text-muted-foreground">{person.homeArea}</span>
                  )}
                </span>
                {busyId === person.id && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
