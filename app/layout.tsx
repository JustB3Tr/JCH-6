import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Literata, Nunito_Sans } from 'next/font/google'
import { Providers } from '@/components/session-provider'
import { AppNav } from '@/components/shell/app-nav'
import { SiteHeader } from '@/components/shell/site-header'
import { BRAND } from '@/lib/brand'
import './globals.css'

const literata = Literata({ subsets: ['latin'], variable: '--font-literata', display: 'swap' })
const nunito = Nunito_Sans({ subsets: ['latin'], variable: '--font-nunito', display: 'swap' })

export const metadata: Metadata = {
  title: `${BRAND.name} — Find fun things to do outside, with friendly people near you`,
  description: BRAND.description,
  applicationName: BRAND.name,
  generator: 'v0.app',
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: '/icon.svg',
  },
  openGraph: {
    type: 'website',
    siteName: BRAND.name,
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description: BRAND.description,
    images: [{ url: '/images/outly-logo.png', width: 1448, height: 1086, alt: `${BRAND.name} wordmark` }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description: BRAND.description,
    images: ['/images/outly-logo.png'],
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#faf6f0',
  userScalable: true,
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${literata.variable} ${nunito.variable} bg-background`}>
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <Providers>
          <SiteHeader />
          <main className="min-h-dvh">{children}</main>
          <AppNav />
        </Providers>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
