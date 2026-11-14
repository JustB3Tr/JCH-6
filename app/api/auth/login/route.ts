import { NextResponse } from 'next/server'
import { z } from 'zod'
import { startSession } from '@/lib/auth-session'

const loginSchema = z.object({
  email: z.string().trim().email().max(200),
  password: z.string().min(1).max(200),
})

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Enter your email and password.' }, { status: 400 })
  }

  const session = await startSession(parsed.data.email.toLowerCase(), parsed.data.password)
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status })
  }

  return NextResponse.json({ ok: true })
}
