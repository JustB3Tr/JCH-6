# Hangout — Community Hangout Map

A community app for discovering local hangout spots (parks, plazas, cafes, trails), organizing
events, joining communities, chatting with neighbors, and asking an AI local guide for plans.

## Stack

- **Next.js 16** (App Router, Turbopack) + TypeScript + Tailwind CSS 4 + shadcn/ui (Base UI)
- **PostgreSQL (Neon)** via **Prisma ORM 7** with the `@prisma/adapter-pg` driver adapter
- **Auth.js (next-auth v5)** — email + password credentials, JWT sessions, bcrypt hashing
- **Google Maps JS API** (`@vis.gl/react-google-maps`) + Places (New) Text Search via a server proxy
- **Ollama** (`OLLAMA_URL`, `OLLAMA_MODEL`) — AI chat proxy with tool calling and persisted history
- **ElevenLabs** — text-to-speech for AI voice mode
- **SWR** for client data fetching and polling

## Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon Postgres connection string |
| `AUTH_SECRET` | Auth.js session secret |
| `GOOGLE_MAPS_API_KEY` | Maps JS API (client) + Places API (server proxy) |
| `ELEVENLABS_API_KEY` | Text-to-speech for AI voice mode |
| `OLLAMA_URL` | Ollama base URL (default `http://69.234.42.159:11434`) |
| `OLLAMA_MODEL` | Ollama model (default `Imagination-2.1-Pro`) |

## Screens

- `/` — Main map: search bar (Google Places autocomplete), amenity filter chips, place pins with
  popup cards, locate-me, and an add-place dialog. Supports `?amenity=<slug>` deep links.
- `/places/[id]` — Place view: description, amenity tags, upcoming events, star-rating feedback.
- `/overview` — Home dashboard: featured hero, amenity checklist linking to filtered map,
  upcoming-events card row, and a month calendar of events and your RSVPs.
- `/events` — Upcoming/past events, RSVP (going / maybe / can't), and an event creation dialog.
- `/communities` — Browse, join/leave, and create communities; `/communities/[slug]` detail with
  members, upcoming events, and its chat thread.
- `/chat` — Conversation list + thread view with 3s polling; direct and community threads.
- `/ai` — AI guide: chat history sidebar, suggested prompts, streaming responses, mic input
  (Web Speech API), and optional ElevenLabs voice playback.
- `/sign-in`, `/sign-up` — Email + password auth.

## API routes

`/api/places` (list/create), `/api/places/[id]`, `/api/places/[id]/feedback`,
`/api/places/search` (Places proxy), `/api/events`, `/api/events/[id]/rsvp`,
`/api/communities`, `/api/communities/[id]/membership`, `/api/chat/threads`,
`/api/chat/threads/[id]/messages`, `/api/ai/chats`, `/api/ai/chats/[id]`, `/api/ai/chat`
(streaming Ollama proxy, rate-limited), `/api/tts` (ElevenLabs proxy), `/api/auth/*`.

## Local development

```bash
pnpm install
npx prisma db push              # sync schema
npx prisma db seed              # seed amenities, demo places, communities, events
npx tsx scripts/seed-la-places.ts   # expand to ~90 LA County spots (resolves real
                                    # coordinates/addresses through Google Places)
pnpm dev                        # http://localhost:3000
```

Demo account: `demo@hangout.app` / `demo1234`

## Notes

- Prisma 7 requires `prisma.config.ts` for CLI datasource config and a driver adapter at runtime
  (see `lib/prisma.ts`). The client is generated to `lib/generated/prisma`.
- The Google Maps key is passed server-side into the map component; Places search goes through
  `/api/places/search` so the key is never exposed beyond the Maps JS loader.
- Security headers (`nosniff`, referrer policy, HSTS, permissions policy) are set in `next.config.mjs`.
- The map covers all of LA County: it frames every pin on first load and groups pins with
  `@googlemaps/markerclusterer` so ~100 spots stay fast.
- The AI guide calls real tools (`lib/ai-tools.ts`): `search_places`, `get_place`, `nearby_places`,
  `list_events`, `list_communities`. Tool rounds run non-streaming, then the answer is returned;
  the model is told never to invent places.
