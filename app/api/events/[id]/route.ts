import { getUserId, handle, readJson, requireUserId } from '@/lib/api'
import { deleteEvent, getEvent, updateEvent } from '@/lib/data/events'
import { eventUpdateSchema } from '@/lib/schemas'

type Params = { id: string }

export const GET = handle<Params>(async (_request, { id }) => {
  return { event: await getEvent(id, await getUserId()) }
})

export const PATCH = handle<Params>(async (request, { id }) => {
  const userId = await requireUserId()
  await updateEvent(id, userId, await readJson(request, eventUpdateSchema))
  return { event: await getEvent(id, userId) }
})

export const DELETE = handle<Params>(async (_request, { id }) => {
  await deleteEvent(id, await requireUserId())
  return { ok: true }
})
