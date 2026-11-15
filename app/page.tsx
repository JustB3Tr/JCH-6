import { getMeta, listPlaces } from '@/lib/data/places'
import { listEvents } from '@/lib/data/events'
import { LandingHero } from '@/components/landing/landing-hero'
import { ActivityExplorer } from '@/components/landing/activity-explorer'
import { HowItWorks } from '@/components/landing/how-it-works'
import { WeekendGatherings } from '@/components/landing/weekend-gatherings'
import { ClosingCta, SiteFooter } from '@/components/landing/site-footer'

export const revalidate = 300

export default async function LandingPage() {
  const [meta, topPlaces, events] = await Promise.all([
    getMeta(),
    listPlaces({ sort: 'rating', limit: 200 }),
    listEvents({ when: 'upcoming', limit: 3 }),
  ])

  const featured =
    topPlaces.find((place) => place.hasPhoto && place.amenities.length >= 3) ??
    topPlaces.find((place) => place.amenities.length > 0) ??
    topPlaces[0] ??
    null

  return (
    <div className="relative flex w-full flex-col overflow-x-clip">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[450px] w-[1000px] -translate-x-1/2 rounded-full bg-accent/40 blur-[130px]" />
        <div className="absolute -right-20 top-[600px] h-[450px] w-[500px] rounded-full bg-[#f8e0a8]/30 blur-[140px]" />
        <div className="absolute -left-32 top-[1400px] h-[500px] w-[600px] rounded-full bg-accent/30 blur-[150px]" />
      </div>

      <LandingHero totals={meta.totals} />
      <ActivityExplorer meta={meta} featured={featured} />
      <HowItWorks />
      <WeekendGatherings events={events} />
      <ClosingCta />
      <SiteFooter />
    </div>
  )
}
