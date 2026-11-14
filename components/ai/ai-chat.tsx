'use client'

import { useEffect, useRef, useState } from 'react'
import useSWR from 'swr'
import { Loader2, Mic, MicOff, Plus, Send, Sparkles, Volume2, VolumeX } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { AiChatLite, AiMessageLite } from '@/lib/types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const SUGGESTED_PROMPTS = [
  'Where can I find a shaded picnic spot with parking?',
  'What is happening this weekend near me?',
  'Plan a dog-friendly afternoon hangout.',
  'Which trail is best for a beginner sunrise hike?',
]

// Minimal typings for the Web Speech API (not in the standard TS DOM lib).
interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  start(): void
  stop(): void
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> & { length: number } }) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
}

export function AiChat() {
  const { status } = useSession()

  const { data: chatsData, mutate: mutateChats } = useSWR<{ chats: AiChatLite[] }>(
    status === 'authenticated' ? '/api/ai/chats' : null,
    fetcher,
  )
  const chats = chatsData?.chats ?? []

  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [messages, setMessages] = useState<AiMessageLite[]>([])
  const [draft, setDraft] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [listening, setListening] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Load messages when switching chats.
  useEffect(() => {
    if (!activeChatId) {
      setMessages([])
      return
    }
    fetch(`/api/ai/chats/${activeChatId}`)
      .then((r) => r.json())
      .then((data: { chat?: { messages: AiMessageLite[] } }) => setMessages(data.chat?.messages ?? []))
      .catch(() => setMessages([]))
  }, [activeChatId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, streamText])

  async function speak(text: string) {
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.slice(0, 2000) }),
      })
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      audioRef.current?.pause()
      const audio = new Audio(url)
      audioRef.current = audio
      audio.play()
    } catch {
      // Voice playback is best-effort.
    }
  }

  function toggleMic() {
    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike
      webkitSpeechRecognition?: new () => SpeechRecognitionLike
    }
    const Recognition = w.SpeechRecognition ?? w.webkitSpeechRecognition
    if (!Recognition) return
    const recognition = new Recognition()
    recognition.lang = 'en-US'
    recognition.continuous = false
    recognition.interimResults = false
    recognition.onresult = (event) => {
      let transcript = ''
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }
      setDraft((d) => (d ? `${d} ${transcript}` : transcript))
    }
    recognition.onend = () => setListening(false)
    recognition.onerror = () => setListening(false)
    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }

  async function send(text?: string) {
    const message = (text ?? draft).trim()
    if (!message || streaming) return
    setDraft('')
    setStreaming(true)
    setStreamText('')

    const optimistic: AiMessageLite = {
      id: `tmp-${Date.now()}`,
      role: 'user',
      content: message,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimistic])

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: activeChatId, message }),
      })

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? 'The AI is unavailable right now.')
      }

      const chatId = res.headers.get('X-Chat-Id')
      if (chatId && !activeChatId) {
        setActiveChatId(chatId)
        mutateChats()
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let full = ''
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        full += decoder.decode(value, { stream: true })
        setStreamText(full)
      }

      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: 'assistant', content: full, createdAt: new Date().toISOString() },
      ])
      setStreamText('')
      if (voiceEnabled && full.trim()) speak(full)
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: err instanceof Error ? err.message : 'Something went wrong.',
          createdAt: new Date().toISOString(),
        },
      ])
      setStreamText('')
    } finally {
      setStreaming(false)
    }
  }

  async function newChat() {
    const res = await fetch('/api/ai/chats', { method: 'POST' })
    if (res.ok) {
      const data = (await res.json()) as { chat: AiChatLite }
      mutateChats()
      setActiveChatId(data.chat.id)
      setMessages([])
    }
  }

  if (status === 'unauthenticated') {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-20 text-center">
        <Sparkles className="size-10 text-muted-foreground" aria-hidden />
        <h1 className="text-xl font-semibold">Ask your local AI guide</h1>
        <p className="text-sm text-muted-foreground">Sign in to chat about places, events and hangout plans.</p>
        <a href="/sign-in" className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          Sign in
        </a>
      </div>
    )
  }

  return (
    <div className="mx-auto grid h-[calc(100vh-3.5rem)] w-full max-w-6xl grid-cols-1 md:grid-cols-[280px_1fr]">
      {/* Chat history */}
      <aside className="hidden flex-col border-e border-border bg-card md:flex">
        <div className="flex items-center justify-between p-4">
          <h1 className="font-semibold">AI chats</h1>
          <Button size="icon" variant="ghost" aria-label="New chat" onClick={newChat}>
            <Plus className="size-4" aria-hidden />
          </Button>
        </div>
        <ul className="flex-1 overflow-y-auto">
          {chats.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setActiveChatId(c.id)}
                className={`w-full truncate px-4 py-3 text-start text-sm hover:bg-secondary ${
                  c.id === activeChatId ? 'bg-secondary font-medium' : ''
                }`}
              >
                {c.title}
              </button>
            </li>
          ))}
          {!chats.length && <li className="p-4 text-sm text-muted-foreground">No chats yet — ask something below.</li>}
        </ul>
      </aside>

      {/* Conversation */}
      <section className="flex min-h-0 flex-col">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" aria-hidden />
            <h2 className="font-semibold">Local guide AI</h2>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setVoiceEnabled((v) => !v)
              if (voiceEnabled) audioRef.current?.pause()
            }}
            aria-pressed={voiceEnabled}
          >
            {voiceEnabled ? <Volume2 className="size-4" aria-hidden /> : <VolumeX className="size-4" aria-hidden />}
            {voiceEnabled ? 'Voice on' : 'Voice off'}
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 && !streamText ? (
            <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-10 text-center">
              <Sparkles className="size-10 text-primary" aria-hidden />
              <p className="text-sm text-muted-foreground">
                Ask about places, amenities, events or get a hangout plan. Try one of these:
              </p>
              <ul className="flex flex-col gap-2">
                {SUGGESTED_PROMPTS.map((p) => (
                  <li key={p}>
                    <button
                      type="button"
                      onClick={() => send(p)}
                      className="w-full rounded-2xl border border-border bg-card px-4 py-2.5 text-start text-sm hover:bg-secondary"
                    >
                      {p}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <ul className="mx-auto flex max-w-2xl flex-col gap-3">
              {messages.map((m) => (
                <li
                  key={m.id}
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                    m.role === 'user'
                      ? 'self-end rounded-br-sm bg-primary text-primary-foreground'
                      : 'self-start rounded-tl-sm bg-secondary'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </li>
              ))}
              {streamText && (
                <li className="max-w-[85%] self-start rounded-2xl rounded-tl-sm bg-secondary px-4 py-2.5 text-sm">
                  <p className="whitespace-pre-wrap">
                    {streamText}
                    <span className="ms-0.5 inline-block h-4 w-1.5 animate-pulse bg-muted-foreground align-middle" aria-hidden />
                  </p>
                </li>
              )}
              <div ref={bottomRef} />
            </ul>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            send()
          }}
          className="mx-auto flex w-full max-w-2xl items-end gap-2 p-3"
        >
          <Button
            type="button"
            size="icon"
            variant={listening ? 'default' : 'outline'}
            aria-label={listening ? 'Stop listening' : 'Speak your message'}
            aria-pressed={listening}
            onClick={toggleMic}
            className="shrink-0 rounded-full"
          >
            {listening ? <MicOff className="size-4" aria-hidden /> : <Mic className="size-4" aria-hidden />}
          </Button>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                send()
              }
            }}
            rows={1}
            placeholder="Ask about places, events or plans..."
            aria-label="Message the AI guide"
            className="max-h-40 min-h-11 flex-1 resize-none"
          />
          <Button type="submit" size="icon" aria-label="Send message" disabled={streaming || !draft.trim()} className="shrink-0 rounded-full">
            {streaming ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
          </Button>
        </form>
      </section>
    </div>
  )
}
