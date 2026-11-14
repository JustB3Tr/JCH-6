import { z } from 'zod'
import { ApiError, handle, readJson, requireUserId, throttle } from '@/lib/api'

const DEFAULT_VOICE = '21m00Tcm4TlvDq8ikWAM'

const ttsSchema = z.object({
  text: z.string().trim().min(1).max(2000),
  voiceId: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9]{10,40}$/)
    .optional(),
})

// ElevenLabs text-to-speech proxy. The API key stays server-side.
export const POST = handle(async (request) => {
  const userId = await requireUserId()
  throttle(`tts:${userId}`, 15)

  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) throw new ApiError(503, 'Voice mode is not configured.')

  const { text, voiceId } = await readJson(request, ttsSchema)

  let upstream: Response
  try {
    upstream = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId ?? DEFAULT_VOICE}`, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
      signal: AbortSignal.timeout(30_000),
    })
  } catch {
    throw new ApiError(502, 'The voice service could not be reached.')
  }
  if (!upstream.ok || !upstream.body) throw new ApiError(502, 'The voice service could not read that aloud.')

  return new Response(upstream.body, { headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' } })
})
