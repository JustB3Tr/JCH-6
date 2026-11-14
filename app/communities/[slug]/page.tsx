import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CalendarDays, MapPin, MessageCircle } from 'lucide-react'
import { getUserId } from '@/lib/api'
import { getCommunity } from '@/lib/data/communities'
import { TINT_HEX, type Tint } from '@/lib/constants'
import { formatDateTime } from '@/lib/format'
import { GlassCard, PageShell } from '@/components/shell/page-shell'
import { CommunityIcon } from '@/components/communities/community-icon'
import { JoinButton } from '@/components/communities/join-button'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  try {
    const community = await getCommunity(slug, null)
    return { title: `${community.name} — Hangout`, description: community.description }
  } catch {
    return { title: 'Group — Hangout' }
  }
}

export default async function CommunityPage({ params }: Props) {
  const { slug } = await params
  const viewerId = await getUserId()

  const community = await getCommunity(slug, viewerId).catch(() => null)
  if (!community) notFound()

  const tint = TINT_HEX[community.tint as Tint] ?? TINT_HEX.gray

  return (
    <PageShell
      title={community.name}
      subtitle={`${community.memberCount} ${community.memberCount === 1 ? 'member' : 'members'}`}
      back={{ href: '/communities', label: 'Back to groups' }}
    >
      <GlassCard className="animate-rise">
        <div className="flex items-start gap-3">
          <span
            className="flex size-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm"
            style={{ backgroundColor: tint }}
          >
            <CommunityIcon name={community.icon} className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[17px] font-semibold leading-tight tracking-[-0.01em]">{community.name}</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{community.description}</p>
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <JoinButton communityId={community.id} joined={community.joined} className="flex-1" />
          {community.threadId && community.joined && (
            <Link
              href={`/chat?thread=${community.threadId}`}
              className="glass-press flex h-10 items-center justify-center gap-1.5 rounded-full bg-foreground/[0.06] px-4 text-[13px] font-semibold"
            >
              <MessageCircle className="size-4" aria-hidden />
              Chat
            </Link>
          )}
        </div>
      </GlassCard>

      <section className="mt-4">
        <h2 className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Upcoming
        </h2>
        {community.events.length === 0 ? (
          <GlassCard>
            <p className="text-[13px] text-muted-foreground">
              Nothing scheduled. Post a meetup and it will show up here and in the group chat.
            </p>
          </GlassCard>
        ) : (
          <ul className="space-y-2">
            {community.events.map((event) => (
              <GlassCard as="li" key={event.id}>
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                    <CalendarDays className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[14.5px] font-semibold leading-snug">{event.title}</h3>
                    <p className="mt-0.5 text-[12px] text-muted-foreground">
                      {formatDateTime(event.startsAt)} · {event.goingCount} going
                    </p>
                    {event.place && (
                      <Link
                        href={`/places/${event.place.id}`}
                        className="mt-1 inline-flex items-center gap-1 text-[12px] text-primary"
                      >
                        <MapPin className="size-3.5" aria-hidden />
                        {event.place.name}
                      </Link>
                    )}
                  </div>
                </div>
              </GlassCard>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-4">
        <h2 className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Members
        </h2>
        <GlassCard>
          <ul className="flex flex-wrap gap-2">
            {community.members.map((member) => (
              <li
                key={member.person.id ?? member.person.name}
                className="flex items-center gap-2 rounded-full bg-foreground/[0.06] py-1 pl-1 pr-3"
              >
                <span className="flex size-7 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
                  {member.person.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="text-[12.5px] font-medium">{member.person.name}</span>
                {member.role === 'organizer' && (
                  <span className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                    host
                  </span>
                )}
              </li>
            ))}
            {community.privateMembers > 0 && (
              <li className="flex items-center rounded-full bg-foreground/[0.06] px-3 py-1.5 text-[12.5px] text-muted-foreground">
                +{community.privateMembers} private
              </li>
            )}
          </ul>
        </GlassCard>
      </section>
    </PageShell>
  )
}
