import { PRIVATE_NAME } from '@/lib/constants'
import type { PersonRef } from '@/lib/types'

/**
 * Private accounts, in one place.
 *
 * A private account is anonymous to everyone but its owner: it is left out of
 * people search and public profiles, and wherever it would be listed (member
 * lists, attendee lists, reviews, event hosts) it appears as "Private member"
 * with no id to follow. The one exception is conversations: people who share a
 * chat thread can see each other's names, because joining a conversation is an
 * explicit choice to talk to those people. Pass `reveal` only for that case.
 *
 * Every user-facing payload must build people through `toPerson` so this rule
 * cannot be bypassed by a new endpoint.
 */

export const personSelect = { id: true, name: true, isPrivate: true } as const

type PersonRow = { id: string; name: string; isPrivate: boolean }

export function isHidden(user: PersonRow, viewerId: string | null | undefined) {
  return user.isPrivate && user.id !== viewerId
}

export function toPerson(
  user: PersonRow,
  viewerId: string | null | undefined,
  options: { reveal?: boolean } = {},
): PersonRef {
  if (isHidden(user, viewerId) && !options.reveal) {
    return { id: null, name: PRIVATE_NAME, isPrivate: true }
  }
  return { id: user.id, name: user.name, isPrivate: user.isPrivate }
}

/** Splits a list into the people a viewer may see and a count of the rest. */
export function partitionPeople<T extends { user: PersonRow }>(rows: T[], viewerId: string | null | undefined) {
  const visible: T[] = []
  let hidden = 0
  for (const row of rows) {
    if (isHidden(row.user, viewerId)) hidden++
    else visible.push(row)
  }
  return { visible, hidden }
}
