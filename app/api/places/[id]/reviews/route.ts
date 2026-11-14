import { z } from 'zod'
import { handle, readJson, requireUserId, throttle } from '@/lib/api'
import { deleteReview, saveReview } from '@/lib/data/places'

type Params = { id: string }

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).default(''),
})

// Each person has one review per place, so PUT both creates and edits it.
export const PUT = handle<Params>(async (request, { id }) => {
  const userId = await requireUserId()
  throttle(`review:${userId}`, 20)
  const { rating, comment } = await readJson(request, reviewSchema)
  await saveReview(userId, id, rating, comment)
  return { ok: true }
})

export const DELETE = handle<Params>(async (_request, { id }) => {
  await deleteReview(await requireUserId(), id)
  return { ok: true }
})
