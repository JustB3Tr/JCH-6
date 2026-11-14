import { PrismaClient } from '../lib/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
const prisma = new PrismaClient({ adapter })

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, email: true, name: true, passwordHash: true, createdAt: true } })
  console.log('USER COUNT:', users.length)
  for (const u of users) {
    console.log(JSON.stringify({ id: u.id, email: u.email, name: u.name, hashPrefix: u.passwordHash?.slice(0, 12), hashLen: u.passwordHash?.length, createdAt: u.createdAt }))
  }
  const counts = {
    places: await prisma.place.count(),
    communities: await prisma.community.count(),
    events: await prisma.event.count(),
    memberships: await prisma.membership.count(),
    threads: await prisma.chatThread.count(),
    aiChats: await prisma.aiChat.count(),
  }
  console.log('COUNTS:', JSON.stringify(counts))
}
main().catch(e => { console.error('ERR', e); process.exit(1) }).finally(() => prisma.$disconnect())
