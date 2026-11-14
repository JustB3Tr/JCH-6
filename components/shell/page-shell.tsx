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
    <div className={cn('mx-auto w-full max-w-3xl px-3 pb-32', className)}>
      <header className="sticky top-0 z-30 -mx-3 px-3 pb-2 pt-[max(env(safe-area-inset-top),0.75rem)]">
        <div className="glass glass-strong flex items-center gap-3 rounded-[24px] px-3.5 py-2.5">
          {back && (
            <Link
              href={back.href}
              aria-label={back.label}
              className="glass-press -ml-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground/[0.06] text-foreground/80"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </Link>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[19px] font-semibold leading-tight tracking-[-0.02em]">{title}</h1>
            {subtitle && <p className="truncate text-[12px] text-muted-foreground">{subtitle}</p>}
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
  return <Tag className={cn('glass rounded-[22px] p-4', className)}>{children}</Tag>
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="glass animate-rise mt-3 rounded-[22px] px-5 py-10 text-center">
      <p className="text-[15px] font-semibold">{title}</p>
      <p className="mx-auto mt-1 max-w-[34ch] text-[13px] leading-relaxed text-muted-foreground">{body}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}
