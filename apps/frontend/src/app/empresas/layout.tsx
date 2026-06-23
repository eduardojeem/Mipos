import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Empresas publicadas en MITIENDA | Directorio comercial',
  description:
    'Explora organizaciones activas, revisa su presencia publica y entra a sus catalogos desde un directorio real de MITIENDA.',
  keywords: [
    'empresas MITIENDA',
    'directorio de empresas',
    'negocios publicados',
    'catalogo publico',
    'marketplace empresarial',
    'organizaciones activas',
    'tiendas publicadas',
    'empresas con catalogo',
  ],
  authors: [{ name: 'MITIENDA Team' }],
  creator: 'MITIENDA',
  publisher: 'MITIENDA',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  alternates: {
    canonical: '/empresas',
  },
  openGraph: {
    title: 'Empresas publicadas en MITIENDA | Directorio comercial',
    description:
      'Conoce organizaciones activas, su catalogo publico y su cobertura comercial dentro del ecosistema MITIENDA.',
    type: 'website',
    locale: 'es_PY',
    url: '/empresas',
    siteName: 'MITIENDA',
    images: [
      {
        url: '/og-image-empresas.png',
        width: 1200,
        height: 630,
        alt: 'MITIENDA - Directorio de empresas publicadas',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Empresas publicadas en MITIENDA',
    description: 'Directorio publico de organizaciones activas con catalogo y presencia comercial.',
    creator: '@MITIENDA',
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
