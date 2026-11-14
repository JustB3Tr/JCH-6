// Sliding-window limiter held in process memory. It protects the paid
// upstreams (model, Google Places, ElevenLabs) from a runaway client. Each
// server instance keeps its own counts, so treat the limits as per-instance.

const buckets = new Map<string, number[]>()
const MAX_KEYS = 5000

function sweep(now: number, windowMs: number) {
  for (const [key, hits] of buckets) {
    if (!hits.length || hits[hits.length - 1] <= now - windowMs) buckets.delete(key)
  }
}

/** Records a hit and returns whether the caller is still within the limit. */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  if (buckets.size > MAX_KEYS) sweep(now, windowMs)

  const hits = (buckets.get(key) ?? []).filter((t) => t > now - windowMs)
  if (hits.length >= limit) {
    buckets.set(key, hits)
    return false
  }
  hits.push(now)
  buckets.set(key, hits)
  return true
}
