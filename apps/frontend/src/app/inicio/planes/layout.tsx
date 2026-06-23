import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Planes y Precios - MITIENDA | Elige el Plan Perfecto para tu Negocio',
    description: 'Compara los planes de MITIENDA, revisa precios actualizados y elige la opcion que mejor se adapte a tu negocio.',
    keywords: [
        'planes MITIENDA',
        'precios punto de venta',
        'planes POS',
        'suscripcion POS',
        'precio sistema ventas',
        'planes mensuales',
        'planes anuales',
        'software POS precio',
        'punto de venta',
        'planes para negocios',
        'suscripcion mensual',
        'suscripcion anual',
        'comparacion planes',
    ],
    authors: [
        { name: 'MITIENDA Team' },
    ],
    creator: 'MITIENDA',
    publisher: 'MITIENDA',
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
    alternates: {
        canonical: '/inicio/planes',
    },
    openGraph: {
        title: 'Planes y Precios - MITIENDA',
        description: 'Planes flexibles para cada tipo de negocio con informacion de precios actualizada.',
        type: 'website',
        locale: 'es_ES',
        url: '/inicio/planes',
        siteName: 'MITIENDA',
        images: [
            {
                url: '/og-image-planes.png',
                width: 1200,
                height: 630,
                alt: 'MITIENDA - Planes y Precios',
                type: 'image/png',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Planes y Precios - MITIENDA',
        description: 'Compara planes y precios actualizados de MITIENDA.',
        creator: '@MITIENDA',
        images: ['/twitter-image-planes.png'],
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

export default function PlanesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
