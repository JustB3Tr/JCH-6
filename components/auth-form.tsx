'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function AuthForm({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isSignUp = mode === 'sign-up'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      // Both endpoints verify the password server-side and set the session
      // cookie in the same response, so there is no second sign-in step.
      const res = await fetch(isSignUp ? '/api/auth/register' : '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isSignUp ? { name, email, password } : { email, password }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? 'Something went wrong. Please try again.')
      }

      router.push('/')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {isSignUp && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
            placeholder="Alex Rivera"
          />
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          placeholder="you@example.com"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={isSignUp ? 8 : undefined}
          autoComplete={isSignUp ? 'new-password' : 'current-password'}
          placeholder={isSignUp ? 'At least 8 characters' : 'Your password'}
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" disabled={loading} className="w-full">
        {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {isSignUp ? 'Create account' : 'Sign in'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {isSignUp ? (
          <>
            Already have an account?{' '}
            <Link href="/sign-in" className="font-medium text-primary underline-offset-4 hover:underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New here?{' '}
            <Link href="/sign-up" className="font-medium text-primary underline-offset-4 hover:underline">
              Create an account
            </Link>
          </>
        )}
      </p>
    </form>
  )
}
