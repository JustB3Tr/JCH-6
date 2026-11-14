import {
  BookOpen,
  Building2,
  Coffee,
  Dumbbell,
  Flower2,
  Landmark,
  MapPin,
  Mountain,
  ShoppingBasket,
  Telescope,
  Trees,
  Waves,
} from 'lucide-react'
import type { PlaceType } from '@/lib/constants'

const ICONS = {
  park: Trees,
  beach: Waves,
  trail: Mountain,
  garden: Flower2,
  viewpoint: Telescope,
  plaza: Landmark,
  market: ShoppingBasket,
  cafe: Coffee,
  library: BookOpen,
  museum: Building2,
  sports: Dumbbell,
  other: MapPin,
} satisfies Record<PlaceType, typeof MapPin>

export function PlaceTypeIcon({ type, className }: { type: PlaceType; className?: string }) {
  const Icon = ICONS[type] ?? MapPin
  return <Icon className={className} aria-hidden />
}
