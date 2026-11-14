import { useState } from 'react'
import { AREAS, AREA_COUNT, REGIONS, type RegionId } from '@/data/areas'
import { AreaMap } from '@/components/area-map'
import { ThemeToggle } from '@/components/theme-toggle'
import { REGION_COLOR } from '@/lib/region-color'
import { cn } from '@/lib/utils'

export function MapPage({ theme, onToggleTheme }: { theme: 'light' | 'dark'; onToggleTheme: () => void }) {
  const [filter, setFilter] = useState<RegionId | 'all'>('all')
  const visible = filter === 'all' ? AREAS : AREAS.filter((area) => area.region === filter)

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold leading-none tracking-[-0.03em]">The map</h1>
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            {visible.length} of {AREA_COUNT} areas. Tap a pin for the one-line reason.
          </p>
        </div>
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </header>

      <div className="edge-fade -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => setFilter('all')}
          aria-pressed={filter === 'all'}
          className={cn(
            'shrink-0 rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition',
            filter === 'all'
              ? 'border-transparent bg-primary text-primary-foreground'
              : 'border-border bg-card text-foreground/70',
          )}
        >
          All
        </button>
        {REGIONS.map((region) => (
          <button
            key={region.id}
            type="button"
            onClick={() => setFilter(region.id)}
            aria-pressed={filter === region.id}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition',
              filter === region.id
                ? 'border-transparent bg-primary text-primary-foreground'
                : 'border-border bg-card text-foreground/70',
            )}
          >
            <span
              aria-hidden
              className="size-1.5 rounded-full"
              style={{ backgroundColor: REGION_COLOR[region.id] }}
            />
            {region.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <AreaMap areas={visible} theme={theme} className="h-[calc(100dvh-19rem)] min-h-[380px]" />
      </div>
    </div>
  )
}
