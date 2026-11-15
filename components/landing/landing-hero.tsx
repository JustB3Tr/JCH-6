import Link from 'next/link'
import { CalendarDays, CircleCheck, Compass, Search, Sprout, Trees } from 'lucide-react'
import type { Meta } from '@/lib/types'

export function LandingHero({ totals }: { totals: Meta['totals'] }) {
  return (
    <section className="relative mx-auto flex w-full max-w-7xl flex-col items-center px-4 pb-14 pt-14 text-center sm:px-6 sm:pt-16 lg:px-12">
      <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#c4a66a]/40 bg-secondary px-4 py-1.5 text-xs font-semibold text-secondary-foreground shadow-sm">
        <Sprout className="size-4 text-primary" aria-hidden />
        <span>100% free · Open to all ages · Browse without an account</span>
      </p>

      <h1 className="max-w-4xl text-balance font-heading text-4xl font-bold leading-[1.18] tracking-tight text-foreground sm:text-6xl">
        Find fun things to do outside, with{' '}
        <span className="text-primary underline decoration-accent decoration-wavy underline-offset-8">
          friendly people
        </span>{' '}
        near you.
      </h1>

      <p className="mt-6 max-w-3xl text-pretty text-lg leading-relaxed text-muted-foreground sm:text-xl">
        Whether you want a casual morning walk, a friendly game of pickleball, or an evening picnic in the park,
        we make it effortless to step outside and connect across LA County.
      </p>

      <form
        action="/map"
        role="search"
        className="mt-8 flex w-full max-w-2xl flex-col items-center gap-2 rounded-2xl border-2 border-[#78a886]/40 bg-card p-2 shadow-lg sm:flex-row"
      >
        <label htmlFor="hero-search" className="sr-only">
          Your neighborhood, a park, or an activity
        </label>
        <div className="flex w-full flex-1 items-center pl-3">
          <Search className="mr-2 size-6 shrink-0 text-primary" aria-hidden />
          <input
            id="hero-search"
            name="q"
            type="search"
            placeholder="Try Echo Park, a beach, or picnic tables…"
            className="w-full bg-transparent py-3 text-base text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
        <button
          type="submit"
          className="flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-base font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover sm:w-auto"
        >
          <Compass className="size-5" aria-hidden />
          <span>Find activities</span>
        </button>
      </form>

      <div className="mt-6 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row sm:gap-4">
        <Link
          href="/events"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-7 py-3 text-base font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover sm:w-auto"
        >
          <CalendarDays className="size-5" aria-hidden />
          <span>See what&apos;s happening</span>
        </Link>
        <Link
          href="/map?type=park"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#c4a66a]/50 bg-secondary px-7 py-3 text-base font-bold text-secondary-foreground shadow-sm transition-colors hover:bg-[#e9dfcd] sm:w-auto"
        >
          <Trees className="size-5 text-primary" aria-hidden />
          <span>Explore parks &amp; walking paths</span>
        </Link>
      </div>

      <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
        <li className="flex items-center gap-1.5">
          <CircleCheck className="size-4 text-primary" aria-hidden />
          {totals.places.toLocaleString()} parks, trails &amp; public spaces
        </li>
        <li className="flex items-center gap-1.5">
          <CircleCheck className="size-4 text-primary" aria-hidden />
          {totals.events.toLocaleString()} upcoming gatherings
        </li>
        <li className="flex items-center gap-1.5">
          <CircleCheck className="size-4 text-primary" aria-hidden />
          Welcoming to beginners of all ages
        </li>
      </ul>
    </section>
  )
}
