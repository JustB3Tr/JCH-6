import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, CalendarDays, MessagesSquare, Users } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { JoinCommunityButton } from '@/components/communities/join-community-button'
import { formatDateTime } from '@/lib/format'

export default async function CommunityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await auth()

  const community = await prisma.community.findUnique({
    where: { slug },
    include: {
      memberships: { include: { user: { select: { id: true, name: true } } } },
      events: {
        where: { startsAt: { gte: new Date() } },
        orderBy: { startsAt: 'asc' },
        include: { place: { select: { name: true } }, rsvps: { where: { status: 'going' }, select: { id: true } } },
      },
      threads: { select: { id: true, name: true } },
    },
  })
  if (!community) notFound()

  const joined = session?.user?.id
    ? community.memberships.some((m) => m.userId === session.user.id)
    : false

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6">
      <Link href="/communities" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> All communities
      </Link>

      <div className="rounded-3xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-secondary text-2xl" aria-hidden>
              {community.emoji}
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{community.name}</h1>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">{community.description}</p>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Users className="size-4" aria-hidden /> {community.memberships.length} members
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <JoinCommunityButton communityId={community.id} joined={joined} />
            {joined && community.threads[0] && (
              <Link
                href={`/chat?thread=${community.threads[0].id}`}
                className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                <MessagesSquare className="size-4" aria-hidden /> Open community chat
              </Link>
            )}
          </div>
        </div>

        <h2 className="mt-6 text-lg font-semibold tracking-tight">Upcoming events</h2>
        {community.events.length ? (
          <ul className="mt-3 flex flex-col gap-2">
            {community.events.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/events#${e.id}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3 hover:bg-secondary"
                >
                  <div>
                    <p className="font-medium">{e.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(e.startsAt)}
                      {e.place ? ` · ${e.place.name}` : ''}
                    </p>
                  </div>
                  <span className="flex shrink-0 items-center gap-1 text-sm text-muted-foreground">
                    <CalendarDays className="size-4" aria-hidden /> {e.rsvps.length} going
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">No upcoming events yet.</p>
        )}

        <h2 className="mt-6 text-lg font-semibold tracking-tight">Members</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {community.memberships.map((m) => (
            <li key={m.userId} className="rounded-full bg-secondary px-3 py-1 text-sm">
              {m.user.name}
              {m.role === 'organizer' && <span className="ms-1 text-xs text-muted-foreground">· organizer</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
