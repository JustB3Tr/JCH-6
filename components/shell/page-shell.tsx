import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

export function PageShell({
  title,
  subtitle,
  action,
  back,
  children,
  className,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
  back?: { href: string; label: string }
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('mx-auto w-full max-w-3xl px-4 pb-32 md:pb-16', className)}>
      <header className="sticky top-0 z-30 -mx-4 bg-background/95 px-4 pb-3 pt-[max(env(safe-area-inset-top),0.75rem)] backdrop-blur-md md:top-16 md:pt-6">
        <div className="flex items-center gap-3">
          {back && (
            <Link
              href={back.href}
              aria-label={back.label}
              className="glass-press flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-foreground/80 hover:text-primary"
            >
              <ChevronLeft className="size-5" aria-hidden />
            </Link>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-heading text-2xl font-bold leading-tight text-foreground md:text-3xl">
              {title}
            </h1>
            {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {action}
        </div>
      </header>
      {children}
    </div>
  )
}

export function GlassCard({
  children,
  className,
  as: Tag = 'div',
}: {
  children: React.ReactNode
  className?: string
  as?: 'div' | 'li' | 'article' | 'section'
}) {
  return <Tag className={cn('glass rounded-2xl p-5', className)}>{children}</Tag>
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="animate-rise mt-3 rounded-2xl border border-dashed border-input bg-surface px-5 py-10 text-center">
      <p className="font-heading text-lg font-semibold">{title}</p>
      <p className="mx-auto mt-1 max-w-[34ch] text-sm leading-relaxed text-muted-foreground">{body}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}
