import { cn } from '@/lib/utils'

/** The 540px Terra card shared by every onboarding step and sign-in. */
export function AuthFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[420px] w-[900px] -translate-x-1/2 rounded-full bg-accent/35 blur-[120px]" />
        <div className="absolute -bottom-40 -right-24 h-[380px] w-[520px] rounded-full bg-[#f8e0a8]/25 blur-[120px]" />
      </div>
      <div
        className={cn(
          'relative w-full max-w-[540px] rounded-[28px] border border-border bg-card px-6 py-7 shadow-soft sm:px-9 sm:py-9',
          className,
        )}
      >
        {children}
      </div>
    </div>
  )
}

export function StepProgress({ step, total }: { step: number; total: number }) {
  return (
    <div
      className="mt-5 grid gap-2"
      style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={step}
      aria-label={`Step ${step} of ${total}`}
    >
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={cn('h-1.5 rounded-full transition-colors duration-300', index < step ? 'bg-primary' : 'bg-muted')}
        />
      ))}
    </div>
  )
}

export const fieldClass =
  'h-12 w-full rounded-full border border-input bg-background px-5 text-[15px] text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/15'

export const primaryButtonClass =
  'glass-press flex h-14 w-full items-center justify-center gap-2 rounded-full bg-primary text-base font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover disabled:opacity-60'
