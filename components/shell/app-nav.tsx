'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, Map, MessageCircle, Sparkles, UserRound, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { href: '/', label: 'Map', icon: Map },
  { href: '/events', label: 'Events', icon: CalendarDays },
  { href: '/communities', label: 'Groups', icon: Users },
  { href: '/chat', label: 'Chat', icon: MessageCircle },
  { href: '/guide', label: 'Guide', icon: Sparkles },
  { href: '/profile', label: 'You', icon: UserRound },
]

const HIDDEN_ON = ['/sign-in', '/sign-up']

export function AppNav() {
  const pathname = usePathname()
  if (HIDDEN_ON.some((path) => pathname.startsWith(path))) return null

  return (
    <nav
      aria-label="Main"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]"
    >
      <div className="glass glass-strong pointer-events-auto flex items-center gap-0.5 rounded-full p-1.5">
        {TABS.map((tab) => {
          const active = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href)
          const Icon = tab.icon
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              aria-label={tab.label}
              className={cn(
                'glass-press relative flex size-11 items-center justify-center rounded-full transition-colors sm:h-10 sm:w-auto sm:gap-2 sm:px-4',
                active ? 'text-primary-foreground' : 'text-foreground/65 hover:text-foreground',
              )}
            >
              {active && (
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-full bg-primary shadow-[0_6px_18px_-6px_var(--primary)]"
                />
              )}
              <Icon className="relative size-[19px] sm:size-4" strokeWidth={active ? 2.4 : 2} aria-hidden />
              <span className="relative hidden text-[13px] font-medium tracking-tight sm:inline">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
