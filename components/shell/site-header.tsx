'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Navigation } from 'lucide-react'
import { NAV_LINKS } from '@/lib/brand'
import { cn } from '@/lib/utils'
import { BrandMark } from '@/components/shell/brand-mark'
import { UserChip } from '@/components/shell/user-chip'

const HIDDEN_ON = ['/sign-in', '/sign-up', '/map']

/**
 * The top bar from the Terra landing design. It is the primary navigation on
 * wide screens; on phones it only appears on the landing page, because the
 * bottom tab bar takes over everywhere else. The map draws its own floating
 * controls instead.
 */
export function SiteHeader() {
  const pathname = usePathname()
  const { status } = useSession()
  if (HIDDEN_ON.some((path) => pathname.startsWith(path))) return null

  const onLanding = pathname === '/'

  return (
    <header
      className={cn(
        'sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-md',
        !onLanding && 'hidden md:block',
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-12">
        <BrandMark />

        <nav aria-label="Main" className="hidden items-center gap-1 lg:gap-2 md:flex">
          {NAV_LINKS.map((link) => {
            const active = pathname.startsWith(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                  active ? 'bg-accent/60 text-accent-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-2">
          {status === 'authenticated' ? (
            <UserChip />
          ) : (
            <>
              <Link
                href="/sign-in"
                className="hidden rounded-xl px-3 py-2 text-sm font-semibold text-foreground hover:text-primary sm:inline-flex"
              >
                Sign in
              </Link>
              <Link
                href={onLanding ? '/map' : '/sign-up'}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover"
              >
                <Navigation className="size-4" aria-hidden />
                <span>{onLanding ? 'Find activities near me' : 'Join free'}</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
