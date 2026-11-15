import { CircleCheck, Hand, MapPin } from 'lucide-react'
import { BRAND } from '@/lib/brand'

const STEPS = [
  {
    icon: CircleCheck,
    title: 'Pick what you like',
    body: 'Morning walks, friendly pickleball, reading in the shade, a beach day, or bringing your dog for an outdoor playdate.',
  },
  {
    icon: MapPin,
    title: 'Find a spot nearby',
    body: 'See park details ahead of time: paved paths, benches, restrooms, water fountains, shade and parking.',
  },
  {
    icon: Hand,
    title: 'Say hello & join in',
    body: 'RSVP to a gathering or join a neighborhood group. Zero pressure, beginner friendly, and free forever.',
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto w-full max-w-7xl scroll-mt-20 px-4 py-12 sm:px-6 lg:px-12">
      <div className="mx-auto mb-10 max-w-2xl text-center">
        <p className="mb-1 text-xs font-bold uppercase tracking-wider text-primary">How {BRAND.name} works</p>
        <h2 className="font-heading text-3xl font-bold text-foreground">3 simple steps to get outside &amp; connect</h2>
        <p className="mt-2 text-base text-muted-foreground">
          No complex apps, no fee to join, no stress. Just show up and enjoy fresh air.
        </p>
      </div>
      <ol className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {STEPS.map((step, index) => (
          <li key={step.title} className="flex flex-col items-start rounded-2xl border border-border bg-card p-6 shadow-sm">
            <span className="mb-4 flex size-12 items-center justify-center rounded-xl bg-secondary">
              <step.icon className="size-6 text-primary" aria-hidden />
            </span>
            <span className="mb-1 text-xs font-bold uppercase tracking-wider text-primary">Step {index + 1}</span>
            <h3 className="mb-2 font-heading text-xl font-bold text-foreground">{step.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
