'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Loader2, Trees } from 'lucide-react'
import { api, errorMessage } from '@/lib/client'
import { cn } from '@/lib/utils'
import { AuthFrame, fieldClass, primaryButtonClass } from '@/components/auth/auth-frame'

export function AuthForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      // The login route verifies the password server-side and sets the
      // session cookie in the same response.
      await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
      // A full load, not a client-side push: SessionProvider would otherwise
      // keep serving the signed-out session it fetched before sign-in.
      window.location.assign('/map')
    } catch (err) {
      setError(errorMessage(err))
      setLoading(false)
    }
  }

  return (
    <AuthFrame>
      <div className="flex flex-col items-center text-center">
        <Link
          href="/"
          aria-label="Back to home"
          className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm"
        >
          <Trees className="size-7" aria-hidden />
        </Link>
        <h1 className="mt-5 font-heading text-3xl font-bold text-foreground">Welcome back</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">Sign in to see your saved spots, plans and groups.</p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8">
        <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-foreground">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          autoComplete="email"
          placeholder="you@example.com"
          className={fieldClass}
        />

        <label htmlFor="password" className="mb-1.5 mt-4 block text-sm font-semibold text-foreground">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          autoComplete="current-password"
          placeholder="Your password"
          className={fieldClass}
        />

        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className={cn(primaryButtonClass, 'mt-7')}>
          {loading && <Loader2 className="size-5 animate-spin" aria-hidden />}
          Sign in
          {!loading && <ArrowRight className="size-5" aria-hidden />}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        New here?{' '}
        <Link href="/sign-up" className="font-bold text-primary hover:text-primary-hover">
          Create a free profile
        </Link>
      </p>
      <div className="mt-6 rounded-2xl bg-muted px-4 py-3 text-center text-xs text-muted-foreground">
        Try the demo: <span className="font-semibold text-foreground">demo@hangout.app</span> / demo1234
        <span className="mx-2" aria-hidden>
          ·
        </span>
        <Link href="/map" className="font-semibold text-primary underline-offset-4 hover:underline">
          Browse without an account
        </Link>
      </div>
    </AuthFrame>
  )
}
