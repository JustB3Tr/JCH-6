export type LatLng = { lat: number; lng: number }
export type Bounds = { south: number; west: number; north: number; east: number }
export type Area = LatLng & { name: string; aliases?: string[] }

const EARTH_RADIUS_KM = 6371
const KM_PER_DEGREE = 111.32
const toRad = (deg: number) => (deg * Math.PI) / 180

export function distanceKm(a: LatLng, b: LatLng) {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}

export function boundsAround(center: LatLng, radiusKm: number): Bounds {
  const latDelta = radiusKm / KM_PER_DEGREE
  const lngDelta = radiusKm / (KM_PER_DEGREE * Math.max(Math.cos(toRad(center.lat)), 0.2))
  return {
    south: center.lat - latDelta,
    north: center.lat + latDelta,
    west: center.lng - lngDelta,
    east: center.lng + lngDelta,
  }
}

export function isLatLng(value: LatLng) {
  return (
    Number.isFinite(value.lat) &&
    Number.isFinite(value.lng) &&
    Math.abs(value.lat) <= 90 &&
    Math.abs(value.lng) <= 180
  )
}

export function parseLatLng(text: string | null | undefined): LatLng | null {
  if (!text) return null
  const match = text.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/)
  if (!match) return null
  const point = { lat: Number(match[1]), lng: Number(match[2]) }
  return isLatLng(point) ? point : null
}

export function parseBounds(text: string | null | undefined): Bounds | null {
  if (!text) return null
  const parts = text.split(',').map(Number)
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null
  const [south, west, north, east] = parts
  if (south > north || Math.abs(south) > 90 || Math.abs(north) > 90) return null
  return { south, west, north, east }
}

// Approximate centers of LA County neighborhoods and cities. This lets the
// guide and search understand "near Pasadena" without an external geocoder.
export const LA_AREAS: Area[] = [
  { name: 'Downtown LA', lat: 34.0407, lng: -118.2468, aliases: ['dtla', 'downtown', 'downtown los angeles'] },
  { name: 'Arts District', lat: 34.0403, lng: -118.2351 },
  { name: 'Little Tokyo', lat: 34.05, lng: -118.24 },
  { name: 'Chinatown', lat: 34.0623, lng: -118.2383 },
  { name: 'Echo Park', lat: 34.0782, lng: -118.2606 },
  { name: 'Silver Lake', lat: 34.0869, lng: -118.2702, aliases: ['silverlake'] },
  { name: 'Los Feliz', lat: 34.1064, lng: -118.284 },
  { name: 'Griffith Park', lat: 34.1366, lng: -118.2942 },
  { name: 'Atwater Village', lat: 34.1164, lng: -118.2565, aliases: ['atwater'] },
  { name: 'Hollywood', lat: 34.0928, lng: -118.3287 },
  { name: 'West Hollywood', lat: 34.09, lng: -118.3617, aliases: ['weho'] },
  { name: 'Koreatown', lat: 34.0618, lng: -118.3004, aliases: ['ktown', 'k-town'] },
  { name: 'Mid-City', lat: 34.0469, lng: -118.347, aliases: ['mid city', 'miracle mile', 'fairfax'] },
  { name: 'Highland Park', lat: 34.1114, lng: -118.1922 },
  { name: 'Eagle Rock', lat: 34.1392, lng: -118.2103 },
  { name: 'Boyle Heights', lat: 34.0339, lng: -118.2064 },
  { name: 'East LA', lat: 34.0239, lng: -118.172, aliases: ['east los angeles'] },
  { name: 'South LA', lat: 33.9891, lng: -118.2915, aliases: ['south los angeles', 'south central'] },
  { name: 'Leimert Park', lat: 34.0083, lng: -118.332, aliases: ['baldwin hills', 'crenshaw'] },
  { name: 'Beverly Hills', lat: 34.0736, lng: -118.4004 },
  { name: 'Westwood', lat: 34.0635, lng: -118.4455, aliases: ['ucla'] },
  { name: 'Brentwood', lat: 34.0521, lng: -118.4732 },
  { name: 'Sawtelle', lat: 34.0396, lng: -118.442, aliases: ['west la', 'west los angeles'] },
  { name: 'Culver City', lat: 34.0211, lng: -118.3965 },
  { name: 'Santa Monica', lat: 34.0195, lng: -118.4912 },
  { name: 'Venice', lat: 33.985, lng: -118.4695, aliases: ['venice beach'] },
  { name: 'Mar Vista', lat: 34.0025, lng: -118.4302 },
  { name: 'Marina del Rey', lat: 33.9803, lng: -118.4517, aliases: ['the marina'] },
  { name: 'Playa del Rey', lat: 33.9575, lng: -118.442, aliases: ['playa vista'] },
  { name: 'Westchester', lat: 33.9597, lng: -118.3996, aliases: ['lax'] },
  { name: 'Pacific Palisades', lat: 34.0459, lng: -118.5265, aliases: ['palisades'] },
  { name: 'Topanga', lat: 34.0936, lng: -118.6012 },
  { name: 'Malibu', lat: 34.0259, lng: -118.7798 },
  { name: 'Calabasas', lat: 34.1367, lng: -118.6615, aliases: ['agoura hills'] },
  { name: 'El Segundo', lat: 33.9192, lng: -118.4165 },
  { name: 'Manhattan Beach', lat: 33.8847, lng: -118.4109 },
  { name: 'Hermosa Beach', lat: 33.8622, lng: -118.3995 },
  { name: 'Redondo Beach', lat: 33.8492, lng: -118.3884 },
  { name: 'Torrance', lat: 33.8358, lng: -118.3406 },
  { name: 'Palos Verdes', lat: 33.7445, lng: -118.387, aliases: ['rancho palos verdes', 'pv'] },
  { name: 'San Pedro', lat: 33.7361, lng: -118.2923 },
  { name: 'Long Beach', lat: 33.7701, lng: -118.1937 },
  { name: 'Signal Hill', lat: 33.8045, lng: -118.1678 },
  { name: 'Lakewood', lat: 33.8536, lng: -118.134 },
  { name: 'Cerritos', lat: 33.8583, lng: -118.0648 },
  { name: 'Carson', lat: 33.8317, lng: -118.2817 },
  { name: 'Gardena', lat: 33.8883, lng: -118.309 },
  { name: 'Hawthorne', lat: 33.9164, lng: -118.3526 },
  { name: 'Inglewood', lat: 33.9617, lng: -118.3531 },
  { name: 'Compton', lat: 33.8958, lng: -118.2201 },
  { name: 'Downey', lat: 33.9401, lng: -118.1332 },
  { name: 'Whittier', lat: 33.9792, lng: -118.0328 },
  { name: 'La Mirada', lat: 33.9172, lng: -118.012 },
  { name: 'Glendale', lat: 34.1425, lng: -118.2551 },
  { name: 'Montrose', lat: 34.2064, lng: -118.2293, aliases: ['la crescenta'] },
  { name: 'La Cañada Flintridge', lat: 34.1992, lng: -118.1879, aliases: ['la canada', 'la canada flintridge'] },
  { name: 'Burbank', lat: 34.1808, lng: -118.309 },
  { name: 'Sunland-Tujunga', lat: 34.2522, lng: -118.2884, aliases: ['tujunga', 'sunland'] },
  { name: 'Studio City', lat: 34.1396, lng: -118.3871 },
  { name: 'North Hollywood', lat: 34.187, lng: -118.3813, aliases: ['noho'] },
  { name: 'Sherman Oaks', lat: 34.1508, lng: -118.449 },
  { name: 'Van Nuys', lat: 34.1899, lng: -118.4514 },
  { name: 'Encino', lat: 34.1592, lng: -118.5012 },
  { name: 'Woodland Hills', lat: 34.1684, lng: -118.6059, aliases: ['warner center'] },
  { name: 'Northridge', lat: 34.2283, lng: -118.5366 },
  { name: 'Chatsworth', lat: 34.2572, lng: -118.6012 },
  { name: 'Pacoima', lat: 34.2625, lng: -118.427, aliases: ['lake view terrace'] },
  { name: 'Santa Clarita', lat: 34.3917, lng: -118.5426, aliases: ['valencia', 'newhall'] },
  { name: 'Pasadena', lat: 34.1478, lng: -118.1445 },
  { name: 'South Pasadena', lat: 34.1161, lng: -118.1503 },
  { name: 'Altadena', lat: 34.1897, lng: -118.1312 },
  { name: 'San Marino', lat: 34.1214, lng: -118.1064 },
  { name: 'Alhambra', lat: 34.0953, lng: -118.127 },
  { name: 'Monterey Park', lat: 34.0625, lng: -118.1228 },
  { name: 'San Gabriel', lat: 34.0961, lng: -118.1058 },
  { name: 'Arcadia', lat: 34.1397, lng: -118.0353 },
  { name: 'Sierra Madre', lat: 34.1617, lng: -118.0528 },
  { name: 'Monrovia', lat: 34.1442, lng: -118.0019 },
  { name: 'Duarte', lat: 34.1395, lng: -117.9773 },
  { name: 'Azusa', lat: 34.1336, lng: -117.9076 },
  { name: 'Glendora', lat: 34.1361, lng: -117.8653 },
  { name: 'El Monte', lat: 34.0686, lng: -118.0276, aliases: ['south el monte'] },
  { name: 'West Covina', lat: 34.0686, lng: -117.939 },
  { name: 'Rowland Heights', lat: 33.9761, lng: -117.9053, aliases: ['hacienda heights'] },
  { name: 'Diamond Bar', lat: 34.0286, lng: -117.8103 },
  { name: 'San Dimas', lat: 34.1067, lng: -117.8067 },
  { name: 'La Verne', lat: 34.1008, lng: -117.7678 },
  { name: 'Pomona', lat: 34.0551, lng: -117.75 },
  { name: 'Claremont', lat: 34.0967, lng: -117.7198 },
  { name: 'Lancaster', lat: 34.6868, lng: -118.1542, aliases: ['antelope valley'] },
  { name: 'Palmdale', lat: 34.5794, lng: -118.1165 },
]

const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const areaIndex = new Map<string, Area>()
for (const area of LA_AREAS) {
  areaIndex.set(normalize(area.name), area)
  for (const alias of area.aliases ?? []) areaIndex.set(normalize(alias), area)
}

/** Resolves "Pasadena", "near noho", "34.1,-118.3" to a point. */
export function resolveArea(text: string | null | undefined): Area | null {
  if (!text) return null
  const point = parseLatLng(text)
  if (point) return { ...point, name: nearestArea(point)?.name ?? 'that location' }

  const key = normalize(text).replace(/^(near|in|around|by|at)\s+/, '').replace(/,?\s*(ca|california)$/, '')
  if (!key) return null
  const exact = areaIndex.get(key)
  if (exact) return exact

  // Longest known name contained in the text wins ("south pasadena" over "pasadena").
  let best: { key: string; area: Area } | null = null
  for (const [name, area] of areaIndex) {
    if (name.length < 4) continue
    if (new RegExp(`\\b${name}\\b`).test(key) && (!best || name.length > best.key.length)) best = { key: name, area }
  }
  return best?.area ?? null
}

export function nearestArea(point: LatLng, maxKm = 12): Area | null {
  let best: Area | null = null
  let bestDistance = maxKm
  for (const area of LA_AREAS) {
    const d = distanceKm(point, area)
    if (d < bestDistance) {
      best = area
      bestDistance = d
    }
  }
  return best
}

/** "123 Main St, Glendale, CA 91201, USA" -> "Glendale". */
export function cityFromAddress(address: string | null | undefined): string | null {
  if (!address) return null
  const parts = address
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
  if (parts.at(-1) === 'USA' || parts.at(-1) === 'United States') parts.pop()
  if (parts.length && /^[A-Z]{2}(\s+\d{5}(-\d{4})?)?$/.test(parts.at(-1)!)) parts.pop()
  return parts.length >= 2 ? parts.at(-1)! : null
}

/** Neighborhood-level label: the address city, refined inside the City of LA. */
export function areaLabel(place: LatLng & { address?: string | null }): string | null {
  const city = cityFromAddress(place.address)
  if (city && city !== 'Los Angeles') return city
  return nearestArea(place, 6)?.name ?? city
}
