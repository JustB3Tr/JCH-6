import { NextResponse } from 'next/server'
import { ZodError, type ZodType } from 'zod'
import { auth } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

export const notFound = (what = 'That') => new ApiError(404, `${what} could not be found.`)
export const forbidden = (message = 'You do not have access to this.') => new ApiError(403, message)

export async function getUserId(): Promise<string | null> {
  const session = await auth()
  return session?.user?.id ?? null
}

export async function requireUserId(): Promise<string> {
  const userId = await getUserId()
  if (!userId) throw new ApiError(401, 'Sign in to continue.')
  return userId
}

export async function readJson<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw new ApiError(400, 'The request body must be valid JSON.')
  }
  return schema.parse(body)
}

export function clientIp(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}

/** Throws 429 once `key` exceeds `limit` calls within `windowMs`. */
export function throttle(key: string, limit: number, windowMs = 60_000) {
  if (!rateLimit(key, limit, windowMs)) {
    throw new ApiError(429, 'Too many requests. Give it a minute and try again.')
  }
}

function errorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  if (error instanceof ZodError) {
    const issue = error.issues[0]
    const field = issue?.path.join('.')
    const message = issue ? (field ? `${field}: ${issue.message}` : issue.message) : 'Invalid request.'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const code = (error as { code?: string } | null)?.code
  if (code === 'P2025') return NextResponse.json({ error: 'That could not be found.' }, { status: 404 })
  if (code === 'P2002') return NextResponse.json({ error: 'That already exists.' }, { status: 409 })
  if (code === 'P2003') return NextResponse.json({ error: 'A referenced record no longer exists.' }, { status: 400 })

  console.error('[api] Unhandled error:', error)
  return NextResponse.json({ error: 'Something went wrong on our side.' }, { status: 500 })
}

type RouteContext<P> = { params: Promise<P> }

/**
 * Wraps a route handler so every route shares the same error contract:
 * `{ error: string }` with a meaningful status. Handlers return plain data
 * (sent as JSON) or a Response, and throw ApiError / ZodError to fail.
 */
export function handle<P = Record<string, never>>(
  fn: (request: Request, params: P) => Promise<Response | object>,
) {
  return async (request: Request, context: RouteContext<P>): Promise<Response> => {
    try {
      const result = await fn(request, await context.params)
      return result instanceof Response ? result : NextResponse.json(result)
    } catch (error) {
      return errorResponse(error)
    }
  }
}

export function created(data: object) {
  return NextResponse.json(data, { status: 201 })
}

export function listParam(value: string | null): string[] {
  return value
    ? value
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean)
    : []
}

export function intParam(value: string | null, fallback: number, min: number, max: number) {
  const parsed = value === null ? NaN : Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback
}
