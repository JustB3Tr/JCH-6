import { handle, requireUserId } from '@/lib/api'
import { setPlaceSaved } from '@/lib/data/places'

type Params = { id: string }

export const PUT = handle<Params>(async (_request, { id }) => {
  await setPlaceSaved(await requireUserId(), id, true)
  return { saved: true }
})

export const DELETE = handle<Params>(async (_request, { id }) => {
  await setPlaceSaved(await requireUserId(), id, false)
  return { saved: false }
})
