import { created, getUserId, handle, readJson, requireUserId, throttle } from '@/lib/api'
import { createCommunity, listCommunities } from '@/lib/data/communities'
import { communitySchema } from '@/lib/schemas'

// GET /api/communities?q=&joined=1
export const GET = handle(async (request) => {
  const params = new URL(request.url).searchParams
  const viewerId = await getUserId()
  const joinedOnly = params.get('joined') === '1'
  if (joinedOnly && !viewerId) return { communities: [] }

  return {
    communities: await listCommunities({ viewerId, q: params.get('q') ?? undefined, joinedOnly }),
  }
})

export const POST = handle(async (request) => {
  const userId = await requireUserId()
  throttle(`community:create:${userId}`, 5, 60 * 60_000)
  return created(await createCommunity(userId, await readJson(request, communitySchema)))
})
