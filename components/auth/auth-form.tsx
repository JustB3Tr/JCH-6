'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2, MapPin } from 'lucide-react'

export function AuthForm({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const isSignUp = mode === 'sign-up'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      // Both endpoints verify the password server-side and set the session
      // cookie in the same response, so there is no second sign-in step.
      const response = await fetch(isSignUp ? '/api/auth/register' : '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isSignUp ? { name, email, password } : { email, password }),
      })

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(data?.error ?? 'Something went wrong. Please try again.')
      }

      // A full load, not a client-side push: the session cookie was just
      // written by this response, and SessionProvider would otherwise keep
      // serving the signed-out session it fetched before sign-in.
      window.location.assign('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(120%_80%_at_20%_0%,#dbeafe_0%,transparent_55%),radial-gradient(100%_70%_at_90%_10%,#dcfce7_0%,transparent_50%),radial-gradient(90%_60%_at_50%_100%,#fae8ff_0%,transparent_60%)] dark:bg-[radial-gradient(120%_80%_at_20%_0%,#0b2a4a_0%,transparent_55%),radial-gradient(100%_70%_at_90%_10%,#0d2f22_0%,transparent_50%),radial-gradient(90%_60%_at_50%_100%,#2a1038_0%,transparent_60%)]"
      />

      <div className="w-full max-w-[400px]">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="glass flex size-14 items-center justify-center rounded-[20px] text-primary">
            <MapPin className="size-7" aria-hidden />
          </span>
          <h1 className="mt-4 text-[26px] font-semibold tracking-[-0.03em]">
            {isSignUp ? 'Join Hangout' : 'Welcome back'}
          </h1>
          <p className="mt-1 max-w-[30ch] text-[13.5px] leading-relaxed text-muted-foreground">
            {isSignUp
              ? 'A map of the places worth meeting at, and the people worth meeting there.'
              : 'Sign in to see your saved spots, plans and groups.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass glass-strong rounded-[26px] p-5">
          {isSignUp && (
            <Field label="Name" htmlFor="name">
              <input
                id="name"
                name="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                autoComplete="name"
                placeholder="Alex Rivera"
                className="h-11 w-full rounded-2xl bg-foreground/[0.06] px-3.5 text-[15px] outline-none focus:ring-2 focus:ring-primary/40"
              />
            </Field>
          )}

          <Field label="Email" htmlFor="email">
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="h-11 w-full rounded-2xl bg-foreground/[0.06] px-3.5 text-[15px] outline-none focus:ring-2 focus:ring-primary/40"
            />
          </Field>

          <Field label="Password" htmlFor="password">
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={isSignUp ? 8 : undefined}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              placeholder={isSignUp ? 'At least 8 characters' : 'Your password'}
              className="h-11 w-full rounded-2xl bg-foreground/[0.06] px-3.5 text-[15px] outline-none focus:ring-2 focus:ring-primary/40"
            />
          </Field>

          {error && (
            <p role="alert" className="mt-3 rounded-xl bg-destructive/10 px-3 py-2 text-[12.5px] text-destructive">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="glass-press mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-[15px] font-semibold text-primary-foreground disabled:opacity-60"
          >
            {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {isSignUp ? 'Create account' : 'Sign in'}
          </button>

          <p className="mt-3 text-center text-[12.5px] text-muted-foreground">
            {isSignUp ? (
              <>
                Already have an account?{' '}
                <Link href="/sign-in" className="font-semibold text-primary">
                  Sign in
                </Link>
              </>
            ) : (
              <>
                New here?{' '}
                <Link href="/sign-up" className="font-semibold text-primary">
                  Create an account
                </Link>
              </>
            )}
          </p>
        </form>

        <p className="mt-4 text-center text-[12px] text-muted-foreground">
          Try the demo: <span className="font-medium text-foreground">demo@hangout.app</span> / demo1234
        </p>
        <p className="mt-1 text-center text-[12px]">
          <Link href="/" className="font-medium text-muted-foreground underline-offset-4 hover:underline">
            Browse the map without an account
          </Link>
        </p>
      </div>
    </div>
  )
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <label htmlFor={htmlFor} className="mb-1 block text-[12px] font-medium text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  )
}
