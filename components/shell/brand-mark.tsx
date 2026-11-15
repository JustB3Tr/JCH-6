import Image from 'next/image'
import Link from 'next/link'
import { BRAND } from '@/lib/brand'
import { cn } from '@/lib/utils'

/**
 * The Outly wordmark. `outly-wordmark.png` is the forest-green artwork for
 * light surfaces; `outly-wordmark-dark.png` is the off-white variant for dark
 * ones. Both are transparent PNGs.
 */
export function BrandMark({
  href = '/',
  compact = false,
  className,
}: {
  href?: string
  compact?: boolean
  className?: string
}) {
  return (
    <Link
      href={href}
      className={cn('group inline-flex shrink-0 items-center', className)}
      aria-label={`${BRAND.name} home`}
    >
      <Image
        src="/images/outly-wordmark.png"
        alt={BRAND.name}
        width={1014}
        height={421}
        priority
        sizes={compact ? '84px' : '112px'}
        className={cn(
          'w-auto object-contain transition-opacity group-hover:opacity-80',
          compact ? 'h-7' : 'h-9',
        )}
      />
    </Link>
  )
}
