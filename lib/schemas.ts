import { z } from 'zod'
import { COMMUNITY_ICONS, RSVP_STATUSES, TINTS } from '@/lib/constants'

// Request body schemas shared by more than one route.

export const eventSchema = z.object({
  title: z.string().trim().min(2).max(140),
  description: z.string().trim().max(2000).default(''),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date().nullish(),
  placeId: z.string().max(40).nullish(),
  communityId: z.string().max(40).nullish(),
})

export const eventUpdateSchema = z.object({
  title: z.string().trim().min(2).max(140).optional(),
  description: z.string().trim().max(2000).optional(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().nullish(),
  placeId: z.string().max(40).nullish(),
})

export const rsvpSchema = z.object({ status: z.enum(RSVP_STATUSES).nullable() })

export const communitySchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).default(''),
  icon: z.enum(COMMUNITY_ICONS).default('users'),
  tint: z.enum(TINTS).default('blue'),
})

export const profileSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  bio: z.string().trim().max(300).optional(),
  homeArea: z.string().trim().max(60).nullish(),
  isPrivate: z.boolean().optional(),
})

export const threadSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('direct'), userId: z.string().min(1).max(40) }),
  z.object({
    kind: z.literal('group'),
    name: z.string().trim().min(1).max(80),
    userIds: z.array(z.string().max(40)).min(1).max(20),
  }),
])

export const messageSchema = z.object({ body: z.string().trim().min(1).max(2000) })
