import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Empresas publicadas en MiPOS | Directorio comercial',
  description:
    'Explora organizaciones activas, revisa su presencia publica y entra a sus catalogos desde un directorio real de MiPOS.',
  keywords: [
    'empresas MiPOS',
    'directorio de empresas',
    'negocios publicados',
    'catalogo publico',
    'marketplace empresarial',
    'organizaciones activas',
    'tiendas publicadas',
    'empresas con catalogo',
  ],
  authors: [{ name: 'MiPOS Team' }],
  creator: 'MiPOS',
  publisher: 'MiPOS',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  alternates: {
    canonical: '/empresas',
  },
  openGraph: {
    title: 'Empresas publicadas en MiPOS | Directorio comercial',
    description:
      'Conoce organizaciones activas, su catalogo publico y su cobertura comercial dentro del ecosistema MiPOS.',
    type: 'website',
    locale: 'es_PY',
    url: '/empresas',
    siteName: 'MiPOS',
    images: [
      {
        url: '/og-image-empresas.png',
        width: 1200,
        height: 630,
        alt: 'MiPOS - Directorio de empresas publicadas',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Empresas publicadas en MiPOS',
    description: 'Directorio publico de organizaciones activas con catalogo y presencia comercial.',
    creator: '@MiPOS',
    images: ['/twitter-image-empresas.png'],
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
  category: 'technology',
  classification: 'Business Software',
};

export default function EmpresasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
