import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Clock, Sparkles, Users } from 'lucide-react'
import { AREAS, areaBySlug, regionLabel } from '@/data/areas'
import { AreaMap } from '@/components/area-map'
import { ThemeToggle } from '@/components/theme-toggle'
import { REGION_COLOR } from '@/lib/region-color'

export function AreaDetailPage({ theme, onToggleTheme }: { theme: 'light' | 'dark'; onToggleTheme: () => void }) {
  const { slug } = useParams()
  const area = slug ? areaBySlug(slug) : undefined

  if (!area) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 pt-6">
        <Link to="/" className="text-[13px] font-medium text-primary">
          Back to areas
        </Link>
        <p className="mt-6 text-[15px]">That area isn’t in the set yet.</p>
      </div>
    )
  }

  const index = AREAS.findIndex((a) => a.slug === area.slug)
  const prev = AREAS[(index - 1 + AREAS.length) % AREAS.length]
  const next = AREAS[(index + 1) % AREAS.length]
  const color = REGION_COLOR[area.region]

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-6">
      <div className="flex items-center justify-between gap-3">
        <Link
          to="/"
          className="glass glass-press inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium text-foreground/75"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          Areas
        </Link>
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>

      <header className="mt-6">
        <div className="flex items-center gap-2">
          <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
            {regionLabel(area.region)}
          </span>
          {area.status === 'new' && (
            <span className="rounded-full bg-primary/12 px-2 py-0.5 text-[10px] font-semibold text-primary">
              New in this pass
            </span>
          )}
        </div>
        <h1 className="mt-2 font-heading text-[34px] font-semibold leading-[1.05] tracking-[-0.035em]">
          {area.name}
        </h1>
        <p className="mt-2.5 text-[16px] leading-snug text-foreground/75">{area.identity}</p>
      </header>

      <section className="mt-7" aria-labelledby="bonuses-heading">
        <h2 id="bonuses-heading" className="text-[11px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
          Why go here
        </h2>
        <ul className="mt-3 space-y-2">
          {area.bonuses.map((bonus) => (
            <li
              key={bonus}
              className="flex items-start gap-2.5 rounded-xl border border-border bg-card px-3.5 py-3"
            >
              <span
                className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: `${color}1f` }}
              >
                <Check className="size-3" style={{ color }} aria-hidden />
              </span>
              <span className="text-[13.5px] leading-snug">{bonus}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-3" aria-label="Planning details">
        <Fact icon={Users} label="Best for" value={area.bestFor} />
        <Fact icon={Clock} label="Best time" value={area.bestTime} />
        <Fact icon={Sparkles} label="Pair it with" value={area.pairing} />
      </section>

      <section className="mt-6" aria-labelledby="where-heading">
        <h2 id="where-heading" className="text-[11px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
          Where it is
        </h2>
        <div className="mt-3">
          <AreaMap
            areas={[area]}
            theme={theme}
            center={[area.lat, area.lng]}
            zoom={12}
            className="h-[240px]"
            interactive={false}
            showPopups={false}
          />
        </div>
      </section>

      <div className="mt-5 flex flex-wrap gap-1.5">
        {area.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-border bg-card px-2.5 py-1 text-[11.5px] text-muted-foreground"
          >
            {tag}
          </span>
        ))}
      </div>

      <nav className="mt-8 flex items-stretch gap-2.5" aria-label="Other areas">
        <Link
          to={`/area/${prev.slug}`}
          className="flex flex-1 flex-col rounded-xl border border-border bg-card px-3.5 py-3 transition hover:border-foreground/25"
        >
          <span className="flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            <ArrowLeft className="size-3" aria-hidden /> Previous
          </span>
          <span className="mt-1 text-[13.5px] font-medium">{prev.name}</span>
        </Link>
        <Link
          to={`/area/${next.slug}`}
          className="flex flex-1 flex-col items-end rounded-xl border border-border bg-card px-3.5 py-3 text-right transition hover:border-foreground/25"
        >
          <span className="flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Next <ArrowRight className="size-3" aria-hidden />
          </span>
          <span className="mt-1 text-[13.5px] font-medium">{next.name}</span>
        </Link>
      </nav>
    </div>
  )
}

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-3.5 py-3">
      <span className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        <Icon className="size-3" aria-hidden />
        {label}
      </span>
      <p className="mt-1.5 text-[13px] leading-snug">{value}</p>
    </div>
  )
}
