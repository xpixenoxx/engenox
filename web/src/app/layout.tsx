// web/src/app/layout.tsx
// Root layout — semantic HTML, providers, metadata, WorkOS auth

import { AuthProvider } from '@/components/auth/auth-provider';
import { Providers } from '@/components/providers';
import { Toaster } from '@/components/ui/toaster';
import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
  display: 'swap',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Engenox — AI Visibility Operating System',
    template: '%s | Engenox',
  },
  description: 'Perceive, diagnose, and intervene on your brand\'s AI presence. The candor-first AI visibility platform.',
  keywords: [
    'AI visibility',
    'brand monitoring',
    'AI search optimization',
    'LLM visibility',
    'AI presence',
    'brand intelligence',
  ],
  authors: [{ name: 'Pixenox Solutions' }],
  creator: 'Pixenox Solutions',
  publisher: 'Pixenox Solutions',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://engenox.com'),
  alternates: {
    canonical: '/',
    types: {
      'application/rss+xml': '/rss.xml',
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://engenox.com',
    siteName: 'Engenox',
    title: 'Engenox — AI Visibility Operating System',
    description: 'Perceive, diagnose, and intervene on your brand\'s AI presence. The candor-first AI visibility platform.',
    images: [
      {
        url: '/og-default.png',
        width: 1200,
        height: 630,
        alt: 'Engenox — AI Visibility Operating System',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Engenox — AI Visibility Operating System',
    description: 'Perceive, diagnose, and intervene on your brand\'s AI presence.',
    images: ['/og-default.png'],
    creator: '@engenox',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
  verification: {
    google: 'google-site-verification-code',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0b' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="sitemap" href="/sitemap.xml" />
        <link rel="alternate" type="application/rss+xml" title="Engenox Blog" href="/rss.xml" />
        <link rel="securitytxt" href="/.well-known/security.txt" />
        <link rel="pgpkey" href="/.well-known/pgp-key.asc" />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <AuthProvider>
          <Providers>
            {children}
            <Toaster />
          </Providers>
        </AuthProvider>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'Engenox',
              applicationCategory: 'BusinessApplication',
              operatingSystem: 'Cloud',
              offers: {
                '@type': 'Offer',
                price: '129',
                priceCurrency: 'USD',
                availability: 'https://schema.org/InStock',
              },
              description: 'AI Visibility Operating System — Perceive, diagnose, and intervene on your brand\'s AI presence.',
            }),
          }}
        />
      </body>
    </html>
  );
}