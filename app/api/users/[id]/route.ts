import { getUserId, handle } from '@/lib/api'
import { getProfile } from '@/lib/data/users'

export const GET = handle<{ id: string }>(async (_request, { id }) => {
  return { profile: await getProfile(id, await getUserId()) }
})
