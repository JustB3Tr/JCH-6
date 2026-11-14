import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { startSession } from '@/lib/auth-session'

const registerSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(200),
  password: z.string().min(8).max(200),
})

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Enter a name, a valid email, and a password of at least 8 characters.' },
      { status: 400 },
    )
  }

  const email = parsed.data.email.toLowerCase()
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json(
      { error: 'An account with this email already exists. Try signing in instead.' },
      { status: 409 },
    )
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10)

  let user
  try {
    user = await prisma.user.create({
      data: { name: parsed.data.name, email, passwordHash },
    })
  } catch {
    // Lost a race against a concurrent signup for the same address.
    return NextResponse.json(
      { error: 'An account with this email already exists. Try signing in instead.' },
      { status: 409 },
    )
  }

  // Sign the new account in straight away so the user never has to repeat
  // their password on a second step.
  const session = await startSession(email, parsed.data.password)
  if (!session.ok) {
    return NextResponse.json({ error: session.error, id: user.id }, { status: session.status })
  }

  return NextResponse.json({ id: user.id, ok: true }, { status: 201 })
}
