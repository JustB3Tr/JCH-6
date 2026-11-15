export const BRAND = {
  name: 'Outly',
  tagline: 'Step outside together',
  description:
    'Find free, friendly things to do outside across Los Angeles County: parks, trails, beaches and gardens, with neighborhood gatherings, groups and a conversational AI guide.',
} as const

export const NAV_LINKS = [
  { href: '/map', label: 'Explore' },
  { href: '/events', label: 'Gatherings' },
  { href: '/communities', label: 'Groups' },
  { href: '/chat', label: 'Chat' },
  { href: '/guide', label: 'Guide' },
] as const

export function pageTitle(title: string) {
  return `${title} — ${BRAND.name}`
}
