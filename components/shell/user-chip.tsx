'use client'

import Link from 'next/link'
import { UserRound } from 'lucide-react'
import { useApi } from '@/lib/client'
import type { Me } from '@/lib/types'
import { cn } from '@/lib/utils'

export function UserChip({ className }: { className?: string }) {
  const { data } = useApi<{ user: Me | null }>('/api/me')
  const user = data?.user

  return (
    <Link
      href="/profile"
      className={cn(
        'flex items-center gap-2.5 rounded-full py-1 pl-1 pr-3.5 transition-colors hover:bg-muted',
        className,
      )}
    >
      <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <UserRound className="size-[18px]" aria-hidden />
      </span>
      <span className="hidden min-w-0 flex-col leading-tight sm:flex">
        <span className="max-w-[12ch] truncate text-sm font-semibold text-foreground">{user?.name ?? 'You'}</span>
        <span className="max-w-[14ch] truncate text-[11px] text-tertiary">{user?.homeArea ?? 'Your profile'}</span>
      </span>
    </Link>
  )
}
