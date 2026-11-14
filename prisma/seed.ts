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
  { slug: 'picnic-tables', label: 'Picnic tables', icon: 'armchair' },
  { slug: 'water', label: 'Drinking water', icon: 'droplet' },
  { slug: 'restrooms', label: 'Restrooms', icon: 'door-open' },
  { slug: 'night-lights', label: 'Lit after dark', icon: 'lamp' },
  { slug: 'transit', label: 'Near transit', icon: 'train' },
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
    amenities: ['bathrooms', 'free-parking', 'quiet', 'shaded', 'water'],
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
    type: 'market',
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
    amenities: ['pet-friendly', 'quiet', 'wheelchair', 'night-lights'],
  },
]

const communities = [
  {
    slug: 'glendale-outdoors',
    name: 'Glendale Outdoors Club',
    description: 'Weekly hikes, park meetups and trail cleanups around the Verdugos.',
    icon: 'mountain',
    tint: 'green',
  },
  {
    slug: 'montrose-makers',
    name: 'Montrose Makers & Market Goers',
    description: 'Sunday market crew — coffee, crafts and small-business meetups on Honolulu Ave.',
    icon: 'basket',
    tint: 'orange',
  },
  {
    slug: 'pups-of-glendale',
    name: 'Pups of Glendale',
    description: 'Dog parents organizing park playdates and pet-friendly hangouts.',
    icon: 'dog',
    tint: 'brown',
  },
  {
    slug: 'sunset-chasers',
    name: 'Sunset Chasers',
    description: 'Golden hour viewpoints, ridge walks and photo meetups across LA County.',
    icon: 'sunset',
    tint: 'pink',
  },
]

const knowledge = [
  {
    slug: 'how-hangout-works',
    title: 'How Hangout works',
    category: 'Using the app',
    keywords: 'app basics map places events communities chat guide save rsvp',
    body: `Hangout is a map of free and low-cost places to meet up across Los Angeles County. The map is the home screen: pan and zoom to an area, tap a pin to open a place, and use the search field to find spots, events and communities by name or vibe.

Every place has a page with photos, amenities, reviews, upcoming events and nearby spots. Tap the bookmark to save a place to your profile. Tap a pin's event badge to see what is happening there.

Events are meetups with a time and a place. You can RSVP going, maybe or can't go, and the host sees the count. Communities are groups with their own events and a group chat; joining a community adds you to its chat.

The Guide is the AI assistant. It searches the same map, events and communities you see, and can answer practical questions about going out in LA. It can also RSVP or save a place for you when you ask it to.`,
  },
  {
    slug: 'private-accounts',
    title: 'Private accounts and what other people can see',
    category: 'Privacy',
    keywords: 'private account privacy hide profile visibility name attendee member search',
    body: `Turn on a private account in your profile settings. A private account hides you from people search, community member lists and event attendee lists. Where your name would appear, other people see "Private member".

What stays visible: places you add to the map, reviews you write, events you host and communities you create. Those are public contributions, and they are shown under your name so people can trust them. If you want to contribute without your name attached, keep the account private and avoid posting personal details in reviews or event descriptions.

Your email is never shown to anyone. Your saved places, RSVPs and AI chats are only visible to you.

You can switch privacy on or off at any time. Turning it off makes your profile and your past activity visible again.`,
  },
  {
    slug: 'meetup-safety',
    title: 'Staying safe at a first meetup',
    category: 'Safety',
    keywords: 'safety first meetup stranger danger public daylight emergency 911',
    body: `For a first meetup with people you have not met, pick a public, well-used place in daylight: a staffed park, a cafe, a library plaza or a busy trailhead. Tell someone where you are going and when you expect to be back.

Keep the first meetup short and low-commitment — a coffee or a one-hour walk. Arrive and leave on your own. Share your location with a friend if your phone supports it.

Trust your instincts. If something feels off, leave. You do not owe anyone an explanation.

In an emergency call 911. For non-emergency police matters in the City of Los Angeles call 1-877-ASK-LAPD. Hangout is not a background-check service and does not verify identities; the Guide is not a substitute for medical, legal or safety professionals.`,
  },
  {
    slug: 'meetup-etiquette',
    title: 'Meetup etiquette that keeps groups coming back',
    category: 'Etiquette',
    keywords: 'etiquette rsvp cancel no-show late host group size plan',
    body: `RSVP honestly. A "going" is a promise to the host and to everyone deciding whether to show up. If your plans change, switch to "can't go" as early as you can — a day's notice is kind, an hour's notice is still better than silence.

Show up on time, or post in the group chat if you are running late. For groups of more than six, agree on a meeting point that is easy to find: a specific entrance, a fountain, a sign.

Bring what you said you would bring. Split costs before the event, not after. Keep group chats about the plan; move side conversations to a direct message.

Hosts: say the plan plainly — where exactly, how long, how far, what to bring, and whether dogs or kids are welcome. A clear plan is the single biggest reason people show up.`,
  },
  {
    slug: 'parking-in-la',
    title: 'Parking without losing your mind',
    category: 'Getting around',
    keywords: 'parking permit street meters hills beach lot garage ticket',
    body: `Read the signs twice. LA parking rules stack: street cleaning on a specific weekday morning, permit-only zones, time limits, and hillside restrictions that change after dark. A spot that is legal at 4pm can be a ticket at 6pm.

Meters in the City of LA generally run Monday to Saturday, with Sunday often free unless a sign says otherwise. Many beach lots charge a flat day rate and close at sunset.

Hillside and canyon neighborhoods — Hollywood Hills, Laurel Canyon, Beachwood — have permit parking and narrow roads with no turnaround. Park on the flat street below and walk up.

For popular trailheads and farmers markets, arrive before 9am or take transit. Garages downtown often cost less than an hour of circling. Never leave anything visible in the car.`,
  },
  {
    slug: 'metro-and-transit',
    title: 'Taking Metro to a meetup',
    category: 'Getting around',
    keywords: 'metro bus rail tap card transit train station bike',
    body: `Metro rail is the easiest way to reach many meetup spots. The B Line runs through Hollywood to Union Station, the E Line reaches Santa Monica beach, the A Line runs to Long Beach, and the L Line Gold serves Pasadena and Azusa. Buses fill the gaps, and most rail stations have bike racks or lockers.

Pay with a TAP card or contactless fare on your phone. Fares are per boarding with free transfers within a window, and day caps apply.

Trains run roughly 5am to midnight, less often late at night and on Sundays. Check the last train before an evening meetup — rideshare from a station is cheaper than a missed last train.

Bikes are allowed on trains, with more room in the middle cars. Fold your bike or hold it clear of the doors at rush hour.`,
  },
  {
    slug: 'dogs-in-parks',
    title: 'Bringing a dog to a park or trail',
    category: 'With a dog',
    keywords: 'dog pet leash dog park trail rules heat paws',
    body: `Leashes are required on almost every LA city and county park path and trail. Off-leash is only allowed inside designated dog parks, and only if your dog is licensed and vaccinated.

Paved paths get hot enough to burn paws by midday in summer. Test with the back of your hand for five seconds; if it is too hot for you, it is too hot for them. Carry water for the dog, not just for you.

Many trails in the Santa Monica Mountains and Angeles National Forest do not allow dogs at all, and beach rules vary by city: Huntington Dog Beach is off-leash, most LA County beaches allow leashed dogs on the sand path only.

For a first meetup with other dog owners, a fenced dog park is easier than a trail — dogs can greet off-leash in a controlled space and owners can talk.`,
  },
  {
    slug: 'beach-rules',
    title: 'Beach day basics',
    category: 'Outdoors',
    keywords: 'beach sand water swim lifeguard bonfire parking sunset rules',
    body: `Swim near a staffed lifeguard tower. LA County lifeguards generally staff towers from late morning to sunset in summer, with reduced coverage off-season. Rip currents are the real risk: if you are pulled out, swim parallel to shore, not against the current.

Bonfires are allowed only in designated fire rings, and only outside fire-season restrictions. Bring your own wood; gathering driftwood is not allowed. Fires must be out before you leave.

Dogs, glass containers and alcohol are restricted on most LA County beaches. Parking lots often close an hour after sunset, so check the gate time before a sunset meetup.

Marine layer mornings are cool and grey; the sun usually breaks through by early afternoon. Bring a layer even in July.`,
  },
  {
    slug: 'trail-prep',
    title: "Trail prep for LA's hills",
    category: 'Outdoors',
    keywords: 'hike trail water sun exposure poison oak rattlesnake sunrise heat',
    body: `LA trails are steeper and more exposed than they look. Carry more water than feels reasonable — a liter per person for a two-hour hike in summer — and start early. Afternoon heat between June and September is the main reason people get into trouble.

Wear shoes with grip. Loose granite and sand on the downhill side of a trail is where ankles go. Tell someone your route and expected return time; cell service is patchy in canyons.

Watch for rattlesnakes sunning on the trail in spring and early summer, and for poison oak at the edges of shaded paths. Stay on the trail; social trails erode hillsides and damage native plants.

Sunset hikes need a headlamp and a plan for the last stretch in the dark. Gates at many trailheads close at sunset.`,
  },
  {
    slug: 'weather-and-seasons',
    title: 'LA weather, month by month',
    category: 'Outdoors',
    keywords: 'weather season june gloom santa ana rain marine layer sunset time',
    body: `LA has two real seasons: a dry one from May to October and a cooler, occasionally wet one from November to April.

May and June bring "June gloom" — a marine layer that keeps the coast grey until midday while inland neighborhoods are sunny. Plan beach meetups for the afternoon and canyon meetups for the morning.

July to September is hot inland, often 10 to 20 degrees warmer than the coast. Santa Ana winds in fall bring dry heat, clear skies and the highest fire risk; avoid ridge trails on those days.

Winter rain is infrequent but intense. Trails turn to slick clay, canyon roads flood, and creeks rise fast. Check the forecast the morning of a hike.

Sunset in LA runs from about 4:50pm in December to 8:10pm in late June. Evening meetups should be planned around it.`,
  },
  {
    slug: 'group-events-and-permits',
    title: 'When a meetup needs a permit',
    category: 'Planning',
    keywords: 'permit reservation picnic shelter group size amplified sound field sports',
    body: `A casual meetup of friends rarely needs a permit. A public event with a crowd, amplified sound, a table, sales or signage usually does.

LA city parks: groups above roughly 25 people, or any use of a reserved picnic shelter or sports field, need a reservation through the Department of Recreation and Parks. County parks have their own reservation system. Beach fire rings and group picnic areas are first-come or reservable depending on the site.

Amplified sound, filming and drones need separate permits almost everywhere. Alcohol is prohibited in most parks without a permit.

If your meetup grows past a dozen people, call the park office a week ahead. It is usually free to ask, and it prevents being asked to leave.`,
  },
  {
    slug: 'free-things-to-do',
    title: 'Free and cheap things to do',
    category: 'Ideas',
    keywords: 'free cheap budget museum farmers market library hike sunset picnic',
    body: `Most of the best meetups in LA cost nothing. Hiking trails, beach walks, park picnics, farmers markets, library events and sunset viewpoints are all free.

Museums: many LA museums have free days or pay-what-you-wish hours, and the Getty is free with paid parking. Libraries run free classes, film nights and book clubs, and their meeting rooms can be reserved.

Farmers markets are free to walk and cheap to eat at: Grand Central Market downtown, the Original Farmers Market at Fairfax, and neighborhood markets in Montrose, Silver Lake and Mar Vista.

For a low-cost group plan: a picnic where everyone brings one thing, a coffee walk, a free gallery opening, or a pickup game at a public court.`,
  },
  {
    slug: 'fair-meeting-points',
    title: 'Choosing a fair meeting point',
    category: 'Planning',
    keywords: 'meeting point midpoint fair distance commute group different neighborhoods',
    body: `When people are coming from different neighborhoods, the fair spot is rarely the middle of the map — it is the place that minimizes the worst commute.

Ask each person for their starting neighborhood, then look for a well-connected place near the centroid: a park or cafe near a Metro station, or a plaza with parking. Somewhere central but hard to reach is worse than somewhere slightly off-center that everyone can get to.

For two people, a midpoint along the freeway or rail line they both use works well. For a group of four or more, favor a place with transit, parking and food nearby so nobody has to drive far after dark.

The Guide can do this for you: tell it where everyone is coming from and ask for a fair meeting point.`,
  },
  {
    slug: 'accessibility',
    title: 'Finding accessible spots',
    category: 'Access',
    keywords: 'accessibility wheelchair accessible paved flat restrooms parking ramp',
    body: `Filter the map by the wheelchair amenity to see places with accessible features. Paved, flat paths and staffed restrooms are the two things to check first.

Beach access: several LA County beaches have accessible mats and beach wheelchairs available from lifeguard towers, including Santa Monica and Manhattan Beach. Ask a lifeguard; they are free to borrow.

Trails: paved paths such as the lower Franklin Canyon loop, the Ballona Creek path and the Griffith Observatory grounds are the most reliable. Dirt trails with steep grades are not.

Restrooms: park restrooms are not always open off-season. A cafe or library nearby is a safer bet. If a place's page does not list what you need, ask in the community chat before you go.`,
  },
  {
    slug: 'hosting-a-good-meetup',
    title: 'Hosting a meetup people actually show up to',
    category: 'Planning',
    keywords: 'host event plan time place description invite reminder first timer',
    body: `Pick a specific place, not a neighborhood. "Griffith Observatory, the lawn below the west steps" beats "Griffith Park".

Say the shape of the plan in the description: how long it runs, how far you will walk, pace, what to bring, whether dogs and kids are welcome, and what it costs (usually nothing).

Choose a time that respects commutes. Weeknight meetups work best at 6:30pm or later; weekend morning meetups work best before 10am.

Post a reminder in the community chat the day before, and again an hour before with exactly where you are standing. Greet people as they arrive and introduce newcomers to someone.

Afterwards, thank people and post the next date. The second meetup is the one that turns a group into a habit.`,
  },
]

const demoPeople = [
  { name: 'Demo Neighbor', email: 'demo@hangout.app', password: 'demo1234', homeArea: 'Glendale' },
  { name: 'Maya Chen', email: 'maya@hangout.app', password: 'demo1234', homeArea: 'Silver Lake' },
  { name: 'Andre Silva', email: 'andre@hangout.app', password: 'demo1234', homeArea: 'Pasadena' },
  { name: 'Priya Raman', email: 'priya@hangout.app', password: 'demo1234', homeArea: 'Santa Monica' },
]

async function main() {
  const amenityRows = await Promise.all(
    amenities.map((a) =>
      prisma.amenity.upsert({
        where: { slug: a.slug },
        update: { label: a.label, icon: a.icon },
        create: a,
      }),
    ),
  )
  const amenityBySlug = new Map(amenityRows.map((a) => [a.slug, a]))

  const people = []
  for (const person of demoPeople) {
    people.push(
      await prisma.user.upsert({
        where: { email: person.email },
        update: { homeArea: person.homeArea },
        create: {
          name: person.name,
          email: person.email,
          homeArea: person.homeArea,
          passwordHash: await bcrypt.hash(person.password, 10),
        },
      }),
    )
  }
  const [demoUser, maya, andre, priya] = people

  const placeRows = []
  for (const p of places) {
    const row = await prisma.place.upsert({
      where: { googlePlaceId: `seed:${p.name}` },
      update: {
        name: p.name,
        description: p.description,
        type: p.type as never,
        lat: p.lat,
        lng: p.lng,
        address: p.address,
      },
      create: {
        googlePlaceId: `seed:${p.name}`,
        name: p.name,
        description: p.description,
        type: p.type as never,
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
      update: { name: c.name, description: c.description, icon: c.icon, tint: c.tint },
      create: {
        slug: c.slug,
        name: c.name,
        description: c.description,
        icon: c.icon,
        tint: c.tint,
        memberships: { create: { userId: demoUser.id, role: 'organizer' } },
      },
    })
    communityRows.push(row)
  }

  // A few extra members so member lists and chats are not empty.
  const extraMembers: [number, string][] = [
    [0, maya.id],
    [0, andre.id],
    [1, maya.id],
    [2, priya.id],
    [3, andre.id],
    [3, priya.id],
  ]
  for (const [index, userId] of extraMembers) {
    await prisma.membership.upsert({
      where: { userId_communityId: { userId, communityId: communityRows[index].id } },
      update: {},
      create: { userId, communityId: communityRows[index].id },
    })
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
      hostId: demoUser.id,
    },
    {
      title: 'Sunday Market stroll',
      description: 'Meet at the Honolulu Ave median, then brunch at a nearby cafe.',
      startsAt: new Date(now + 5 * day),
      placeIdx: 3,
      communityIdx: 1,
      hostId: maya.id,
    },
    {
      title: 'Puppy playdate & picnic',
      description: 'Dog run hangout, treats provided. All friendly pups welcome.',
      startsAt: new Date(now + 7 * day),
      placeIdx: 6,
      communityIdx: 2,
      hostId: priya.id,
    },
    {
      title: 'Sketch & sip under the oaks',
      description: 'Casual drawing meetup at the adobe lawn. Some supplies provided.',
      startsAt: new Date(now + 10 * day),
      placeIdx: 4,
      communityIdx: null,
      hostId: andre.id,
    },
  ]
  // Seeded events are matched by title so re-running the seed refreshes their
  // schedule instead of stacking a second copy on the calendar.
  for (const e of events) {
    const existing = await prisma.event.findFirst({ where: { title: e.title }, select: { id: true } })
    if (existing) {
      await prisma.event.update({
        where: { id: existing.id },
        data: { description: e.description, startsAt: e.startsAt },
      })
      continue
    }
    await prisma.event.create({
      data: {
        title: e.title,
        description: e.description,
        startsAt: e.startsAt,
        placeId: placeRows[e.placeIdx].id,
        communityId: e.communityIdx === null ? null : communityRows[e.communityIdx].id,
        hostId: e.hostId,
        rsvps: { create: { userId: e.hostId, status: 'going' } },
      },
    })
  }

  for (const community of communityRows) {
    const members = await prisma.membership.findMany({
      where: { communityId: community.id },
      select: { userId: true },
    })

    const generalThread =
      (await prisma.chatThread.findFirst({
        where: { kind: 'community', communityId: community.id },
        select: { id: true },
      })) ??
      (await prisma.chatThread.create({
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
        select: { id: true },
      }))

    // Thread access is decided by ThreadMember, so keep it in step with the
    // community roster.
    for (const member of members) {
      await prisma.threadMember.upsert({
        where: { threadId_userId: { threadId: generalThread.id, userId: member.userId } },
        update: {},
        create: { threadId: generalThread.id, userId: member.userId },
      })
    }
  }

  for (const article of knowledge) {
    await prisma.knowledgeArticle.upsert({
      where: { slug: article.slug },
      update: { title: article.title, category: article.category, keywords: article.keywords, body: article.body },
      create: article,
    })
  }

  console.log('Seed complete:', {
    amenities: amenityRows.length,
    places: placeRows.length,
    communities: communityRows.length,
    knowledge: knowledge.length,
    people: people.length,
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
