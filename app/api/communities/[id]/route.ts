import { getUserId, handle } from '@/lib/api'
import { getCommunity } from '@/lib/data/communities'

// `id` may be the community id or its slug.
export const GET = handle<{ id: string }>(async (_request, { id }) => {
  return { community: await getCommunity(id, await getUserId()) }
})
