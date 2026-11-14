'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import {
  ArrowUp,
  BookOpen,
  History,
  Loader2,
  Locate,
  LocateOff,
  Plus,
  Sparkles,
  Square,
  Wrench,
  X,
} from 'lucide-react'
import { api, errorMessage, useApi } from '@/lib/client'
import { PLACE_TYPE_META, TINT_HEX } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { PlaceTypeIcon } from '@/components/place/place-type-icon'
import type { AiChatInfo, AiMessageInfo, AiStreamEvent, AiToolInfo, PlaceSummary } from '@/lib/types'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  places: PlaceSummary[]
  tools: string[]
}

const SUGGESTIONS = [
  'Shady park with picnic tables near Pasadena',
  'What is happening this weekend?',
  'Find a fair midpoint between Silver Lake and Santa Monica',
  'Is it okay to bring my dog to a beach meetup?',
]

export function GuideChat() {
  const { status } = useSession()
  const [chatId, setChatId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [streamPlaces, setStreamPlaces] = useState<PlaceSummary[]>([])
  const [activeTools, setActiveTools] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locating, setLocating] = useState(false)
  const [showTools, setShowTools] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const abort = useRef<AbortController | null>(null)
  const bottom = useRef<HTMLDivElement | null>(null)

  const { data: history, mutate: refreshHistory } = useApi<{ chats: AiChatInfo[] }>(
    status === 'authenticated' ? '/api/ai/chat' : null,
  )
  const { data: toolData } = useApi<{ tools: AiToolInfo[] }>('/api/ai/tools')

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length, streamText, activeTools.length])

  const shareLocation = useCallback(() => {
    if (location) {
      setLocation(null)
      return
    }
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({ lat: position.coords.latitude, lng: position.coords.longitude })
        setLocating(false)
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }, [location])

  const send = useCallback(
    async (text: string) => {
      const message = text.trim()
      if (!message || streaming) return
      if (status !== 'authenticated') {
        setError('Sign in to talk to the guide.')
        return
      }

      setError(null)
      setDraft('')
      setMessages((current) => [
        ...current,
        { id: `local-${Date.now()}`, role: 'user', content: message, places: [], tools: [] },
      ])
      setStreaming(true)
      setStreamText('')
      setStreamPlaces([])
      setActiveTools([])

      const controller = new AbortController()
      abort.current = controller

      try {
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatId, message, location }),
          signal: controller.signal,
        })
        if (!response.ok || !response.body) {
          const data = (await response.json().catch(() => null)) as { error?: string } | null
          throw new Error(data?.error ?? 'The guide is not available right now.')
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let text = ''
        let places: PlaceSummary[] = []
        let tools: string[] = []

        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          let newline: number
          while ((newline = buffer.indexOf('\n')) !== -1) {
            const line = buffer.slice(0, newline).trim()
            buffer = buffer.slice(newline + 1)
            if (!line) continue

            let event: AiStreamEvent
            try {
              event = JSON.parse(line) as AiStreamEvent
            } catch {
              continue
            }

            if (event.type === 'chat') setChatId(event.chatId)
            else if (event.type === 'delta') {
              text += event.text
              setStreamText(text)
            } else if (event.type === 'reset') {
              text = ''
              setStreamText('')
            } else if (event.type === 'tool') {
              setActiveTools((current) => (current.includes(event.label) ? current : [...current, event.label]))
            } else if (event.type === 'places') {
              places = event.places
              setStreamPlaces(event.places)
            } else if (event.type === 'done') {
              tools = event.tools
            } else if (event.type === 'error') {
              throw new Error(event.message)
            }
          }
        }

        setMessages((current) => [
          ...current,
          { id: `reply-${Date.now()}`, role: 'assistant', content: text, places, tools },
        ])
        setStreamText('')
        setStreamPlaces([])
        setActiveTools([])
        refreshHistory()
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          setStreamText('')
        } else {
          setError(errorMessage(err))
          setMessages((current) => current.filter((m) => !m.id.startsWith('local-')))
        }
      } finally {
        setStreaming(false)
        abort.current = null
      }
    },
    [chatId, location, refreshHistory, status, streaming],
  )

  async function openChat(id: string) {
    setShowHistory(false)
    setError(null)
    try {
      const result = await api<{ chat: { id: string; messages: AiMessageInfo[] } }>(`/api/ai/chats/${id}`)
      setChatId(result.chat.id)
      setMessages(
        result.chat.messages.map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content,
          places: message.places,
          tools: message.tools,
        })),
      )
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  function newChat() {
    abort.current?.abort()
    setChatId(null)
    setMessages([])
    setStreamText('')
    setStreamPlaces([])
    setActiveTools([])
    setError(null)
    setShowHistory(false)
  }

  const empty = messages.length === 0 && !streaming

  return (
    <div className="mx-auto flex h-dvh w-full max-w-3xl flex-col px-3">
      <header className="flex items-center gap-2 pb-2 pt-[max(env(safe-area-inset-top),0.75rem)]">
        <div className="glass glass-strong flex min-w-0 flex-1 items-center gap-2 rounded-[22px] px-3 py-2.5">
          <span className="flex size-8 items-center justify-center rounded-full bg-primary/12 text-primary">
            <Sparkles className="size-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-[16px] font-semibold leading-tight tracking-[-0.02em]">Guide</h1>
            <p className="truncate text-[11.5px] text-muted-foreground">
              Knows the map, the calendar and the city
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowTools(true)}
            aria-label="What the guide can do"
            className="glass-press flex size-8 items-center justify-center rounded-full bg-foreground/[0.06] text-foreground/70"
          >
            <Wrench className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => setShowHistory(true)}
            aria-label="Past chats"
            className="glass-press flex size-8 items-center justify-center rounded-full bg-foreground/[0.06] text-foreground/70"
          >
            <History className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={newChat}
            aria-label="New chat"
            className="glass-press flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground"
          >
            <Plus className="size-4" aria-hidden />
          </button>
        </div>
      </header>

      <div className="min-w-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden overscroll-contain pb-3">
        {empty && (
          <div className="animate-rise px-1 pt-6">
            <h2 className="text-[24px] font-semibold leading-tight tracking-[-0.03em]">
              Where should we go?
            </h2>
            <p className="mt-1 max-w-[38ch] text-[13.5px] leading-relaxed text-muted-foreground">
              Ask for a spot, a plan, or a fair place to meet. The guide searches the same map you do, and
              can RSVP or save a place for you.
            </p>
            <ul className="mt-4 flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((suggestion) => (
                <li key={suggestion} className="max-w-full">
                  <button
                    type="button"
                    onClick={() => send(suggestion)}
                    className="glass glass-press max-w-full rounded-full px-3 py-1.5 text-left text-[12.5px] font-medium text-foreground/80"
                  >
                    {suggestion}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {streaming && (
          <div className="flex justify-start">
            <div className="max-w-[88%]">
              {activeTools.length > 0 && (
                <ul className="mb-1.5 flex flex-wrap gap-1.5">
                  {activeTools.map((label) => (
                    <li
                      key={label}
                      className="glass flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium text-muted-foreground"
                    >
                      <Loader2 className="size-3 animate-spin" aria-hidden />
                      {label}
                    </li>
                  ))}
                </ul>
              )}
              <div className="glass rounded-[20px] rounded-bl-md px-3.5 py-2.5 text-[14px] leading-relaxed">
                {streamText ? <RichText text={streamText} /> : <TypingDots />}
              </div>
              {streamPlaces.length > 0 && <PlaceCards places={streamPlaces} />}
            </div>
          </div>
        )}

        {error && (
          <p role="alert" className="glass rounded-2xl px-3.5 py-2 text-[12.5px] text-destructive">
            {error}
          </p>
        )}

        <div ref={bottom} />
      </div>

      <div className="pb-[calc(env(safe-area-inset-bottom)+5.5rem)]">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            send(draft)
          }}
          className="glass glass-strong rounded-[24px] p-2"
        >
          <div className="flex items-end gap-1.5">
            <button
              type="button"
              onClick={shareLocation}
              aria-pressed={Boolean(location)}
              aria-label={location ? 'Stop sharing location' : 'Share my location'}
              className={cn(
                'glass-press mb-0.5 flex size-9 shrink-0 items-center justify-center rounded-full transition-colors',
                location ? 'bg-primary text-primary-foreground' : 'bg-foreground/[0.06] text-foreground/60',
              )}
            >
              {locating ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : location ? (
                <Locate className="size-4" aria-hidden />
              ) : (
                <LocateOff className="size-4" aria-hidden />
              )}
            </button>

            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' || event.shiftKey) return
                if (event.nativeEvent.isComposing || event.keyCode === 229) return
                event.preventDefault()
                send(draft)
              }}
              rows={1}
              placeholder={location ? 'Ask about somewhere near you' : 'Ask the guide'}
              aria-label="Message the guide"
              className="max-h-32 min-h-9 flex-1 resize-none bg-transparent px-1.5 py-2 text-[14.5px] leading-snug outline-none placeholder:text-muted-foreground"
            />

            {streaming ? (
              <button
                type="button"
                onClick={() => abort.current?.abort()}
                aria-label="Stop"
                className="glass-press mb-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground/[0.08] text-foreground/70"
              >
                <Square className="size-3.5 fill-current" aria-hidden />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!draft.trim()}
                aria-label="Send"
                className="glass-press mb-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
              >
                <ArrowUp className="size-4" aria-hidden />
              </button>
            )}
          </div>
        </form>
        <p className="mt-1.5 text-center text-[10.5px] text-muted-foreground">
          The guide can be wrong. Check conditions before you go.
        </p>
      </div>

      {showTools && (
        <ToolsSheet tools={toolData?.tools ?? []} onClose={() => setShowTools(false)} />
      )}

      {showHistory && (
        <HistorySheet
          chats={history?.chats ?? []}
          onOpen={openChat}
          onNew={newChat}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-[20px] rounded-br-md bg-primary px-3.5 py-2.5 text-[14px] leading-relaxed text-primary-foreground">
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[88%]">
        <div className="glass rounded-[20px] rounded-bl-md px-3.5 py-2.5 text-[14px] leading-relaxed">
          <RichText text={message.content} />
        </div>
        {message.places.length > 0 && <PlaceCards places={message.places} />}
      </div>
    </div>
  )
}

function PlaceCards({ places }: { places: PlaceSummary[] }) {
  return (
    <ul className="no-scrollbar mt-1.5 flex gap-1.5 overflow-x-auto pb-1">
      {places.map((place) => {
        const tint = TINT_HEX[PLACE_TYPE_META[place.type].tint]
        return (
          <li key={place.id} className="shrink-0">
            <Link
              href={`/places/${place.id}`}
              className="glass glass-press flex w-[190px] items-center gap-2 rounded-2xl p-2"
            >
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-xl text-white"
                style={{ backgroundColor: tint }}
              >
                <PlaceTypeIcon type={place.type} className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[12.5px] font-semibold">{place.name}</span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {place.area ?? PLACE_TYPE_META[place.type].label}
                  {place.ratingAvg !== null ? ` · ${place.ratingAvg.toFixed(1)}★` : ''}
                </span>
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

function RichText({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/).filter(Boolean)

  return (
    <div className="space-y-2">
      {blocks.map((block, index) => {
        const lines = block.split('\n').filter((line) => line.trim())
        const isList = lines.length > 0 && lines.every((line) => /^[-•*]\s+/.test(line.trim()))

        if (isList) {
          return (
            <ul key={index} className="space-y-1">
              {lines.map((line, lineIndex) => (
                <li key={lineIndex} className="flex gap-1.5">
                  <span className="mt-[7px] size-1 shrink-0 rounded-full bg-current opacity-40" aria-hidden />
                  <span>{inline(line.replace(/^[-•*]\s+/, ''))}</span>
                </li>
              ))}
            </ul>
          )
        }

        return <p key={index}>{inline(block)}</p>
      })}
    </div>
  )
}

function inline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={index} className="font-semibold">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={index}>{part}</span>
    ),
  )
}

function TypingDots() {
  return (
    <span className="flex items-center gap-1 py-1" aria-label="Thinking">
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60"
          style={{ animationDelay: `${index * 120}ms` }}
        />
      ))}
    </span>
  )
}

function ToolsSheet({ tools, onClose }: { tools: AiToolInfo[]; onClose: () => void }) {
  const core = tools.filter((tool) => tool.core)
  const discoverable = tools.filter((tool) => !tool.core)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/25 backdrop-blur-[2px]" onClick={onClose}>
      <div
        onClick={(event) => event.stopPropagation()}
        className="glass glass-strong animate-sheet-in max-h-[82dvh] w-full max-w-[480px] overflow-y-auto rounded-t-[30px] px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 sm:mb-6 sm:rounded-[30px]"
      >
        <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-foreground/20" aria-hidden />
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] font-semibold tracking-tight">What the guide can do</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-8 items-center justify-center rounded-full bg-foreground/[0.06] text-muted-foreground"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
          A small set of tools is always loaded. The rest are discovered on demand, which keeps answers
          focused and fast.
        </p>

        <ToolGroup title="Always available" tools={core} />
        <ToolGroup title="Loaded when needed" tools={discoverable} />

        <div className="mt-4 flex items-start gap-2 rounded-2xl bg-foreground/[0.05] p-3">
          <BookOpen className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          <p className="text-[12px] leading-relaxed text-muted-foreground">
            It also reads a guidebook of local know-how: parking, transit, dogs, beach rules, trail prep,
            permits, privacy and meetup safety.
          </p>
        </div>
      </div>
    </div>
  )
}

function ToolGroup({ title, tools }: { title: string; tools: AiToolInfo[] }) {
  if (!tools.length) return null
  return (
    <section className="mt-3">
      <h3 className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {title}
      </h3>
      <ul className="space-y-1.5">
        {tools.map((tool) => (
          <li key={tool.name} className="rounded-2xl bg-foreground/[0.05] px-3 py-2">
            <div className="flex items-center gap-2">
              <p className="text-[13px] font-semibold">{tool.label}</p>
              {tool.changesData && (
                <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                  changes data
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted-foreground">{tool.description}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

function HistorySheet({
  chats,
  onOpen,
  onNew,
  onClose,
}: {
  chats: AiChatInfo[]
  onOpen: (id: string) => void
  onNew: () => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/25 backdrop-blur-[2px]" onClick={onClose}>
      <div
        onClick={(event) => event.stopPropagation()}
        className="glass glass-strong animate-sheet-in max-h-[80dvh] w-full max-w-[480px] overflow-y-auto rounded-t-[30px] px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 sm:mb-6 sm:rounded-[30px]"
      >
        <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-foreground/20" aria-hidden />
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] font-semibold tracking-tight">Past chats</h2>
          <button
            type="button"
            onClick={onNew}
            className="rounded-full bg-primary px-3 py-1.5 text-[12.5px] font-semibold text-primary-foreground"
          >
            New
          </button>
        </div>

        {chats.length === 0 ? (
          <p className="py-6 text-center text-[12.5px] text-muted-foreground">No chats yet.</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {chats.map((chat) => (
              <li key={chat.id}>
                <button
                  type="button"
                  onClick={() => onOpen(chat.id)}
                  className="w-full truncate rounded-2xl px-2.5 py-2 text-left text-[13.5px] transition-colors hover:bg-foreground/[0.06]"
                >
                  {chat.title}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
