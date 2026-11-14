import { getUserId, handle, readJson, requireUserId } from '@/lib/api'
import { getMe, updateMe } from '@/lib/data/users'
import { profileSchema } from '@/lib/schemas'

// Returns `{ user: null }` when signed out so clients can poll it freely.
export const GET = handle(async () => {
  const userId = await getUserId()
  if (!userId) return { user: null }
  try {
    return { user: await getMe(userId) }
  } catch {
    return { user: null }
  }
})

// PATCH { name?, bio?, homeArea?, isPrivate? }
export const PATCH = handle(async (request) => {
  const userId = await requireUserId()
  return { user: await updateMe(userId, await readJson(request, profileSchema)) }
})
