import { handle, requireUserId } from '@/lib/api'
import { getThread, leaveThread } from '@/lib/data/chat'

type Params = { id: string }

export const GET = handle<Params>(async (_request, { id }) => {
  return { thread: await getThread(id, await requireUserId()) }
})

// Leaves a direct or group conversation.
export const DELETE = handle<Params>(async (_request, { id }) => {
  await leaveThread(id, await requireUserId())
  return { ok: true }
})
