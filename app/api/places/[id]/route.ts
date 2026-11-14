import { getUserId, handle, requireUserId } from '@/lib/api'
import { deletePlace, getPlaceDetail } from '@/lib/data/places'

type Params = { id: string }

export const GET = handle<Params>(async (_request, { id }) => {
  return { place: await getPlaceDetail(id, await getUserId()) }
})

export const DELETE = handle<Params>(async (_request, { id }) => {
  await deletePlace(id, await requireUserId())
  return { ok: true }
})
