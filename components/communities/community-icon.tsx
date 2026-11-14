import {
  Bike,
  BookOpen,
  Camera,
  Coffee,
  Dog,
  Gamepad2,
  Leaf,
  Mountain,
  Music,
  Palette,
  ShoppingBasket,
  Sunset,
  Trophy,
  Users,
  Utensils,
  Waves,
} from 'lucide-react'
import type { CommunityIcon as CommunityIconName } from '@/lib/constants'

const ICONS = {
  users: Users,
  mountain: Mountain,
  sunset: Sunset,
  basket: ShoppingBasket,
  dog: Dog,
  bike: Bike,
  coffee: Coffee,
  book: BookOpen,
  music: Music,
  palette: Palette,
  ball: Trophy,
  leaf: Leaf,
  camera: Camera,
  gamepad: Gamepad2,
  utensils: Utensils,
  waves: Waves,
} satisfies Record<CommunityIconName, typeof Users>

export function CommunityIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name as CommunityIconName] ?? Users
  return <Icon className={className} aria-hidden />
}
