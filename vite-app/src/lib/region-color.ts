import type { RegionId } from '@/data/areas'

// Nine distinguishable hues that hold up on both the paper and asphalt
// surfaces. Deliberately no orange: amber is the brand accent, so a region
// in the same family would read as a highlight instead of a category.
export const REGION_COLOR: Record<RegionId, string> = {
  northeast: '#dc2626',
  central: '#2563eb',
  eastside: '#9333ea',
  sgv: '#16a34a',
  mountains: '#4f46e5',
  valleys: '#84cc16',
  westside: '#0ea5e9',
  southbay: '#ec4899',
  longbeach: '#14b8a6',
}
