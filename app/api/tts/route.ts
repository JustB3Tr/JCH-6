import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getUserId } from '@/lib/api-auth'

const ttsSchema = z.object({
  text: z.string().trim().min(1).max(2000),
  voiceId: z.string().trim().max(60).optional(),
})

// ElevenLabs text-to-speech proxy. The API key stays server-side.
export async function POST(request: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.ELEVENLABS_API_KEY) {
    return NextResponse.json({ error: 'Voice mode is not configured.' }, { status: 503 })
  }

  const parsed = ttsSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid text.' }, { status: 400 })

  const voiceId = parsed.data.voiceId || '21m00Tcm4TlvDq8ikWAM' // Rachel
  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text: parsed.data.text,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    })
    if (!res.ok || !res.body) {
      return NextResponse.json({ error: 'Text-to-speech failed.' }, { status: 502 })
    }
    return new Response(res.body, { headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'Text-to-speech service unreachable.' }, { status: 502 })
  }
}
