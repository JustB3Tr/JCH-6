import { handle, requireUserId } from '@/lib/api'
import { setMembership } from '@/lib/data/communities'

type Params = { id: string }

export const PUT = handle<Params>(async (_request, { id }) => {
  return setMembership(await requireUserId(), id, true)
})

export const DELETE = handle<Params>(async (_request, { id }) => {
  return setMembership(await requireUserId(), id, false)
})
