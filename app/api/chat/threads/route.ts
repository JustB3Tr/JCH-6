import { created, getUserId, handle, readJson, requireUserId, throttle } from '@/lib/api'
import { createGroupThread, listThreads, openDirectThread } from '@/lib/data/chat'
import { threadSchema } from '@/lib/schemas'

export const GET = handle(async () => {
  const userId = await getUserId()
  return { threads: userId ? await listThreads(userId) : [] }
})

// POST { kind: 'direct', userId } opens (or returns) the DM with that person.
// POST { kind: 'group', name, userIds } starts a group chat.
export const POST = handle(async (request) => {
  const userId = await requireUserId()
  throttle(`thread:create:${userId}`, 20, 60 * 60_000)
  const input = await readJson(request, threadSchema)

  const thread =
    input.kind === 'direct'
      ? await openDirectThread(userId, input.userId)
      : await createGroupThread(userId, input.name, input.userIds)
  return created({ thread })
})
