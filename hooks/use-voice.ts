'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type SpeechRecognitionResultLike = { isFinal: boolean; 0: { transcript: string } }
type SpeechRecognitionEventLike = { resultIndex: number; results: ArrayLike<SpeechRecognitionResultLike> }
type SpeechRecognitionLike = {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const scope = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null
}

function canRecordAudio() {
  return (
    typeof window !== 'undefined' &&
    typeof MediaRecorder !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  )
}

function pickMimeType() {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') return ''
  for (const type of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']) {
    if (MediaRecorder.isTypeSupported(type)) return type
  }
  return ''
}

/** Strips the light markdown the guide writes so it reads naturally aloud. */
export function toSpeech(text: string) {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/^\s*[-•*]\s+/gm, '')
    .replace(/https?:\/\/\S+/g, 'the link in the chat')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 2000)
}

/**
 * Voice for the guide. Replies are read aloud by ElevenLabs through the
 * server-side `/api/tts` proxy, so the API key never reaches the browser.
 * Dictation uses the browser's speech recognition where it exists and falls
 * back to recording a clip for ElevenLabs Scribe everywhere else.
 */
export function useVoice() {
  const [speakingId, setSpeakingId] = useState<string | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const [listening, setListening] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [canListen, setCanListen] = useState(false)

  const audio = useRef<HTMLAudioElement | null>(null)
  const objectUrl = useRef<string | null>(null)
  const request = useRef<AbortController | null>(null)
  const recognition = useRef<SpeechRecognitionLike | null>(null)
  const recorder = useRef<MediaRecorder | null>(null)
  const recorderTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setCanListen(getRecognitionCtor() !== null || canRecordAudio())
  }, [])

  const releaseAudio = useCallback(() => {
    audio.current?.pause()
    audio.current = null
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current)
    objectUrl.current = null
  }, [])

  const stopSpeaking = useCallback(() => {
    request.current?.abort()
    request.current = null
    releaseAudio()
    setSpeakingId(null)
    setLoadingId(null)
  }, [releaseAudio])

  const speak = useCallback(
    async (id: string, text: string) => {
      const spoken = toSpeech(text)
      if (!spoken) return
      stopSpeaking()
      setVoiceError(null)
      setLoadingId(id)

      const controller = new AbortController()
      request.current = controller
      try {
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: spoken }),
          signal: controller.signal,
        })
        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as { error?: string } | null
          throw new Error(data?.error ?? 'Voice is not available right now.')
        }
        const blob = await response.blob()
        if (controller.signal.aborted) return

        const url = URL.createObjectURL(blob)
        objectUrl.current = url
        const player = new Audio(url)
        audio.current = player
        player.onended = () => {
          releaseAudio()
          setSpeakingId(null)
        }
        setLoadingId(null)
        setSpeakingId(id)
        await player.play()
      } catch (error) {
        if ((error as Error).name === 'AbortError') return
        setVoiceError(error instanceof Error ? error.message : 'Voice is not available right now.')
        releaseAudio()
        setSpeakingId(null)
        setLoadingId(null)
      } finally {
        if (request.current === controller) request.current = null
      }
    },
    [releaseAudio, stopSpeaking],
  )

  const stopListening = useCallback(() => {
    if (recognition.current) {
      recognition.current.stop()
      return
    }
    if (recorder.current && recorder.current.state !== 'inactive') recorder.current.stop()
  }, [])

  const startRecording = useCallback(async (onFinal: (transcript: string) => void) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = pickMimeType()
      const media = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      const chunks: Blob[] = []
      recorder.current = media

      media.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data)
      }
      media.onstop = async () => {
        try {
          if (recorderTimer.current) clearTimeout(recorderTimer.current)
          recorderTimer.current = null
          stream.getTracks().forEach((track) => track.stop())
          recorder.current = null
          setListening(false)

          const blob = new Blob(chunks, { type: media.mimeType || 'audio/webm' })
          if (blob.size < 1200) return

          setTranscribing(true)
          const form = new FormData()
          form.append('audio', blob, 'utterance.webm')
          const response = await fetch('/api/stt', { method: 'POST', body: form })
          if (!response.ok) {
            const data = (await response.json().catch(() => null)) as { error?: string } | null
            throw new Error(data?.error ?? 'Could not hear that. Try again.')
          }
          const data = (await response.json()) as { text?: string }
          const transcript = data.text?.trim()
          if (transcript) onFinal(transcript)
          else setVoiceError('I did not catch that. Try again a little closer to the mic.')
        } catch (error) {
          setVoiceError(error instanceof Error ? error.message : 'Could not hear that. Try again.')
        } finally {
          setTranscribing(false)
        }
      }

      setVoiceError(null)
      setListening(true)
      media.start()
      recorderTimer.current = setTimeout(() => {
        if (media.state === 'recording') media.stop()
      }, 20_000)
    } catch {
      setVoiceError('Microphone access is blocked. Allow it in your browser to talk to the guide.')
      setListening(false)
    }
  }, [])

  const listen = useCallback(
    (onFinal: (transcript: string) => void, onInterim?: (transcript: string) => void) => {
      if (recognition.current || recorder.current) {
        stopListening()
        return
      }
      stopSpeaking()
      setVoiceError(null)

      const Ctor = getRecognitionCtor()
      if (!Ctor) {
        if (canRecordAudio()) void startRecording(onFinal)
        return
      }

      const instance = new Ctor()
      instance.lang = 'en-US'
      instance.interimResults = true
      instance.continuous = false
      let finalText = ''
      instance.onresult = (event) => {
        let interim = ''
        for (let index = event.resultIndex; index < event.results.length; index++) {
          const result = event.results[index]
          if (result.isFinal) finalText += result[0].transcript
          else interim += result[0].transcript
        }
        onInterim?.((finalText + interim).trim())
      }
      instance.onerror = (event) => {
        if (event.error !== 'aborted' && event.error !== 'no-speech') {
          setVoiceError(
            event.error === 'not-allowed'
              ? 'Microphone access is blocked. Allow it in your browser to talk to the guide.'
              : 'The microphone stopped unexpectedly. Try again.',
          )
        }
      }
      instance.onend = () => {
        recognition.current = null
        setListening(false)
        if (finalText.trim()) onFinal(finalText.trim())
      }
      recognition.current = instance
      setListening(true)
      try {
        instance.start()
      } catch {
        recognition.current = null
        setListening(false)
        setVoiceError('The microphone is busy. Try again in a moment.')
      }
    },
    [startRecording, stopListening, stopSpeaking],
  )

  useEffect(
    () => () => {
      request.current?.abort()
      recognition.current?.abort()
      if (recorderTimer.current) clearTimeout(recorderTimer.current)
      if (recorder.current && recorder.current.state !== 'inactive') recorder.current.stop()
      releaseAudio()
    },
    [releaseAudio],
  )

  return {
    speak,
    stopSpeaking,
    speakingId,
    loadingId,
    voiceError,
    listen,
    stopListening,
    listening,
    transcribing,
    canListen,
  }
}
