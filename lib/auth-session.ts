import { AuthError } from 'next-auth'
import { signIn } from '@/lib/auth'

export type SessionResult =
  | { ok: true }
  | { ok: false; error: string; status: number }

/**
 * Verifies credentials and starts a NextAuth session on the current response.
 *
 * This runs entirely on the server: the session cookie is written by NextAuth
 * itself, so the client never has to drive a CSRF token / provider lookup /
 * callback round trip. Failures are returned as a discriminated result rather
 * than thrown, so route handlers can map them onto HTTP status codes.
 */
export async function startSession(email: string, password: string): Promise<SessionResult> {
  try {
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
      redirectTo: '/',
    })

    const url = typeof result === 'string' ? result : ''
    if (!url || url.includes('error=')) {
      const code = url ? new URL(url, 'http://localhost').searchParams.get('error') : null
      if (code === 'CredentialsSignin') {
        return { ok: false, error: 'Wrong email or password.', status: 401 }
      }
      return { ok: false, error: 'Could not sign you in. Please try again.', status: 401 }
    }

    return { ok: true }
  } catch (err) {
    // NextAuth raises CredentialsSignin when the provider rejects the password.
    const type = err instanceof AuthError ? err.type : (err as { type?: string } | null)?.type
    if (type === 'CredentialsSignin') {
      return { ok: false, error: 'Wrong email or password.', status: 401 }
    }
    return { ok: false, error: 'Could not sign you in. Please try again.', status: 500 }
  }
}
