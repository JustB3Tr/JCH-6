import { created, handle, readJson, requireUserId, throttle } from '@/lib/api'
import { listMessages, postMessage } from '@/lib/data/chat'
import { messageSchema } from '@/lib/schemas'

type Params = { id: string }

// GET ?after=<ISO timestamp> returns only newer messages, for polling.
export const GET = handle<Params>(async (request, { id }) => {
  const userId = await requireUserId()
  const afterParam = new URL(request.url).searchParams.get('after')
  const after = afterParam ? new Date(afterParam) : null
  const messages = await listMessages(id, userId, after && !Number.isNaN(after.getTime()) ? after : null)
  return { messages }
})

export const POST = handle<Params>(async (request, { id }) => {
  const userId = await requireUserId()
  throttle(`message:${userId}`, 40)
  const { body } = await readJson(request, messageSchema)
  return created({ message: await postMessage(id, userId, body) })
})
