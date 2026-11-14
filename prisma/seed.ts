import { PrismaClient } from '../lib/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})
const prisma = new PrismaClient({ adapter })

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
  { slug: ' picnic-tables', label: 'Picnic tables', icon: 'armchair' },
]

const places = [
  {
    name: 'Brand Park & Library',
    type: 'park',
    lat: 34.2228,
    lng: -118.2497,
    address: '1601 W Mountain St, Glendale, CA',
    description:
      'Large hillside park with a Japanese garden, playgrounds, picnic areas and the Brand Library art center. A classic spot for weekend picnics and pickup soccer.',
    amenities: ['pet-friendly', 'bathrooms', 'playground', 'free-parking', 'picnic-tables', 'shaded'],
  },
  {
    name: 'Deukmejian Wilderness Park',
    type: 'trail',
    lat: 34.2381,
    lng: -118.2126,
    address: '3429 Markridge Rd, Glendale, CA',
    description:
      'Wilderness park at the foot of the San Gabriels with hiking trails, oak woodland and a historic stone barn. Great for sunrise hikes.',
    amenities: ['bathrooms', 'free-parking', 'quiet', 'shaded'],
  },
  {
    name: 'Adams Square Mini Park',
    type: 'plaza',
    lat: 34.1768,
    lng: -118.2436,
    address: 'Adams St & Palmer Ave, Glendale, CA',
    description:
      'Cozy neighborhood square with a little free library, shaded benches and a weekly farmers market pop-up.',
    amenities: ['shaded', 'quiet', 'food-nearby', 'wheelchair'],
  },
  {
    name: 'Montrose Sunday Market Green',
    type: 'plaza',
    lat: 34.2011,
    lng: -118.2297,
    address: '2200 Honolulu Ave, Montrose, CA',
    description:
      'The weekly Sunday farmers market takes over Honolulu Avenue with produce stalls, live music and coffee. Hang out on the median planters.',
    amenities: ['pet-friendly', 'food-nearby', 'wheelchair', 'bathrooms'],
  },
  {
    name: 'Catalina Verdugo Adobe Lawn',
    type: 'park',
    lat: 34.1903,
    lng: -118.2381,
    address: '2211 Bonita Dr, Glendale, CA',
    description:
      'Historic adobe with a big flat lawn under old oaks. Quiet, rarely crowded, perfect for small picnics and sketch meetups.',
    amenities: ['quiet', 'shaded', 'picnic-tables', 'free-parking'],
  },
  {
    name: 'Grand Central Air Terminal Terrace',
    type: 'cafe',
    lat: 34.1489,
    lng: -118.2542,
    address: '1040 W Broadway, Glendale, CA',
    description:
      'Airy terrace by the restored 1929 air terminal. Coffee, shade structures and aviation history displays.',
    amenities: ['wifi', 'food-nearby', 'wheelchair', 'free-parking'],
  },
  {
    name: 'Maple Park Dog Run',
    type: 'park',
    lat: 34.1566,
    lng: -118.2478,
    address: '820 E Maple St, Glendale, CA',
    description:
      'Neighborhood park with a fenced dog run, splash pad in summer and lots of friendly regulars every evening.',
    amenities: ['pet-friendly', 'playground', 'bathrooms', 'picnic-tables'],
  },
  {
    name: 'Verdugo Bike Path Overlook',
    type: 'trail',
    lat: 34.1837,
    lng: -118.2621,
    address: 'San Fernando Rd, Glendale, CA',
    description:
      'Shaded stretch of the Verdugo Wash bike path with benches and murals. Popular with evening riders and stroller walks.',
    amenities: ['pet-friendly', 'quiet', 'wheelchair'],
  },
]

const communities = [
  {
    slug: 'glendale-outdoors',
    name: 'Glendale Outdoors Club',
    description: 'Weekly hikes, park meetups and trail cleanups around the Verdugos.',
    emoji: '🥾',
  },
  {
    slug: 'montrose-makers',
    name: 'Montrose Makers & Market Goers',
    description: 'Sunday market crew — coffee, crafts and small-business meetups on Honolulu Ave.',
    emoji: '🧺',
  },
  {
    slug: 'pups-of-glendale',
    name: 'Pups of Glendale',
    description: 'Dog parents organizing park playdates and pet-friendly hangouts.',
    emoji: '🐕',
  },
]

async function main() {
  const amenityRows = await Promise.all(
    amenities.map((a) =>
      prisma.amenity.upsert({
        where: { slug: a.slug.trim() },
        update: { label: a.label, icon: a.icon },
        create: { slug: a.slug.trim(), label: a.label, icon: a.icon },
      }),
    ),
  )
  const amenityBySlug = new Map(amenityRows.map((a) => [a.slug, a]))

  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@hangout.app' },
    update: {},
    create: {
      name: 'Demo Neighbor',
      email: 'demo@hangout.app',
      passwordHash: await bcrypt.hash('demo1234', 10),
    },
  })

  const placeRows = []
  for (const p of places) {
    const row = await prisma.place.upsert({
      where: { googlePlaceId: `seed:${p.name}` },
      update: {
        name: p.name,
        description: p.description,
        type: p.type,
        lat: p.lat,
        lng: p.lng,
        address: p.address,
      },
      create: {
        googlePlaceId: `seed:${p.name}`,
        name: p.name,
        description: p.description,
        type: p.type,
        lat: p.lat,
        lng: p.lng,
        address: p.address,
        createdById: demoUser.id,
        amenities: {
          create: p.amenities
            .map((slug) => amenityBySlug.get(slug))
            .filter((a): a is NonNullable<typeof a> => Boolean(a))
            .map((a) => ({ amenityId: a.id })),
        },
      },
    })
    placeRows.push(row)
  }

  const communityRows = []
  for (const c of communities) {
    const row = await prisma.community.upsert({
      where: { slug: c.slug },
      update: { name: c.name, description: c.description, emoji: c.emoji },
      create: {
        slug: c.slug,
        name: c.name,
        description: c.description,
        emoji: c.emoji,
        memberships: { create: { userId: demoUser.id, role: 'organizer' } },
      },
    })
    communityRows.push(row)
  }

  const now = Date.now()
  const day = 24 * 60 * 60 * 1000
  const events = [
    {
      title: 'Sunrise hike at Deukmejian',
      description: 'Easy 3-mile loop, meet at the stone barn parking lot. Bring coffee!',
      startsAt: new Date(now + 3 * day),
      placeIdx: 1,
      communityIdx: 0,
    },
    {
      title: 'Sunday Market stroll',
      description: 'Meet at the Honolulu Ave median, then brunch at a nearby cafe.',
      startsAt: new Date(now + 5 * day),
      placeIdx: 3,
      communityIdx: 1,
    },
    {
      title: 'Puppy playdate & picnic',
      description: 'Dog run hangout, treats provided. All friendly pups welcome.',
      startsAt: new Date(now + 7 * day),
      placeIdx: 6,
      communityIdx: 2,
    },
    {
      title: 'Sketch & sip under the oaks',
      description: 'Casual drawing meetup at the adobe lawn. Some supplies provided.',
      startsAt: new Date(now + 10 * day),
      placeIdx: 4,
      communityIdx: null,
    },
  ]
  for (const e of events) {
    const exists = await prisma.event.findFirst({
      where: { title: e.title, startsAt: e.startsAt },
    })
    if (!exists) {
      await prisma.event.create({
        data: {
          title: e.title,
          description: e.description,
          startsAt: e.startsAt,
          placeId: placeRows[e.placeIdx].id,
          communityId: e.communityIdx === null ? null : communityRows[e.communityIdx].id,
          hostId: demoUser.id,
          rsvps: { create: { userId: demoUser.id, status: 'going' } },
        },
      })
    }
  }

  for (const community of communityRows) {
    const generalThread = await prisma.chatThread.findFirst({
      where: { kind: 'community', communityId: community.id },
    })
    if (!generalThread) {
      await prisma.chatThread.create({
        data: {
          kind: 'community',
          communityId: community.id,
          name: `${community.name} — General`,
          createdById: demoUser.id,
          messages: {
            create: {
              userId: demoUser.id,
              body: 'Welcome! Post your plans and meetups here.',
            },
          },
        },
      })
    }
  }

  console.log('Seed complete:', {
    amenities: amenityRows.length,
    places: placeRows.length,
    communities: communityRows.length,
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
