import { handle, requireUserId, throttle } from '@/lib/api'
import { searchPeople } from '@/lib/data/users'

// GET /api/users?q= — people search for starting chats. Signed-in only, and
// private accounts never appear.
export const GET = handle(async (request) => {
  const userId = await requireUserId()
  throttle(`people:${userId}`, 60)
  const q = new URL(request.url).searchParams.get('q') ?? ''
  return { people: await searchPeople(userId, q.slice(0, 60)) }
})
