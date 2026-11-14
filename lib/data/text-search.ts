// Builds PostgreSQL tsquery strings from free text.
//
// 'prefix' is for search-as-you-type: every term must match, the last letters
// may still be missing ("pasa" finds Pasadena).
// 'any' is for natural-language questions from the AI guide: terms are OR-ed
// and expanded with synonyms, and ts_rank orders by how many matched.

export type SearchMode = 'prefix' | 'any'

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'any', 'are', 'around', 'at', 'best', 'by', 'can', 'for', 'find', 'from', 'good', 'great',
  'have', 'has', 'in', 'is', 'it', 'me', 'my', 'near', 'nearby', 'nice', 'of', 'on', 'or', 'place', 'places',
  'some', 'somewhere', 'spot', 'spots', 'that', 'the', 'there', 'to', 'we', 'what', 'where', 'which', 'with',
])

// Everyday words mapped onto the vocabulary used by place types and amenity
// labels, so "dog friendly hike" finds pet-friendly trails.
const SYNONYMS: Record<string, string[]> = {
  dog: ['pet'],
  dogs: ['pet'],
  puppy: ['pet'],
  pets: ['pet'],
  restroom: ['bathrooms'],
  restrooms: ['bathrooms'],
  toilet: ['bathrooms'],
  toilets: ['bathrooms'],
  shade: ['shaded'],
  shady: ['shaded'],
  kid: ['playground'],
  kids: ['playground'],
  children: ['playground'],
  family: ['playground', 'picnic'],
  toddler: ['playground'],
  coffee: ['cafe'],
  espresso: ['cafe'],
  latte: ['cafe'],
  study: ['library', 'wifi', 'quiet'],
  work: ['wifi', 'cafe'],
  laptop: ['wifi'],
  internet: ['wifi'],
  read: ['library', 'quiet'],
  reading: ['library', 'quiet'],
  books: ['library'],
  hike: ['trail'],
  hiking: ['trail'],
  walk: ['trail'],
  run: ['trail'],
  jog: ['trail'],
  sunset: ['viewpoint', 'scenic', 'beach'],
  sunrise: ['viewpoint', 'scenic'],
  view: ['viewpoint', 'scenic'],
  views: ['viewpoint', 'scenic'],
  overlook: ['viewpoint', 'scenic'],
  swim: ['beach'],
  swimming: ['beach'],
  ocean: ['beach'],
  surf: ['beach'],
  sand: ['beach'],
  bbq: ['grills', 'picnic'],
  barbecue: ['grills', 'picnic'],
  grill: ['grills'],
  cookout: ['grills', 'picnic'],
  lunch: ['picnic', 'food'],
  eat: ['food', 'market'],
  snacks: ['food'],
  farmers: ['market'],
  flowers: ['garden'],
  botanical: ['garden'],
  roses: ['garden'],
  art: ['museum'],
  exhibit: ['museum'],
  basketball: ['sports', 'courts'],
  tennis: ['sports', 'courts'],
  pickleball: ['sports', 'courts'],
  skate: ['sports'],
  volleyball: ['sports', 'courts', 'beach'],
  soccer: ['sports'],
  accessible: ['wheelchair'],
  stroller: ['wheelchair'],
  calm: ['quiet'],
  peaceful: ['quiet'],
  relax: ['quiet', 'shaded'],
  night: ['dark'],
  evening: ['dark'],
  metro: ['transit'],
  train: ['transit'],
  bus: ['transit'],
  group: ['groups'],
  party: ['groups', 'picnic'],
  birthday: ['groups', 'picnic'],
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 1)
    .slice(0, 16)
}

export function buildTsQuery(text: string, mode: SearchMode): string | null {
  const tokens = tokenize(text)

  if (mode === 'prefix') {
    const terms = tokens.filter((t) => !STOP_WORDS.has(t) || tokens.length === 1)
    return terms.length ? terms.map((t) => `${t}:*`).join(' & ') : null
  }

  const terms = new Set<string>()
  for (const token of tokens) {
    if (STOP_WORDS.has(token)) continue
    terms.add(token)
    for (const synonym of SYNONYMS[token] ?? []) terms.add(synonym)
  }
  return terms.size ? [...terms].map((t) => `${t}:*`).join(' | ') : null
}
