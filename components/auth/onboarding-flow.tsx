'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Coffee,
  Dog,
  Dumbbell,
  Footprints,
  Loader2,
  LocateFixed,
  MapPin,
  Mountain,
  Waves,
  X,
} from 'lucide-react'
import { api, errorMessage } from '@/lib/client'
import type { PlaceType } from '@/lib/constants'
import type { PlaceSummary } from '@/lib/types'
import { cn } from '@/lib/utils'
import { AuthFrame, StepProgress, fieldClass, primaryButtonClass } from '@/components/auth/auth-frame'

const INTERESTS: { id: string; title: string; body: string; icon: typeof Coffee; type: PlaceType }[] = [
  { id: 'walking', title: 'Walking & Strolls', body: 'Relaxed pace & fresh air', icon: Footprints, type: 'park' },
  { id: 'coffee', title: 'Coffee & Chat', body: 'Casual sips & conversation', icon: Coffee, type: 'cafe' },
  { id: 'games', title: 'Pickleball & Games', body: 'Active play & friendly matches', icon: Dumbbell, type: 'sports' },
  { id: 'dogs', title: 'Dog Walks', body: 'Pups welcome & group trails', icon: Dog, type: 'park' },
  { id: 'hikes', title: 'Hikes & Views', body: 'Hillside trails & big skies', icon: Mountain, type: 'trail' },
  { id: 'beach', title: 'Beach Days', body: 'Sand, sun & boardwalks', icon: Waves, type: 'beach' },
]

const SUGGESTED_AREAS = ['Silver Lake', 'Pasadena', 'Santa Monica', 'Long Beach', 'Echo Park', 'Culver City']

const TOTAL_STEPS = 3

export function OnboardingFlow() {
  const [step, setStep] = useState(1)
  const [interests, setInterests] = useState<string[]>([])
  const [area, setArea] = useState('')
  const [locating, setLocating] = useState(false)
  const [locationNote, setLocationNote] = useState<string | null>(null)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const next = () => setStep((current) => Math.min(current + 1, TOTAL_STEPS))
  const back = () => setStep((current) => Math.max(current - 1, 1))

  function toggleInterest(id: string) {
    setInterests((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationNote('This browser cannot share your location. Type your neighborhood instead.')
      return
    }
    setLocating(true)
    setLocationNote(null)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const near = `${position.coords.latitude},${position.coords.longitude}`
          const { places } = await api<{ places: PlaceSummary[] }>(`/api/places?near=${near}&limit=5`)
          const nearestArea = places.find((place) => place.area)?.area
          if (nearestArea) setArea(nearestArea.slice(0, 60))
          else setLocationNote('We could not name your neighborhood. Type it in instead.')
        } catch (err) {
          setLocationNote(errorMessage(err))
        } finally {
          setLocating(false)
        }
      },
      () => {
        setLocating(false)
        setLocationNote('Location is off. Turn it on in your browser, or type your neighborhood.')
      },
      { enableHighAccuracy: false, timeout: 8000 },
    )
  }

  async function createAccount(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const name = `${firstName.trim()} ${lastName.trim()}`.trim()
      // Registration verifies the password server-side and sets the session
      // cookie in the same response, so the profile update below is signed in.
      await api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      })
      if (area.trim()) {
        await api('/api/me', { method: 'PATCH', body: JSON.stringify({ homeArea: area.trim() }) }).catch(() => null)
      }

      const firstType = INTERESTS.find((interest) => interests.includes(interest.id))?.type
      // A full load so the session provider picks up the new cookie.
      window.location.assign(firstType ? `/map?type=${firstType}` : '/map')
    } catch (err) {
      setError(errorMessage(err))
      setSubmitting(false)
    }
  }

  const header = (
    <div>
      <div className="flex items-center justify-between">
        {step > 1 ? (
          <button
            type="button"
            onClick={back}
            aria-label="Previous step"
            className="glass-press -ml-2 flex size-10 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="size-5" aria-hidden />
          </button>
        ) : (
          <Link
            href="/"
            aria-label="Back to home"
            className="glass-press -ml-2 flex size-10 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="size-5" aria-hidden />
          </Link>
        )}
        <p
          className={cn(
            'text-xs font-bold uppercase tracking-[0.2em]',
            step === TOTAL_STEPS ? 'text-primary' : 'text-foreground',
          )}
        >
          Step {step} of {TOTAL_STEPS}
          {step === TOTAL_STEPS ? ': final step' : ''}
        </p>
        {step < TOTAL_STEPS ? (
          <button
            type="button"
            onClick={next}
            className="rounded-lg px-2 py-1 text-sm text-muted-foreground hover:text-foreground"
          >
            Skip
          </button>
        ) : (
          <Link href="/map" className="rounded-lg px-2 py-1 text-sm text-muted-foreground hover:text-foreground">
            Skip
          </Link>
        )}
      </div>
      <StepProgress step={step} total={TOTAL_STEPS} />
    </div>
  )

  if (step === 1) {
    return (
      <AuthFrame>
        {header}
        <div key="interests" className="animate-rise">
          <h1 className="mt-8 text-center font-heading text-3xl font-bold text-foreground">
            What do you like to do outside?
          </h1>
          <p className="mt-1 text-center text-[15px] text-muted-foreground">Choose what sounds fun.</p>

          <ul className="mt-7 grid grid-cols-2 gap-3" aria-label="Outdoor interests">
            {INTERESTS.map((interest) => {
              const selected = interests.includes(interest.id)
              return (
                <li key={interest.id}>
                  <button
                    type="button"
                    onClick={() => toggleInterest(interest.id)}
                    aria-pressed={selected}
                    className={cn(
                      'glass-press flex h-full w-full flex-col items-start rounded-2xl border-2 p-4 text-left transition-colors',
                      selected
                        ? 'border-primary/60 bg-background'
                        : 'border-border bg-card hover:border-primary/30',
                    )}
                  >
                    <span className="flex w-full items-start justify-between">
                      <interest.icon
                        className={cn('size-6', selected ? 'text-primary' : 'text-tertiary')}
                        aria-hidden
                      />
                      <span
                        aria-hidden
                        className={cn(
                          'flex size-6 items-center justify-center rounded-full transition-colors',
                          selected ? 'bg-primary text-primary-foreground' : 'bg-muted',
                        )}
                      >
                        {selected && <Check className="size-3.5" strokeWidth={3} />}
                      </span>
                    </span>
                    <span className="mt-4 font-heading text-[17px] font-bold leading-snug text-foreground">
                      {interest.title}
                    </span>
                    <span className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{interest.body}</span>
                  </button>
                </li>
              )
            })}
          </ul>

          <button type="button" onClick={next} className={cn(primaryButtonClass, 'mt-8')}>
            Next
            <ArrowRight className="size-5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={next}
            className="mx-auto mt-4 block text-sm text-muted-foreground hover:text-foreground"
          >
            Skip for now
          </button>
        </div>
      </AuthFrame>
    )
  }

  if (step === 2) {
    return (
      <AuthFrame>
        {header}
        <div key="location" className="animate-rise">
          <h1 className="mt-8 text-center font-heading text-3xl font-bold text-foreground">Where are you located?</h1>
          <p className="mt-1 text-center text-[15px] text-muted-foreground">To find parks and walks near you.</p>

          <label htmlFor="home-area" className="sr-only">
            Your neighborhood
          </label>
          <div className="relative mt-7">
            <MapPin className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-[#c0533e]" aria-hidden />
            <input
              id="home-area"
              value={area}
              onChange={(event) => setArea(event.target.value.slice(0, 60))}
              placeholder="Your neighborhood, e.g. Highland Park"
              autoComplete="address-level2"
              className={cn(fieldClass, 'h-14 pl-12 pr-12')}
            />
            {area && (
              <button
                type="button"
                onClick={() => setArea('')}
                aria-label="Clear neighborhood"
                className="absolute right-4 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" aria-hidden />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={useCurrentLocation}
            disabled={locating}
            className="mt-5 flex items-center gap-2 text-sm font-bold text-primary hover:text-primary-hover disabled:opacity-60"
          >
            {locating ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <LocateFixed className="size-4 text-tertiary" aria-hidden />
            )}
            Use my current location
          </button>
          {locationNote && (
            <p role="status" className="mt-2 text-xs text-muted-foreground">
              {locationNote}
            </p>
          )}

          <p className="mt-7 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Quick suggestions</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {SUGGESTED_AREAS.map((suggestion) => (
              <li key={suggestion}>
                <button
                  type="button"
                  onClick={() => setArea(suggestion)}
                  aria-pressed={area === suggestion}
                  className={cn(
                    'rounded-full border px-4 py-2 text-sm transition-colors',
                    area === suggestion
                      ? 'border-primary bg-accent text-accent-foreground'
                      : 'border-input bg-muted text-foreground hover:border-primary/40',
                  )}
                >
                  {suggestion}
                </button>
              </li>
            ))}
          </ul>

          <button type="button" onClick={next} className={cn(primaryButtonClass, 'mt-10')}>
            Next
            <ArrowRight className="size-5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={back}
            className="mx-auto mt-4 block text-sm text-muted-foreground hover:text-foreground"
          >
            Back
          </button>
        </div>
      </AuthFrame>
    )
  }

  return (
    <AuthFrame className="border-2 border-input">
      {header}
      <form key="account" onSubmit={createAccount} className="animate-rise">
        <h1 className="mt-8 text-center font-heading text-3xl font-bold text-foreground">Create your profile</h1>
        <p className="mt-1 text-center text-[15px] text-muted-foreground">Just a few quick details.</p>

        <div className="mt-7 grid grid-cols-2 gap-3">
          <Field label="First name" htmlFor="first-name">
            <input
              id="first-name"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              required
              maxLength={40}
              autoComplete="given-name"
              placeholder="Eleanor"
              className={fieldClass}
            />
          </Field>
          <Field label="Last name" htmlFor="last-name">
            <input
              id="last-name"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              maxLength={39}
              autoComplete="family-name"
              placeholder="Vance"
              className={fieldClass}
            />
          </Field>
        </div>

        <Field label="Email" htmlFor="email">
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
            placeholder="you@example.com"
            className={fieldClass}
          />
        </Field>

        <Field label="Password" htmlFor="password">
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            className={fieldClass}
          />
        </Field>

        <label className="mt-5 flex cursor-pointer items-center gap-3 text-sm text-foreground">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(event) => setAgreed(event.target.checked)}
            required
            className="size-5 shrink-0 cursor-pointer rounded accent-primary"
          />
          I agree to be kind and follow the community guidelines
        </label>

        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
            {error}
          </p>
        )}

        <button type="submit" disabled={submitting} className={cn(primaryButtonClass, 'mt-8')}>
          {submitting ? <Loader2 className="size-5 animate-spin" aria-hidden /> : null}
          Complete profile
          {!submitting && <ArrowRight className="size-5" aria-hidden />}
        </button>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/sign-in" className="font-bold text-primary hover:text-primary-hover">
            Sign in
          </Link>
        </p>
      </form>
    </AuthFrame>
  )
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="mt-3 first:mt-0">
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-foreground">
        {label}
      </label>
      {children}
    </div>
  )
}
