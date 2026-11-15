import { z } from 'zod'
import { ApiError, clientIp, getUserId, handle, readJson, throttle } from '@/lib/api'
import type { ConversationalVoice } from '@/lib/types'

export const OUTLY_VOICES: ConversationalVoice[] = [
  { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica', persona: 'Warm & bright', accent: 'American' },
  { id: 'SAz9YHcvj6GT2YYXdXww', name: 'River', persona: 'Calm & relaxed', accent: 'American' },
  { id: 'iP95p4xoKVk53GoZ742B', name: 'Chris', persona: 'Down-to-earth', accent: 'American' },
  { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger', persona: 'Laid-back & resonant', accent: 'American' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', persona: 'Clear & reassuring', accent: 'American' },
]

const DEFAULT_VOICE = OUTLY_VOICES[0].id

const ttsSchema = z.object({
  text: z.string().trim().min(1).max(2000),
  voiceId: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9]{10,40}$/)
    .optional(),
})

/** GET /api/tts — returns available ElevenLabs conversational voices for Outly. */
export const GET = handle(async () => {
  return {
    configured: Boolean(process.env.ELEVENLABS_API_KEY),
    defaultVoiceId: DEFAULT_VOICE,
    voices: OUTLY_VOICES,
  }
})

/**
 * POST /api/tts
 * Ultra-low-latency streaming ElevenLabs speech synthesis (`eleven_flash_v2_5`)
 * for conversational voice mode and reply read-aloud.
 */
export const POST = handle(async (request) => {
  const userId = await getUserId()
  const actor = userId ?? `ip:${clientIp(request)}`
  throttle(`tts:${actor}`, 28)

  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) throw new ApiError(503, 'ElevenLabs voice mode is not configured.')

  const { text, voiceId } = await readJson(request, ttsSchema)
  const selectedVoice = voiceId ?? DEFAULT_VOICE

  let upstream: Response
  try {
    upstream = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoice}/stream?optimize_streaming_latency=3&output_format=mp3_44100_64`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_flash_v2_5',
          voice_settings: {
            stability: 0.45,
            similarity_boost: 0.78,
            style: 0.14,
            use_speaker_boost: true,
          },
        }),
        signal: AbortSignal.timeout(25_000),
      },
    )
  } catch {
    throw new ApiError(502, 'The voice service could not be reached.')
  }
  if (!upstream.ok || !upstream.body) throw new ApiError(502, 'The voice service could not read that aloud.')

  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'no-store',
    },
  })
})
