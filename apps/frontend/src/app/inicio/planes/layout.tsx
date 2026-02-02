import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Planes y Precios - MiPOS | Elige el Plan Perfecto para tu Negocio',
    description: 'Descubre nuestros planes flexibles desde $9.99/mes. Sin permanencia, cancela cuando quieras. Todos incluyen soporte técnico 24/7. Prueba gratis 14 días sin tarjeta de crédito.',
    keywords: [
        'planes MiPOS',
        'precios punto de venta',
        'planes POS',
        'suscripción POS',
        'precio sistema ventas',
        'planes mensuales',
        'planes anuales',
        'software POS precio',
        'punto de venta económico',
        'planes para negocios',
        'suscripción mensual',
        'suscripción anual',
        'prueba gratis',
        'sin permanencia',
        'comparación planes',
    ],
    authors: [
        { name: 'MiPOS Team' },
    ],
    creator: 'MiPOS',
    publisher: 'MiPOS',
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
    alternates: {
        canonical: '/inicio/planes',
    },
    openGraph: {
        title: 'Planes y Precios - MiPOS | Desde $9.99/mes',
        description: 'Planes flexibles para cada tipo de negocio. Sin permanencia, cancela cuando quieras. Prueba gratis 14 días.',
        type: 'website',
        locale: 'es_ES',
        url: '/inicio/planes',
        siteName: 'MiPOS',
        images: [
            {
                url: '/og-image-planes.png',
                width: 1200,
                height: 630,
                alt: 'MiPOS - Planes y Precios',
                type: 'image/png',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Planes y Precios - MiPOS',
        description: 'Planes desde $9.99/mes. Sin permanencia. Prueba gratis 14 días.',
        creator: '@MiPOS',
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
