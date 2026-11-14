import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

/**
 * Single source of truth for credential checks. Both the NextAuth provider and
 * the server-side sign-in route use this so a password can never be accepted
 * by one path and rejected by the other.
 */
export async function verifyCredentials(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return null
  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) return null
  return user
}

const SESSION_MAX_AGE = 30 * 24 * 60 * 60

/**
 * The app is rendered inside the v0 preview iframe, which is a different site
 * from the preview host. Browsers drop SameSite=Lax cookies on those
 * cross-site requests, so the session cookie has to be SameSite=None, which in
 * turn requires Secure. Preview hosts and localhost are both secure contexts,
 * so this works in development as well as production.
 */
const crossSiteCookie = {
  httpOnly: true,
  sameSite: 'none' as const,
  secure: true,
  path: '/',
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  session: { strategy: 'jwt', maxAge: SESSION_MAX_AGE },
  pages: { signIn: '/sign-in' },
  // Pin the cookie name to the environment instead of the request protocol.
  // The session is created by a server-side route and read back by `auth()`,
  // so both must agree on the name even when the request arrives over http.
  useSecureCookies: process.env.NODE_ENV === 'production',
  cookies: {
    sessionToken: { options: { ...crossSiteCookie, maxAge: SESSION_MAX_AGE } },
    callbackUrl: { options: crossSiteCookie },
    csrfToken: { options: crossSiteCookie },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (credentials) => {
        const email = typeof credentials?.email === 'string' ? credentials.email.trim().toLowerCase() : ''
        const password = typeof credentials?.password === 'string' ? credentials.password : ''
        if (!email || !password) return null

        const user = await verifyCredentials(email, password)
        if (!user) return null

        return { id: user.id, name: user.name, email: user.email, image: user.image }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    session({ session, token }) {
      if (session.user && token.id) session.user.id = token.id as string
      return session
    },
  },
})
