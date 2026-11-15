# Outly — Step outside together

Outly is a community map of free and low-cost places to meet up across Los Angeles County:
parks, trails, beaches and gardens, plus neighborhood gatherings, interest groups, group chat
and a conversational AI guide that can search the map, the calendar and the live web.

## Stack

- **Next.js 16** (App Router, Turbopack) + TypeScript + Tailwind CSS 4 + shadcn/ui (Base UI)
- **PostgreSQL (Neon)** via **Prisma ORM 7** with the `@prisma/adapter-pg` driver adapter
- **Auth.js (next-auth v5)** — email + password credentials, JWT sessions, bcrypt hashing
- **Google Maps JS API** (`@vis.gl/react-google-maps`) + Places (New) for search, live hours and photos
- **Ollama** (`OLLAMA_URL`, `OLLAMA_MODEL`) — streaming chat with tool calling and persisted history
- **ElevenLabs** — `eleven_flash_v2_5` speech synthesis and `scribe_v1` speech-to-text
- **SWR** for client data fetching and polling

## Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon Postgres connection string |
| `AUTH_SECRET` | Auth.js session secret |
| `GOOGLE_MAPS_API_KEY` | Maps JS API (client) + Places API (server proxy) |
| `ELEVENLABS_API_KEY` | Voice replies (`/api/tts`) and dictation (`/api/stt`) |
| `OLLAMA_URL` | Ollama base URL (default `http://69.234.42.159:11434`) |
| `OLLAMA_MODEL` | Ollama model (default `Imagination-2.1-Pro`) |

## Screens

- `/` — Landing page: hero search, activity explorer, how it works, this weekend's gatherings.
- `/map` — Map explorer: search, type and amenity filters, viewport-culled pins, place sheet,
  locate-me, add-place, and a mic shortcut into the guide.
- `/places/[id]` — Place view: description, amenities, live hours, upcoming events, reviews.
- `/events` — Upcoming and past gatherings, RSVP (going / maybe / can't), create an event.
- `/communities` — Browse, join and create groups; `/communities/[slug]` has members, events and chat.
- `/chat` — Conversation list and thread view with polling, direct and community threads.
- `/guide` — The AI guide: streaming answers with tool steps, place cards, web sources, read-aloud
  and dictation. Works signed in or as a guest.
- `/profile` — Saved places, plans, groups and privacy settings.
- `/sign-in`, `/sign-up` — Email + password auth.

## API routes

`/api/places` (list/create), `/api/places/[id]`, `/api/places/[id]/reviews`,
`/api/places/[id]/save`, `/api/places/[id]/photo`, `/api/search` (places + events + groups +
Google), `/api/events`, `/api/events/[id]/rsvp`, `/api/communities`,
`/api/communities/[id]/membership`, `/api/chat/threads`, `/api/chat/threads/[id]/messages`,
`/api/ai/chat` (streaming agent, rate-limited), `/api/ai/chats`, `/api/ai/chats/[id]`,
`/api/ai/tools`, `/api/tts`, `/api/stt`, `/api/me`, `/api/meta`, `/api/auth/*`.

## The guide

`lib/ai/agent.ts` runs up to six model rounds. Core tools are always available; the rest are
loaded on demand through `discover_tools` so the local model picks better.

- `search_places`, `find_events`, `search_knowledge`, `web_search`, `discover_tools`
- On demand: `get_place_details`, `lookup_live_place_info`, `read_webpage`, `list_communities`,
  `get_community`, `get_my_plans`, `rsvp_to_event`, `save_place`, `get_weather`,
  `find_meeting_point`, `get_directions`

Questions about hours, prices, parking or closures are grounded with a live web search before the
model answers, because those are the facts a model gets wrong from memory. Every reply streams its
tool steps and the web pages it used, and signed-in replies are saved with them.

## Local development

```bash
pnpm install
npx prisma db push              # sync schema
npx prisma db seed              # seed amenities, demo places, communities, events
npx tsx scripts/seed-la-places.ts   # expand to 97 LA County spots (resolves real
                                    # coordinates/addresses through Google Places,
                                    # falls back to OpenStreetMap, then to the
                                    # built-in coordinate table if quota runs out)
npx tsx scripts/seed-la-places.ts --only-missing
                                    # top up only the spots not seeded yet
npx tsx scripts/clear-db.ts         # wipe every table, then re-run the seeds above
pnpm dev                        # http://localhost:3000
```

Demo account: `demo@hangout.app` / `demo1234` (the seeded email predates the Outly rename).

## Notes

- Prisma 7 requires `prisma.config.ts` for CLI datasource config and a driver adapter at runtime
  (see `lib/prisma.ts`). The client is generated to `lib/generated/prisma`.
- The Google Maps key is passed server-side into the map component; Places search goes through
  `/api/places/search` so the key is never exposed beyond the Maps JS loader.
- Security headers (`nosniff`, referrer policy, HSTS, permissions policy) are set in `next.config.mjs`.
- The map only mounts pins inside the current viewport (plus a margin), so a 500-place result set
  stays fast while panning.
- Guests can use the guide: the browser sends the recent transcript and nothing is persisted.
  Signed-in chats are stored with their places, sources and steps.
