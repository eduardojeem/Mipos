import './globals.css'
import '@/app/premium.css'
import '@/styles/touch-optimized.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from '@/components/providers'
import { Toaster } from '@/components/ui/toaster'

import { defaultBusinessConfig } from '@/types/business-config'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

const inter = Inter({ subsets: ['latin'] })

export async function generateMetadata(): Promise<Metadata> {
  const port = process.env.PORT || '3000';
  const defaultBase = `http://localhost:${port}`;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || defaultBase;
  
  // Use default config for metadata generation
  // Business config will be loaded dynamically in the client via BusinessConfigContext
  const config = defaultBusinessConfig;

  const businessName = config.businessName || 'BeautyPOS';
  const tagline = config.tagline || 'Sistema de Punto de Venta para Cosméticos';
  const description = config.heroDescription || 'Sistema de punto de venta profesional especializado en productos de belleza y cosméticos. Gestión de inventario, ventas, clientes y reportes en tiempo real.';

  return {
    title: {
      default: `${businessName} - ${tagline}`,
      template: `%s | ${businessName}`
    },
    description: description,
    keywords: [
      'POS',
      'punto de venta',
      'cosméticos',
      'belleza',
      'inventario',
      'gestión',
      'ventas',
      businessName,
      'sistema POS',
      'productos de belleza',
      'administración',
      'facturación'
    ],
    authors: [
      { name: `${businessName} Team` },
      { name: businessName, url: config.contact?.website || baseUrl }
    ],
    creator: businessName,
    publisher: businessName,
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: '/',
    },
    openGraph: {
      type: 'website',
      locale: config.regional?.locale || 'es_ES',
      url: '/',
      title: `${businessName} - ${tagline}`,
      description: description,
      siteName: businessName,
      images: [
        {
          url: config.branding?.logo || '/og-image.png',
          width: 1200,
          height: 630,
          alt: `${businessName} - Sistema POS`,
          type: 'image/png',
        },
        {
          url: config.branding?.favicon || '/og-image-square.png',
          width: 800,
          height: 800,
          alt: `${businessName} Logo`,
          type: 'image/png',
        }
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${businessName} - ${tagline}`,
      description: description,
      creator: `@${businessName.replace(/\s+/g, '')}`,
      images: [config.branding?.logo || '/twitter-image.png'],
    },
    icons: {
      icon: [
        { url: config.branding?.favicon || '/favicon.ico', sizes: 'any' },
        { url: '/icon.svg', type: 'image/svg+xml' },
        { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
      apple: [
        { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
      ],
      shortcut: [config.branding?.favicon || '/favicon.ico'],
    },
    manifest: '/manifest.json',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: businessName,
    },
    category: 'technology',
    classification: 'Business Software',
  };
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0B1220' },
    { media: '(prefers-color-scheme: light)', color: '#ffffff' }
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "(function(){try{var t=localStorage.getItem('theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;var c=t==='dark'||(t==='system'&&d)?'dark':'light';var e=document.documentElement;e.classList.remove('light','dark');e.classList.add(c);}catch(_){}})();" }} />
      </head>
      <body className={inter.className + " min-h-[100svh] w-full bg-background antialiased"}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
