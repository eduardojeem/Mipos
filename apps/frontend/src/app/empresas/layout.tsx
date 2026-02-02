import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Empresas que Confían en MiPOS | Casos de Éxito',
    description: 'Descubre cómo cientos de negocios han optimizado su gestión con MiPOS. Únete a empresas exitosas que transformaron su forma de trabajar. 98% de satisfacción del cliente.',
    keywords: [
        'empresas MiPOS',
        'casos de éxito',
        'testimonios POS',
        'clientes MiPOS',
        'negocios exitosos',
        'empresas que usan POS',
        'referencias clientes',
        'casos de uso',
        'testimonios empresas',
        'negocios activos',
        'satisfacción cliente',
        'empresas confiables',
        'portfolio clientes',
        'casos reales',
        'experiencias clientes',
    ],
    authors: [
        { name: 'MiPOS Team' },
    ],
    creator: 'MiPOS',
    publisher: 'MiPOS',
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
    alternates: {
        canonical: '/empresas',
    },
    openGraph: {
        title: 'Empresas que Confían en MiPOS | 500+ Negocios Activos',
        description: 'Únete a cientos de empresas que transformaron su gestión. 98% de satisfacción del cliente.',
        type: 'website',
        locale: 'es_ES',
        url: '/empresas',
        siteName: 'MiPOS',
        images: [
            {
                url: '/og-image-empresas.png',
                width: 1200,
                height: 630,
                alt: 'MiPOS - Empresas que Confían en Nosotros',
                type: 'image/png',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Empresas que Confían en MiPOS',
        description: '500+ negocios activos. 98% de satisfacción. Únete a la comunidad.',
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
