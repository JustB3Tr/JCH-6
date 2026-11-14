import { handle, readJson, requireUserId } from '@/lib/api'
import { setRsvp } from '@/lib/data/events'
import { rsvpSchema } from '@/lib/schemas'

type Params = { id: string }

// PUT { status: 'going' | 'maybe' | 'cant' | null } — null clears the RSVP.
export const PUT = handle<Params>(async (request, { id }) => {
  const userId = await requireUserId()
  const { status } = await readJson(request, rsvpSchema)
  return setRsvp(userId, id, status)
})

export const DELETE = handle<Params>(async (_request, { id }) => {
  return setRsvp(await requireUserId(), id, null)
})
