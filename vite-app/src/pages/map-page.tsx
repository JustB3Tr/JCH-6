import { useMemo, useState } from 'react'
import { AREAS, AREA_CATEGORIES, AREA_COUNT, REGIONS, type AreaCategory, type RegionId } from '@/data/areas'
import { AreaMap } from '@/components/area-map'
import { ThemeToggle } from '@/components/theme-toggle'
import { REGION_COLOR } from '@/lib/region-color'
import { cn } from '@/lib/utils'

export function MapPage({ theme, onToggleTheme }: { theme: 'light' | 'dark'; onToggleTheme: () => void }) {
  const [filter, setFilter] = useState<RegionId | 'all'>('all')
  const [category, setCategory] = useState<AreaCategory | 'all'>('all')
  const visible = useMemo(
    () =>
      AREAS.filter(
        (area) =>
          (filter === 'all' || area.region === filter) && (category === 'all' || area.category === category),
      ),
    [filter, category],
  )

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-[26px] font-semibold leading-none tracking-[-0.035em]">
            The map
          </h1>
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            {visible.length} of {AREA_COUNT} places. Tap a pin for the one-line reason.
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

      <div className="mt-3 flex items-center gap-2">
        <label htmlFor="map-place-type" className="text-[12px] font-medium text-muted-foreground">
          Place type
        </label>
        <select
          id="map-place-type"
          value={category}
          onChange={(event) => setCategory(event.target.value as AreaCategory | 'all')}
          className="rounded-full border border-border bg-card px-3 py-1.5 text-[12.5px] font-medium text-foreground outline-none"
        >
          <option value="all">All types</option>
          {AREA_CATEGORIES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4">
        <AreaMap areas={visible} theme={theme} fitToAreas className="h-[calc(100dvh-19rem)] min-h-[380px]" />
      </div>
    </div>
  )
}
