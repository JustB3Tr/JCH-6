'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, Map, MessageCircle, Sparkles, UserRound, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { href: '/map', label: 'Explore', icon: Map },
  { href: '/events', label: 'Gather', icon: CalendarDays },
  { href: '/communities', label: 'Groups', icon: Users },
  { href: '/chat', label: 'Chat', icon: MessageCircle },
  { href: '/guide', label: 'Guide', icon: Sparkles },
  { href: '/profile', label: 'You', icon: UserRound },
]

const HIDDEN_ON = ['/sign-in', '/sign-up']

/** Bottom tab bar for phones. Wide screens use the top header instead. */
export function AppNav() {
  const pathname = usePathname()
  if (pathname === '/' || HIDDEN_ON.some((path) => pathname.startsWith(path))) return null

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 pb-[max(env(safe-area-inset-bottom),0.25rem)] backdrop-blur-md md:hidden"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-between px-2 pt-1.5">
        {TABS.map((tab) => {
          const active = pathname.startsWith(tab.href)
          const Icon = tab.icon
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'glass-press flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 transition-colors',
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <span
                className={cn(
                  'flex h-7 w-12 items-center justify-center rounded-full transition-colors',
                  active && 'bg-accent/70',
                )}
              >
                <Icon className="size-5" strokeWidth={active ? 2.3 : 1.9} aria-hidden />
              </span>
              <span className={cn('text-[11px] tracking-tight', active ? 'font-bold' : 'font-semibold')}>{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
