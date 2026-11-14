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
      <div className="glass glass-strong pointer-events-auto flex items-stretch gap-0.5 rounded-[26px] p-1.5">
        {TABS.map((tab) => {
          const active = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href)
          const Icon = tab.icon
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'glass-press relative flex w-[52px] flex-col items-center justify-center gap-0.5 rounded-[20px] py-1.5 transition-colors sm:w-[62px]',
                active ? 'text-primary' : 'text-foreground/60 hover:text-foreground',
              )}
            >
              {active && <span aria-hidden className="absolute inset-0 rounded-[20px] bg-primary/12" />}
              <Icon className="relative size-[21px]" strokeWidth={active ? 2.3 : 1.9} aria-hidden />
              <span className="relative text-[10px] font-medium tracking-[-0.01em]">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
