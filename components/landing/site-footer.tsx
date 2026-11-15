import Link from 'next/link'
import { BadgeCheck, Compass } from 'lucide-react'
import { BRAND } from '@/lib/brand'
import { BrandMark } from '@/components/shell/brand-mark'

export function ClosingCta() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 pb-20 pt-4 sm:px-6 lg:px-12">
      <div className="rounded-3xl border border-[#c4a66a]/40 bg-secondary p-8 text-center shadow-md sm:p-12">
        <div className="mx-auto max-w-2xl">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-card/80 px-3 py-1 text-xs font-bold text-secondary-foreground">
            <BadgeCheck className="size-4 text-primary" aria-hidden />
            <span>No account required to look around · 100% free for everyone</span>
          </p>
          <h2 className="text-balance font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Step outside. Your neighborhood is waiting.
          </h2>
          <p className="mb-8 mt-3 text-base text-muted-foreground sm:text-lg">
            Meet walking partners, join friendly games, and spend more restful time under the trees this week.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/map"
              className="flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-base font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover"
            >
              <Compass className="size-5" aria-hidden />
              <span>Find activities in my neighborhood</span>
            </Link>
            <Link
              href="/sign-up"
              className="rounded-xl border border-[#c4a66a]/60 bg-card px-6 py-3.5 text-base font-bold text-secondary-foreground transition-colors hover:border-primary hover:text-primary"
            >
              Create a free profile
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

const COLUMNS = [
  {
    title: 'Explore',
    links: [
      { href: '/map', label: 'Find nearby parks' },
      { href: '/map?type=trail', label: 'Trails & walking paths' },
      { href: '/map?type=beach', label: 'Beaches' },
    ],
  },
  {
    title: 'Gather',
    links: [
      { href: '/events', label: 'Upcoming meetups' },
      { href: '/communities', label: 'Neighborhood groups' },
      { href: '/chat', label: 'Group chat' },
    ],
  },
  {
    title: 'Community care',
    links: [
      { href: '/#how-it-works', label: `How ${BRAND.name} works` },
      { href: '/guide', label: 'Ask the AI guide' },
      { href: '/profile', label: 'Privacy settings' },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="mt-8 w-full border-t border-border bg-muted">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-12">
        <div className="mb-8 grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 space-y-3 md:col-span-1">
            <BrandMark compact />
            <p className="text-sm leading-relaxed text-muted-foreground">
              Bringing neighbors together in parks, trails, and public spaces across LA County. Free for everyone.
            </p>
          </div>
          {COLUMNS.map((column) => (
            <div key={column.title}>
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-foreground">{column.title}</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="transition-colors hover:text-primary">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex flex-col justify-between gap-2 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>
            © {new Date().getFullYear()} {BRAND.name}. Built for fresh air, neighbors, and human connection.
          </p>
          <p>Check each managing agency for current hours and access.</p>
        </div>
      </div>
    </footer>
  )
}
