import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { clientIp, handle, notFound, throttle } from '@/lib/api'
import { fetchPhotoRef, fetchPhotoUri } from '@/lib/google'

type Params = { id: string }

// Google photo URLs are short-lived and each lookup is billed, so resolved
// URLs are reused for a while and the redirect itself is cacheable.
const CACHE_MS = 45 * 60_000
const uriCache = new Map<string, { uri: string; expires: number }>()

async function resolvePhoto(id: string): Promise<string | null> {
  const place = await prisma.place.findUnique({ where: { id }, select: { photoRef: true, googlePlaceId: true } })
  if (!place) throw notFound('That place')

  let uri = place.photoRef ? await fetchPhotoUri(place.photoRef) : null
  const canRefresh = place.googlePlaceId && !place.googlePlaceId.startsWith('seed:')

  // Photo resource names expire; ask Google for a fresh one once.
  if (!uri && canRefresh) {
    const photoRef = await fetchPhotoRef(place.googlePlaceId!)
    if (photoRef !== place.photoRef) await prisma.place.update({ where: { id }, data: { photoRef } })
    uri = photoRef ? await fetchPhotoUri(photoRef) : null
  }
  return uri
}

export const GET = handle<Params>(async (request, { id }) => {
  const cached = uriCache.get(id)
  let uri = cached && cached.expires > Date.now() ? cached.uri : null

  if (!uri) {
    throttle(`photo:${clientIp(request)}`, 60)
    uri = await resolvePhoto(id)
    if (!uri) throw notFound('A photo for this place')
    if (uriCache.size > 2000) uriCache.clear()
    uriCache.set(id, { uri, expires: Date.now() + CACHE_MS })
  }

  return NextResponse.redirect(uri, {
    status: 302,
    headers: { 'Cache-Control': 'public, max-age=1800, s-maxage=1800' },
  })
})
