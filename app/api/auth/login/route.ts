import { z } from 'zod'
import { ApiError, clientIp, handle, readJson, throttle } from '@/lib/api'
import { startSession } from '@/lib/auth-session'

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(200)),
  password: z.string().min(1).max(200),
})

export const POST = handle(async (request) => {
  throttle(`login:${clientIp(request)}`, 10)

  const parsed = loginSchema.safeParse(await readJson(request, z.unknown()))
  if (!parsed.success) throw new ApiError(400, 'Enter your email and password.')

  const session = await startSession(parsed.data.email, parsed.data.password)
  if (!session.ok) throw new ApiError(session.status, session.error)

  return { ok: true }
})
