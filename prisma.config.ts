import dotenv from 'dotenv'
import { defineConfig, env } from 'prisma/config'

// Prisma 7 does not auto-load env files; the v0 project keeps secrets in
// .env.development.local, with .env as a fallback for local clones.
dotenv.config({ path: '.env.development.local' })
dotenv.config()

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
})
