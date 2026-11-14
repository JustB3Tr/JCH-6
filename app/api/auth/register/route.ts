import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { ApiError, clientIp, created, handle, readJson, throttle } from '@/lib/api'
import { startSession } from '@/lib/auth-session'

const registerSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().pipe(z.email().max(200)),
  password: z.string().min(8).max(200),
  isPrivate: z.boolean().default(false),
})

const EMAIL_TAKEN = 'An account with this email already exists. Try signing in instead.'

export const POST = handle(async (request) => {
  throttle(`register:${clientIp(request)}`, 5, 10 * 60_000)

  const parsed = registerSchema.safeParse(await readJson(request, z.unknown()))
  if (!parsed.success) {
    throw new ApiError(400, 'Enter a name, a valid email, and a password of at least 8 characters.')
  }
  const { name, email, password, isPrivate } = parsed.data

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (existing) throw new ApiError(409, EMAIL_TAKEN)

  const passwordHash = await bcrypt.hash(password, 10)
  let userId: string
  try {
    const user = await prisma.user.create({ data: { name, email, passwordHash, isPrivate }, select: { id: true } })
    userId = user.id
  } catch (error) {
    // Lost a race against a concurrent signup for the same address.
    if ((error as { code?: string }).code === 'P2002') throw new ApiError(409, EMAIL_TAKEN)
    throw error
  }

  // Sign the new account in straight away so the user never has to repeat
  // their password on a second step.
  const session = await startSession(email, password)
  if (!session.ok) throw new ApiError(session.status, session.error)

  return created({ id: userId, ok: true })
})
