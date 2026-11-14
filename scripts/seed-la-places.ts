import { PrismaClient } from '../lib/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})
const prisma = new PrismaClient({ adapter })

const API_KEY = process.env.GOOGLE_MAPS_API_KEY

type Spot = {
  name: string
  query: string
  type: 'park' | 'plaza' | 'cafe' | 'trail' | 'other'
  amenities: string[]
  description: string
}

const amenities = [
  { slug: 'pet-friendly', label: 'Pet friendly', icon: 'dog' },
  { slug: 'bathrooms', label: 'Bathrooms nearby', icon: 'toilet' },
  { slug: 'shaded', label: 'Shaded seating', icon: 'tree' },
  { slug: 'free-parking', label: 'Free parking', icon: 'car' },
  { slug: 'wifi', label: 'Free wifi', icon: 'wifi' },
  { slug: 'playground', label: 'Playground', icon: 'blocks' },
  { slug: 'food-nearby', label: 'Food nearby', icon: 'utensils' },
  { slug: 'quiet', label: 'Quiet', icon: 'volume-x' },
  { slug: 'wheelchair', label: 'Wheelchair accessible', icon: 'accessibility' },
  { slug: 'picnic-tables', label: 'Picnic tables', icon: 'armchair' },
]

const spots: Spot[] = [
  // Central LA & downtown
  {
    name: 'Griffith Observatory',
    query: 'Griffith Observatory Los Angeles',
    type: 'other',
    amenities: ['bathrooms', 'free-parking', 'wheelchair', 'quiet'],
    description:
      'Art deco observatory on the south slope of Griffith Park with free telescopes, a planetarium and the best sunset view of the LA basin.',
  },
  {
    name: 'Fern Dell Nature Trail',
    query: 'Fern Dell Nature Trail Griffith Park Los Angeles',
    type: 'trail',
    amenities: ['shaded', 'bathrooms', 'pet-friendly', 'free-parking'],
    description:
      'Shaded creek-side walk through ferns and sycamores at the base of Griffith Park. A short loop that stays cool even in August.',
  },
  {
    name: 'Runyon Canyon Park',
    query: 'Runyon Canyon Park Los Angeles',
    type: 'trail',
    amenities: ['pet-friendly', 'bathrooms'],
    description:
      'Steep dirt fire road above Hollywood with off-leash dog hours and skyline views from downtown to the ocean.',
  },
  {
    name: 'Lake Hollywood Park',
    query: 'Lake Hollywood Park Los Angeles',
    type: 'park',
    amenities: ['pet-friendly', 'free-parking', 'shaded', 'bathrooms'],
    description:
      'Grassy dog-friendly park under the Hollywood Sign with a view of the reservoir dam and quiet morning walks.',
  },
  {
    name: 'Barnsdall Art Park',
    query: 'Barnsdall Art Park Los Angeles',
    type: 'park',
    amenities: ['shaded', 'bathrooms', 'wheelchair', 'quiet'],
    description:
      "Olive-tree lawn around Frank Lloyd Wright's Hollyhock House, with Friday night wine tastings and city views.",
  },
  {
    name: 'Echo Park Lake',
    query: 'Echo Park Lake Los Angeles',
    type: 'park',
    amenities: ['bathrooms', 'food-nearby', 'pet-friendly', 'wheelchair'],
    description:
      'Lotus-filled lake with a one-mile loop, pedal boats and picnic lawns a short walk from the Sunset Blvd cafes.',
  },
  {
    name: 'Vista Hermosa Natural Park',
    query: 'Vista Hermosa Natural Park Los Angeles',
    type: 'park',
    amenities: ['playground', 'bathrooms', 'shaded', 'wheelchair'],
    description:
      'Rolling lawns and a stream just west of downtown with skyline views and a nature play area for kids.',
  },
  {
    name: 'Grand Park',
    query: 'Grand Park Los Angeles',
    type: 'plaza',
    amenities: ['bathrooms', 'food-nearby', 'wheelchair', 'shaded'],
    description:
      'Four-block civic lawn between Grand Ave and City Hall, with fountains, food trucks and free lunchtime events.',
  },
  {
    name: 'Pershing Square',
    query: 'Pershing Square Los Angeles',
    type: 'plaza',
    amenities: ['food-nearby', 'wheelchair', 'bathrooms'],
    description:
      "Downtown's historic square with a concert stage, a seasonal ice rink and plenty of benches for people-watching.",
  },
  {
    name: 'Los Angeles State Historic Park',
    query: 'Los Angeles State Historic Park',
    type: 'park',
    amenities: ['bathrooms', 'wheelchair', 'quiet', 'shaded'],
    description:
      'Reclaimed rail yard turned 32-acre park with a wide lawn, wetlands and Chinatown views.',
  },
  {
    name: 'Exposition Park Rose Garden',
    query: 'Exposition Park Rose Garden Los Angeles',
    type: 'park',
    amenities: ['shaded', 'bathrooms', 'wheelchair', 'quiet'],
    description:
      'Sunken seven-acre rose garden with thousands of bushes, free to wander and steps from the museums.',
  },
  {
    name: 'Baldwin Hills Scenic Overlook',
    query: 'Baldwin Hills Scenic Overlook Culver City',
    type: 'trail',
    amenities: ['free-parking', 'bathrooms', 'quiet'],
    description:
      '282-step staircase (or a switchback trail) up to a plateau with a full sweep from downtown to the Pacific.',
  },
  {
    name: 'Kenneth Hahn State Recreation Area',
    query: 'Kenneth Hahn State Recreation Area Los Angeles',
    type: 'park',
    amenities: ['bathrooms', 'free-parking', 'playground', 'picnic-tables'],
    description:
      'Big county park in the Baldwin Hills with fishing lakes, picnic shelters and ridge trails above the city.',
  },
  {
    name: 'MacArthur Park',
    query: 'MacArthur Park Los Angeles',
    type: 'park',
    amenities: ['bathrooms', 'food-nearby', 'wheelchair'],
    description:
      'Historic lake park west of downtown, lively with street vendors and weekend soccer games.',
  },
  {
    name: 'Seoul International Park',
    query: 'Seoul International Park Los Angeles',
    type: 'park',
    amenities: ['bathrooms', 'free-parking', 'playground', 'shaded'],
    description:
      "Koreatown's community park with a playground, basketball courts and shaded picnic shelters.",
  },
  {
    name: 'La Brea Tar Pits Park',
    query: 'La Brea Tar Pits Los Angeles',
    type: 'park',
    amenities: ['bathrooms', 'wheelchair', 'shaded', 'food-nearby'],
    description:
      'Ice Age fossil seeps in the middle of the city, with lawns to picnic on and the museum next door.',
  },
  {
    name: 'Pan Pacific Park',
    query: 'Pan Pacific Park Los Angeles',
    type: 'park',
    amenities: ['playground', 'bathrooms', 'free-parking', 'shaded'],
    description:
      'Big lawn, pool and playground next to the Grove — an easy family afternoon with parking on site.',
  },
  {
    name: 'Heritage Square Museum',
    query: 'Heritage Square Museum Los Angeles',
    type: 'other',
    amenities: ['free-parking', 'bathrooms', 'shaded', 'quiet'],
    description:
      'Victorian houses moved onto a quiet Highland Park lawn; weekend tours and a very calm picnic spot.',
  },
  {
    name: 'Grand Central Market',
    query: 'Grand Central Market Los Angeles',
    type: 'other',
    amenities: ['food-nearby', 'bathrooms', 'wheelchair'],
    description:
      "Downtown's 1917 market hall with 30+ stalls, from tacos and pupusas to oysters and coffee.",
  },
  {
    name: 'The Original Farmers Market',
    query: 'Original Farmers Market Los Angeles 3rd Fairfax',
    type: 'other',
    amenities: ['food-nearby', 'bathrooms', 'wheelchair', 'free-parking'],
    description:
      'Third & Fairfax institution since 1934 with global food counters, shaded patios and a lot of people-watching.',
  },

  // Westside & beaches
  {
    name: 'Venice Beach Boardwalk',
    query: 'Venice Beach Boardwalk Los Angeles',
    type: 'plaza',
    amenities: ['food-nearby', 'bathrooms', 'pet-friendly', 'wheelchair'],
    description:
      'The classic Ocean Front Walk: skate park, Muscle Beach, street performers and sunset crowds.',
  },
  {
    name: 'Santa Monica Pier',
    query: 'Santa Monica Pier',
    type: 'other',
    amenities: ['food-nearby', 'bathrooms', 'wheelchair'],
    description:
      'Ferris wheel, arcade and a fishing deck over the water at the end of Route 66.',
  },
  {
    name: 'Palisades Park',
    query: 'Palisades Park Santa Monica',
    type: 'park',
    amenities: ['shaded', 'bathrooms', 'wheelchair', 'quiet'],
    description:
      'Clifftop palm-lined path above the Santa Monica bluffs — best at golden hour, with benches the whole way.',
  },
  {
    name: 'Tongva Park',
    query: 'Tongva Park Santa Monica',
    type: 'park',
    amenities: ['playground', 'bathrooms', 'shaded', 'wheelchair'],
    description:
      'Modern terraced park with observation decks and splash play, two blocks from the pier.',
  },
  {
    name: 'Burton Chace Park',
    query: 'Burton Chace Park Marina del Rey',
    type: 'park',
    amenities: ['bathrooms', 'picnic-tables', 'quiet', 'wheelchair'],
    description:
      "Marina del Rey's waterfront lawn with harbor views, picnic tables and free summer concerts.",
  },
  {
    name: 'Dockweiler State Beach',
    query: 'Dockweiler State Beach Playa del Rey',
    type: 'other',
    amenities: ['bathrooms', 'free-parking', 'pet-friendly'],
    description:
      'Wide stretch of sand with fire pits, a bike path and plane-spotting right under the LAX flight path.',
  },
  {
    name: 'Manhattan Beach Pier',
    query: 'Manhattan Beach Pier',
    type: 'other',
    amenities: ['food-nearby', 'bathrooms', 'wheelchair'],
    description:
      'Roundhouse aquarium at the end of the pier, with the Strand bike path running along the sand.',
  },
  {
    name: 'Hermosa Beach Pier',
    query: 'Hermosa Beach Pier',
    type: 'other',
    amenities: ['food-nearby', 'bathrooms', 'wheelchair'],
    description:
      'Short pier at the foot of Pier Ave, surrounded by beach volleyball courts and casual bars.',
  },
  {
    name: 'King Harbor Marina',
    query: 'King Harbor Marina Redondo Beach',
    type: 'park',
    amenities: ['bathrooms', 'food-nearby', 'wheelchair', 'picnic-tables'],
    description:
      "Redondo's harbor walk with sportfishing docks, seaside cafes and a protected swimming lagoon.",
  },
  {
    name: 'Culver City Park',
    query: 'Culver City Park Culver City',
    type: 'park',
    amenities: ['bathrooms', 'free-parking', 'playground', 'shaded'],
    description:
      'Hillside park with a skate park, ball fields and a view toward the Ballona wetlands.',
  },
  {
    name: 'Media Park',
    query: 'Media Park Culver City',
    type: 'park',
    amenities: ['shaded', 'quiet', 'food-nearby', 'wheelchair'],
    description:
      'Small downtown Culver City green with a stream, benches and restaurants on every side.',
  },
  {
    name: 'Holmby Park',
    query: 'Holmby Park Los Angeles',
    type: 'park',
    amenities: ['shaded', 'bathrooms', 'quiet', 'free-parking'],
    description:
      'Westwood lawn with a lawn-bowling green and old ficus trees — a calm lunch-break spot.',
  },
  {
    name: 'Mildred E. Mathias Botanical Garden',
    query: 'Mildred E. Mathias Botanical Garden Los Angeles',
    type: 'other',
    amenities: ['shaded', 'quiet', 'wheelchair', 'bathrooms'],
    description:
      'Free seven-acre garden on the UCLA campus with a stream and themed plant collections.',
  },
  {
    name: 'Stoner Park',
    query: 'Stoner Park Los Angeles',
    type: 'park',
    amenities: ['bathrooms', 'free-parking', 'playground', 'shaded'],
    description:
      'West LA park with a pool, tennis courts and a big recreation center.',
  },
  {
    name: 'Mar Vista Recreation Center',
    query: 'Mar Vista Recreation Center Los Angeles',
    type: 'park',
    amenities: ['bathrooms', 'free-parking', 'playground', 'shaded'],
    description:
      'Neighborhood rec center with ball fields, a pool and a fenced dog park.',
  },
  {
    name: 'Beverly Gardens Park',
    query: 'Beverly Gardens Park Beverly Hills',
    type: 'park',
    amenities: ['shaded', 'wheelchair', 'quiet', 'bathrooms'],
    description:
      'Two-mile rose-lined greenway along Santa Monica Blvd with the landmark Beverly Hills sign.',
  },
  {
    name: 'Greystone Mansion Gardens',
    query: 'Greystone Mansion Beverly Hills',
    type: 'park',
    amenities: ['free-parking', 'bathrooms', 'quiet', 'shaded'],
    description:
      'Tudor mansion grounds with terraced lawns and city views; a favorite quiet picnic spot.',
  },
  {
    name: 'Plummer Park',
    query: 'Plummer Park West Hollywood',
    type: 'park',
    amenities: ['shaded', 'bathrooms', 'playground', 'wheelchair'],
    description:
      "West Hollywood's neighborhood park with lawns, a playground and a busy senior center.",
  },
  {
    name: 'Franklin Canyon Park',
    query: 'Franklin Canyon Park Beverly Hills',
    type: 'trail',
    amenities: ['free-parking', 'bathrooms', 'shaded', 'quiet'],
    description:
      'Hidden canyon lake and duck pond in the hills above Beverly Hills, with easy shaded loops.',
  },

  // Santa Monica Mountains & Malibu
  {
    name: 'Zuma Beach',
    query: 'Zuma Beach Malibu',
    type: 'other',
    amenities: ['bathrooms', 'free-parking', 'pet-friendly'],
    description:
      'Long, wide Malibu sand with lifeguard towers, volleyball nets and reliable surf.',
  },
  {
    name: 'Point Dume State Beach',
    query: 'Point Dume State Beach Malibu',
    type: 'trail',
    amenities: ['bathrooms', 'free-parking', 'quiet'],
    description:
      'Short bluff trail above a crescent cove; whale-watching in winter and climbers on the sea cliffs.',
  },
  {
    name: 'Malibu Bluffs Park',
    query: 'Malibu Bluffs Park',
    type: 'park',
    amenities: ['playground', 'bathrooms', 'free-parking', 'shaded'],
    description:
      'Clifftop community park with ball fields, a playground and a head-on view of the Pacific.',
  },
  {
    name: 'Malibu Pier',
    query: 'Malibu Pier',
    type: 'other',
    amenities: ['food-nearby', 'bathrooms', 'wheelchair'],
    description:
      'Historic pier with a cafe at the end and Surfrider Beach breaking just to the east.',
  },
  {
    name: 'Temescal Canyon Park',
    query: 'Temescal Canyon Park Pacific Palisades',
    type: 'trail',
    amenities: ['free-parking', 'bathrooms', 'shaded', 'pet-friendly'],
    description:
      'Loop trail through sycamores to a waterfall and ridge views over Pacific Palisades.',
  },
  {
    name: 'Will Rogers State Historic Park',
    query: 'Will Rogers State Historic Park Pacific Palisades',
    type: 'park',
    amenities: ['free-parking', 'bathrooms', 'shaded', 'picnic-tables'],
    description:
      'Ranch lawns and polo fields below Inspiration Point, a gentle climb with ocean views.',
  },
  {
    name: 'Malibu Creek State Park',
    query: 'Malibu Creek State Park Calabasas',
    type: 'trail',
    amenities: ['free-parking', 'bathrooms', 'shaded', 'pet-friendly'],
    description:
      'Rock pools, the old M*A*S*H filming site and 15 miles of trails in the Santa Monica Mountains.',
  },
  {
    name: 'Paramount Ranch',
    query: 'Paramount Ranch Agoura Hills',
    type: 'trail',
    amenities: ['free-parking', 'bathrooms', 'pet-friendly', 'quiet'],
    description:
      'Old western film set turned trailhead in the Santa Monica Mountains, with wide open meadows.',
  },

  // San Fernando Valley
  {
    name: 'Wilacre Park',
    query: 'Wilacre Park Los Angeles Fryman Canyon',
    type: 'trail',
    amenities: ['free-parking', 'bathrooms', 'shaded', 'pet-friendly'],
    description:
      'Fryman Canyon loop through oak and eucalyptus with a ridge view over the whole Valley.',
  },
  {
    name: 'Lake Balboa',
    query: 'Lake Balboa Park Los Angeles',
    type: 'park',
    amenities: ['bathrooms', 'free-parking', 'playground', 'picnic-tables'],
    description:
      'Lake with swan boats, a Japanese garden and a flat 1.3-mile path in the Sepulveda Basin.',
  },
  {
    name: 'Sepulveda Basin Wildlife Reserve',
    query: 'Sepulveda Basin Wildlife Reserve Los Angeles',
    type: 'trail',
    amenities: ['free-parking', 'quiet', 'shaded'],
    description:
      'Wetland ponds and bird blinds in the middle of the Valley — best at dawn, bring binoculars.',
  },
  {
    name: 'Hansen Dam Recreation Area',
    query: 'Hansen Dam Recreation Area Lake View Terrace',
    type: 'park',
    amenities: ['bathrooms', 'free-parking', 'playground', 'picnic-tables'],
    description:
      'Big county recreation area with a lake, a summer swim lagoon and miles of paved path.',
  },
  {
    name: 'Warner Center Park',
    query: 'Warner Center Park Woodland Hills',
    type: 'park',
    amenities: ['playground', 'bathrooms', 'free-parking', 'shaded'],
    description:
      'Woodland Hills lawn with a playground and free summer concerts on the grass.',
  },
  {
    name: 'Chatsworth Park South',
    query: 'Chatsworth Park South Chatsworth',
    type: 'park',
    amenities: ['free-parking', 'bathrooms', 'picnic-tables', 'shaded'],
    description:
      'Oak-shaded park at the foot of Stoney Point, gateway to the Chatsworth trails.',
  },
  {
    name: 'Stough Canyon Nature Center',
    query: 'Stough Canyon Nature Center Burbank',
    type: 'trail',
    amenities: ['free-parking', 'bathrooms', 'shaded'],
    description:
      'Trailhead into the Verdugo Mountains above Burbank, with a small nature center and a ridge climb.',
  },
  {
    name: 'Verdugo Park',
    query: 'Verdugo Park Glendale',
    type: 'park',
    amenities: ['playground', 'bathrooms', 'free-parking', 'picnic-tables'],
    description:
      "Glendale's big multi-use park with ball fields, tennis courts and lots of picnic tables.",
  },
  {
    name: 'NoHo Arts District Plaza',
    query: 'NoHo Arts District North Hollywood',
    type: 'plaza',
    amenities: ['food-nearby', 'wheelchair', 'shaded'],
    description:
      'Walkable theater district around Lankershim and Magnolia with coffee, murals and outdoor tables.',
  },

  // Pasadena & the foothills
  {
    name: 'Central Park Pasadena',
    query: 'Central Park Pasadena',
    type: 'park',
    amenities: ['playground', 'bathrooms', 'shaded', 'wheelchair'],
    description:
      "Old-growth Pasadena park with a kids' play area and lawns a block from Old Town.",
  },
  {
    name: 'Garfield Park',
    query: 'Garfield Park South Pasadena',
    type: 'park',
    amenities: ['shaded', 'bathrooms', 'playground', 'picnic-tables'],
    description:
      "South Pasadena's tree-filled park with a band shell and a summer concert series.",
  },
  {
    name: 'Rose Bowl Loop',
    query: 'Rose Bowl Stadium Pasadena',
    type: 'trail',
    amenities: ['free-parking', 'bathrooms', 'pet-friendly', 'shaded'],
    description:
      'Flat 3.1-mile loop around the stadium — the standard Pasadena run-walk, busy at sunset.',
  },
  {
    name: 'Eaton Canyon Falls Trail',
    query: 'Eaton Canyon Natural Area Pasadena',
    type: 'trail',
    amenities: ['free-parking', 'bathrooms', 'shaded', 'pet-friendly'],
    description:
      'Popular 3.5-mile out-and-back to a 40-foot waterfall at the base of the San Gabriels.',
  },
  {
    name: 'Hahamongna Watershed Park',
    query: 'Hahamongna Watershed Park Pasadena',
    type: 'trail',
    amenities: ['free-parking', 'bathrooms', 'pet-friendly', 'shaded'],
    description:
      'Oak-shaded flood basin with dirt trails, disc golf and a creek that runs in spring.',
  },
  {
    name: 'Descanso Gardens',
    query: 'Descanso Gardens La Canada Flintridge',
    type: 'other',
    amenities: ['free-parking', 'bathrooms', 'shaded', 'wheelchair'],
    description:
      'Camellia forest and oak woodland in La Cañada with a tram, a cafe and a lot of shade.',
  },
  {
    name: 'Farnsworth Park',
    query: 'Farnsworth Park Altadena',
    type: 'park',
    amenities: ['free-parking', 'bathrooms', 'playground', 'shaded'],
    description:
      "Altadena's hillside park with a WPA-era amphitheater and mountain views.",
  },
  {
    name: 'Huntington Library Gardens',
    query: 'The Huntington Library Art Collections and Botanical Gardens San Marino',
    type: 'other',
    amenities: ['free-parking', 'bathrooms', 'shaded', 'wheelchair'],
    description:
      '120 acres of themed gardens — desert, Japanese, rose — plus tea rooms in San Marino.',
  },
  {
    name: 'Lacy Park',
    query: 'Lacy Park San Marino',
    type: 'park',
    amenities: ['free-parking', 'bathrooms', 'shaded', 'playground'],
    description:
      "San Marino's manicured 30-acre park with a rose arbor and a soft walking loop.",
  },
  {
    name: 'Monrovia Canyon Park',
    query: 'Monrovia Canyon Park',
    type: 'trail',
    amenities: ['free-parking', 'bathrooms', 'shaded', 'quiet'],
    description:
      'Canyon trail to a small waterfall under live oaks above Monrovia.',
  },
  {
    name: 'Sierra Madre Memorial Park',
    query: 'Memorial Park Sierra Madre',
    type: 'park',
    amenities: ['shaded', 'bathrooms', 'playground', 'picnic-tables'],
    description:
      'Shaded foothill park with a wading pool, tennis courts and a small band shell.',
  },

  // San Gabriel Valley & east
  {
    name: 'Almansor Park',
    query: 'Almansor Park Alhambra',
    type: 'park',
    amenities: ['bathrooms', 'free-parking', 'playground', 'picnic-tables'],
    description:
      "Alhambra's lakeside park with a walking path, ducks and weekend tai chi groups.",
  },
  {
    name: 'Barnes Park',
    query: 'Barnes Park Monterey Park',
    type: 'park',
    amenities: ['bathrooms', 'free-parking', 'playground', 'shaded'],
    description:
      "Monterey Park's central park with a pool, courts and a big lawn for picnics.",
  },
  {
    name: 'Santa Anita County Park',
    query: 'Santa Anita Park Arcadia',
    type: 'park',
    amenities: ['bathrooms', 'free-parking', 'playground', 'picnic-tables'],
    description:
      'Arcadia park with a lake, a pool and plenty of shade trees behind the racetrack.',
  },
  {
    name: 'Whittier Narrows Recreation Area',
    query: 'Whittier Narrows Recreation Area South El Monte',
    type: 'park',
    amenities: ['bathrooms', 'free-parking', 'picnic-tables', 'playground'],
    description:
      'Sprawling county park with lakes, fishing and a nature center south of El Monte.',
  },
  {
    name: 'Legg Lake',
    query: 'Legg Lake Whittier Narrows',
    type: 'park',
    amenities: ['bathrooms', 'free-parking', 'picnic-tables', 'pet-friendly'],
    description:
      'Three-lake fishing spot in Whittier Narrows with a flat three-mile loop and lots of water birds.',
  },
  {
    name: 'Frank G. Bonelli Regional Park',
    query: 'Frank G. Bonelli Regional Park San Dimas',
    type: 'park',
    amenities: ['bathrooms', 'free-parking', 'playground', 'picnic-tables'],
    description:
      'Puddingstone Lake park in San Dimas with swimming, boat rentals and ridge trails.',
  },
  {
    name: 'Schabarum Regional Park',
    query: 'Peter F. Schabarum Regional Park Rowland Heights',
    type: 'trail',
    amenities: ['free-parking', 'bathrooms', 'shaded', 'picnic-tables'],
    description:
      'Hacienda Heights trailhead into the Puente Hills with a creek and equestrian paths.',
  },
  {
    name: 'Cerritos Regional County Park',
    query: 'Cerritos Regional County Park',
    type: 'park',
    amenities: ['bathrooms', 'free-parking', 'playground', 'picnic-tables'],
    description:
      'Lake, summer swim lagoon and a fitness loop in Cerritos.',
  },
  {
    name: 'La Mirada Regional Park',
    query: 'La Mirada Regional Park',
    type: 'park',
    amenities: ['bathrooms', 'free-parking', 'playground', 'picnic-tables'],
    description:
      'Big regional park with a lake, a golf course and shaded picnic areas.',
  },

  // South Bay & harbor
  {
    name: 'Shoreline Aquatic Park',
    query: 'Shoreline Aquatic Park Long Beach',
    type: 'park',
    amenities: ['bathrooms', 'food-nearby', 'wheelchair', 'shaded'],
    description:
      'Lighthouse-topped point in Long Beach with lawns facing the Queen Mary and the harbor.',
  },
  {
    name: 'Bluff Park',
    query: 'Bluff Park Long Beach',
    type: 'park',
    amenities: ['shaded', 'bathrooms', 'quiet', 'wheelchair'],
    description:
      'Long clifftop green above the Long Beach bluff with palm trees and ocean sunsets.',
  },
  {
    name: 'El Dorado Nature Center',
    query: 'El Dorado Nature Center Long Beach',
    type: 'trail',
    amenities: ['free-parking', 'bathrooms', 'shaded', 'quiet'],
    description:
      'Two miles of dirt and paved loops through lakes, sycamores and heron habitat in east Long Beach.',
  },
  {
    name: 'Hilltop Park',
    query: 'Hilltop Park Signal Hill',
    type: 'park',
    amenities: ['free-parking', 'quiet', 'shaded'],
    description:
      "Signal Hill's summit lawn with a 360-degree view from the harbor to the San Gabriels.",
  },
  {
    name: 'Point Fermin Park',
    query: 'Point Fermin Park San Pedro',
    type: 'park',
    amenities: ['bathrooms', 'free-parking', 'shaded', 'picnic-tables'],
    description:
      'Clifftop park around the 1874 lighthouse, with tide pools and pelicans below.',
  },
  {
    name: 'Royal Palms Beach',
    query: 'Royal Palms State Beach San Pedro',
    type: 'other',
    amenities: ['bathrooms', 'free-parking', 'pet-friendly'],
    description:
      'Rocky San Pedro cove with tide pools and a county beach that stays quiet on weekdays.',
  },
  {
    name: 'Edward Vincent Jr. Park',
    query: 'Edward Vincent Jr Park Inglewood',
    type: 'park',
    amenities: ['bathrooms', 'free-parking', 'playground', 'picnic-tables'],
    description:
      "Inglewood's main park with a pool, a stadium and wide lawns for pickup games.",
  },
  {
    name: 'Rowley Park',
    query: 'Rowley Park Gardena',
    type: 'park',
    amenities: ['bathrooms', 'free-parking', 'playground', 'shaded'],
    description:
      'Gardena neighborhood park with a playground, basketball courts and plenty of benches.',
  },

  // Coffee & food hangouts
  {
    name: 'Urth Caffé Melrose',
    query: 'Urth Caffe Melrose Los Angeles',
    type: 'cafe',
    amenities: ['food-nearby', 'wifi', 'shaded', 'wheelchair'],
    description:
      'Organic coffee and a leafy patio on Melrose — a long-running LA hangout for a slow morning.',
  },
  {
    name: 'Intelligentsia Silver Lake',
    query: 'Intelligentsia Coffee Silver Lake Los Angeles',
    type: 'cafe',
    amenities: ['wifi', 'food-nearby', 'wheelchair'],
    description:
      'Sunset Junction coffee bar with a sunny patio and serious espresso.',
  },
  {
    name: 'Blue Bottle Arts District',
    query: 'Blue Bottle Coffee Arts District Los Angeles',
    type: 'cafe',
    amenities: ['wifi', 'food-nearby', 'wheelchair'],
    description:
      'Warehouse-district coffee bar in the Arts District, good for a laptop afternoon.',
  },
  {
    name: 'Philz Coffee Santa Monica',
    query: 'Philz Coffee Santa Monica',
    type: 'cafe',
    amenities: ['wifi', 'food-nearby', 'wheelchair'],
    description:
      'Mint Mojito iced coffee and a big communal table a few blocks from the Promenade.',
  },
  {
    name: 'Coffee Commissary Burbank',
    query: 'Coffee Commissary Burbank',
    type: 'cafe',
    amenities: ['wifi', 'food-nearby', 'free-parking'],
    description:
      'Burbank roastery cafe with a patio, reliable wifi and a steady local crowd.',
  },
]

type Resolved = { id: string; name: string; address: string; lat: number; lng: number }

async function resolve(query: string): Promise<Resolved | null> {
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY!,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location',
    },
    body: JSON.stringify({ textQuery: query, maxResultCount: 1, regionCode: 'US' }),
  })
  if (!res.ok) {
    console.log('  places error', res.status, (await res.text()).slice(0, 200))
    return null
  }
  const json = (await res.json()) as {
    places?: Array<{
      id: string
      displayName?: { text?: string }
      formattedAddress?: string
      location?: { latitude?: number; longitude?: number }
    }>
  }
  const hit = json.places?.[0]
  if (!hit?.location?.latitude || !hit.location.longitude) return null
  return {
    id: hit.id,
    name: hit.displayName?.text ?? query,
    address: hit.formattedAddress ?? '',
    lat: hit.location.latitude,
    lng: hit.location.longitude,
  }
}

async function main() {
  if (!API_KEY) throw new Error('GOOGLE_MAPS_API_KEY is not set')

  const amenityRows = await Promise.all(
    amenities.map((a) =>
      prisma.amenity.upsert({
        where: { slug: a.slug },
        update: { label: a.label, icon: a.icon },
        create: a,
      }),
    ),
  )
  const amenityBySlug = new Map(amenityRows.map((a) => [a.slug, a.id]))

  const demoUser = await prisma.user.findFirst({ where: { email: 'demo@hangout.app' } })

  let created = 0
  let updated = 0
  const skipped: string[] = []

  for (const spot of spots) {
    const hit = await resolve(spot.query)
    if (!hit) {
      skipped.push(spot.name)
      console.log('SKIP', spot.name)
      continue
    }

    const existing = await prisma.place.findFirst({
      where: {
        OR: [{ googlePlaceId: hit.id }, { name: { equals: spot.name, mode: 'insensitive' } }],
      },
      select: { id: true },
    })

    const data = {
      name: spot.name,
      type: spot.type,
      description: spot.description,
      lat: hit.lat,
      lng: hit.lng,
      address: hit.address,
      googlePlaceId: hit.id,
      approved: true,
    }

    const place = existing
      ? await prisma.place.update({ where: { id: existing.id }, data })
      : await prisma.place.create({ data: { ...data, createdById: demoUser?.id ?? null } })

    if (existing) updated++
    else created++

    await prisma.placeAmenity.deleteMany({ where: { placeId: place.id } })
    const amenityIds = spot.amenities.map((slug) => amenityBySlug.get(slug)).filter((id): id is string => Boolean(id))
    if (amenityIds.length) {
      await prisma.placeAmenity.createMany({
        data: amenityIds.map((amenityId) => ({ placeId: place.id, amenityId })),
        skipDuplicates: true,
      })
    }

    console.log(existing ? 'UPDATED' : 'CREATED', spot.name, '→', hit.address)
    await new Promise((r) => setTimeout(r, 120))
  }

  const total = await prisma.place.count()
  console.log('\nDone.', { created, updated, skipped: skipped.length, totalPlaces: total })
  if (skipped.length) console.log('Skipped:', skipped.join(', '))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
