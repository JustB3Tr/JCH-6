import Link from 'next/link'
import { MapPin, Sparkles, MessagesSquare, Users, CalendarDays, LayoutDashboard } from 'lucide-react'
import { auth } from '@/lib/auth'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { SignOutButton } from '@/components/sign-out-button'

const navItems = [
  { href: '/', label: 'Map', icon: MapPin },
  { href: '/overview', label: 'Overview', icon: LayoutDashboard },
  { href: '/events', label: 'Events', icon: CalendarDays },
  { href: '/communities', label: 'Communities', icon: Users },
  { href: '/chat', label: 'Chat', icon: MessagesSquare },
  { href: '/ai', label: 'Ask AI', icon: Sparkles },
]

export async function SiteHeader() {
  const session = await auth()
  const user = session?.user

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-3 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <MapPin className="size-4" aria-hidden />
          </span>
          <span className="text-lg">Hangout</span>
        </Link>

        <nav aria-label="Main" className="ms-2 hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-2">
          {user ? (
            <>
              <span className="hidden text-sm text-muted-foreground sm:inline">{user.name}</span>
              <Avatar className="size-8">
                <AvatarFallback className="bg-secondary text-xs font-semibold text-secondary-foreground">
                  {(user.name ?? '?').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="rounded-full px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="rounded-full bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Join
              </Link>
            </>
          )}
        </div>
      </div>

      <nav aria-label="Main mobile" className="flex gap-1 overflow-x-auto px-3 pb-2 md:hidden">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground"
          >
            <item.icon className="size-3.5" aria-hidden />
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  )
}
