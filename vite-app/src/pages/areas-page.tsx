import { useMemo, useState, type ReactNode } from 'react'
import { Search, X } from 'lucide-react'
import {
  AREAS,
  AREA_CATEGORIES,
  AREA_COUNT,
  REGIONS,
  categoryLabel,
  type AreaCategory,
  type RegionId,
} from '@/data/areas'
import { AreaCard } from '@/components/area-card'
import { Logo, Wordmark } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { cn } from '@/lib/utils'

type Filter = RegionId | 'all'
type CategoryFilter = AreaCategory | 'all'
const PAGE_SIZE = 48

export function AreasPage({ theme, onToggleTheme }: { theme: 'light' | 'dark'; onToggleTheme: () => void }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return AREAS.filter((area) => {
      if (filter !== 'all' && area.region !== filter) return false
      if (category !== 'all' && area.category !== category) return false
      if (!q) return true
      return (
        area.name.toLowerCase().includes(q) ||
        area.identity.toLowerCase().includes(q) ||
        area.bestFor.toLowerCase().includes(q) ||
        area.city?.toLowerCase().includes(q) ||
        area.address?.toLowerCase().includes(q) ||
        categoryLabel(area.category).toLowerCase().includes(q) ||
        area.tags.some((tag) => tag.toLowerCase().includes(q)) ||
        area.bonuses.some((bonus) => bonus.toLowerCase().includes(q))
      )
    })
  }, [query, filter, category])

  const visibleResults = results.slice(0, visibleCount)
  const updateQuery = (value: string) => {
    setQuery(value)
    setVisibleCount(PAGE_SIZE)
  }
  const updateFilter = (value: Filter) => {
    setFilter(value)
    setVisibleCount(PAGE_SIZE)
  }
  const updateCategory = (value: CategoryFilter) => {
    setCategory(value)
    setVisibleCount(PAGE_SIZE)
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <Logo className="size-8 shrink-0" />
            <h1 className="font-heading text-[25px] leading-none tracking-[-0.035em]">
              <Wordmark />
            </h1>
          </div>
          <p className="mt-2 text-[13px] text-muted-foreground">
            {AREA_COUNT} places across LA County. Parks, trails, beaches & the local route.
          </p>
        </div>
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </header>

      <div className="mt-5 flex items-center gap-2 rounded-2xl border border-border bg-card px-3.5 py-2.5">
        <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(event) => updateQuery(event.target.value)}
          placeholder="Search parks, cities, amenities, or places"
          aria-label="Search places"
          className="w-full bg-transparent text-[14px] outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:appearance-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => updateQuery('')}
            aria-label="Clear search"
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" aria-hidden />
          </button>
        )}
      </div>

      <div className="edge-fade -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Chip active={filter === 'all'} onClick={() => updateFilter('all')}>
          All {AREA_COUNT}
        </Chip>
        {REGIONS.map((region) => {
          const count = AREAS.filter((area) => area.region === region.id).length
          return (
            <Chip key={region.id} active={filter === region.id} onClick={() => updateFilter(region.id)}>
              {region.label} {count}
            </Chip>
          )
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Filter by place type">
        <Chip active={category === 'all'} onClick={() => updateCategory('all')}>
          All types
        </Chip>
        {AREA_CATEGORIES.map((item) => {
          const count = AREAS.filter((area) => area.category === item.id).length
          return (
            <Chip key={item.id} active={category === item.id} onClick={() => updateCategory(item.id)}>
              {item.label} {count}
            </Chip>
          )
        })}
      </div>

      <p className="mt-4 text-[12px] text-muted-foreground" aria-live="polite">
        {results.length} {results.length === 1 ? 'place' : 'places'}
        {filter !== 'all' && ` in ${REGIONS.find((r) => r.id === filter)?.label}`}
        {category !== 'all' && ` · ${categoryLabel(category)}`}
        {query && ` matching “${query}”`}
        {results.length > visibleResults.length && ` · showing ${visibleResults.length}`}
      </p>

      {results.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-[15px] font-medium">Nothing matches that yet.</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Try a city, a place type, or an amenity like “picnic”.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visibleResults.map((area) => (
              <AreaCard key={area.slug} area={area} />
            ))}
          </div>
          {visibleCount < results.length && (
            <div className="mt-5 flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                className="rounded-full border border-border bg-card px-5 py-2.5 text-[13px] font-semibold transition hover:border-foreground/25 hover:bg-secondary"
              >
                Load more places · {Math.min(PAGE_SIZE, results.length - visibleCount)} of {results.length - visibleCount}
              </button>
            </div>
          )}
        </>
      )}

      <footer className="mt-8 border-t border-border pt-4 text-[11px] leading-relaxed text-muted-foreground">
        Hundreds of additional records come from{' '}
        <a
          href="https://public.gis.lacounty.gov/public/rest/services/LACounty_Dynamic/LMS_Data_Public/MapServer"
          target="_blank"
          rel="noreferrer"
          className="font-medium text-primary hover:underline"
        >
          LA County open GIS data
        </a>
        . Check the managing agency for current hours, access, and conditions before visiting.
      </footer>
    </div>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition',
        active
          ? 'border-transparent bg-primary text-primary-foreground'
          : 'border-border bg-card text-foreground/70 hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}
