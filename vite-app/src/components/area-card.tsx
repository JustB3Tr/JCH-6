import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { regionLabel, type Area } from '@/data/areas'
import { REGION_COLOR } from '@/lib/region-color'

export function AreaCard({ area }: { area: Area }) {
  return (
    <Link
      to={`/area/${area.slug}`}
      className="group flex flex-col rounded-2xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.25)] focus-visible:outline-2"
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: REGION_COLOR[area.region] }}
        />
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {regionLabel(area.region)}
        </span>
        {area.status === 'new' && (
          <span className="ml-auto rounded-full bg-primary/12 px-2 py-0.5 text-[10px] font-semibold text-primary">
            New
          </span>
        )}
      </div>

      <h3 className="mt-2 text-[17px] font-semibold leading-tight tracking-[-0.02em]">{area.name}</h3>
      <p className="mt-1 text-[13px] leading-snug text-muted-foreground">{area.identity}</p>

      <ul className="mt-3 space-y-1.5">
        {area.bonuses.slice(0, 2).map((bonus) => (
          <li key={bonus} className="flex gap-1.5 text-[12.5px] leading-snug text-foreground/80">
            <Check className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
            <span>{bonus}</span>
          </li>
        ))}
      </ul>

      <span className="mt-3 text-[12px] font-medium text-primary opacity-0 transition group-hover:opacity-100">
        See all {area.bonuses.length} bonuses
      </span>
    </Link>
  )
}
