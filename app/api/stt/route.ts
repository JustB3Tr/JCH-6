import { z } from 'zod'
import { ApiError, clientIp, getUserId, handle, throttle } from '@/lib/api'

const MAX_AUDIO_BYTES = 12 * 1024 * 1024

const sttResponseSchema = z.object({
  text: z.string().optional(),
  language_code: z.string().optional(),
})

/**
 * POST /api/stt
 * Transcribes spoken user audio with ElevenLabs Scribe (`scribe_v1`) so live
 * voice conversations work reliably across every browser without exposing
 * `ELEVENLABS_API_KEY`.
 */
export const POST = handle(async (request) => {
  const userId = await getUserId()
  const actor = userId ?? `ip:${clientIp(request)}`
  throttle(`stt:${actor}`, 30)

  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) throw new ApiError(503, 'ElevenLabs voice is not configured.')

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    throw new ApiError(400, 'Expected multipart audio form data.')
  }

  const audio = formData.get('audio')
  if (!(audio instanceof Blob) || audio.size === 0) {
    throw new ApiError(400, 'No audio clip was received.')
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    throw new ApiError(413, 'That voice recording is too long. Try a shorter message.')
  }

  const upstreamForm = new FormData()
  upstreamForm.append('model_id', 'scribe_v1')
  upstreamForm.append('language_code', 'eng')
  upstreamForm.append('tag_audio_events', 'false')
  upstreamForm.append('file', audio, 'utterance.webm')

  let upstream: Response
  try {
    upstream = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: { 'xi-api-key': apiKey },
      body: upstreamForm,
      signal: AbortSignal.timeout(20_000),
    })
  } catch {
    throw new ApiError(502, 'Could not reach ElevenLabs speech recognition.')
  }

  if (!upstream.ok) {
    throw new ApiError(502, 'Could not transcribe that audio clip.')
  }

  const raw = sttResponseSchema.safeParse(await upstream.json().catch(() => ({})))
  const cleaned = (raw.data?.text ?? '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return {
    text: cleaned,
    languageCode: raw.data?.language_code ?? 'eng',
  }
})
