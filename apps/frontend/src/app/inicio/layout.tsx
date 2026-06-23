import { Metadata } from 'next';
import './landing.css';

export const metadata: Metadata = {
    title: 'MITIENDA - Sistema de Punto de Venta en la Nube | Gestiona tu Negocio',
    description: 'Plataforma SaaS completa para gestionar tu punto de venta. Control de inventario, ventas, clientes y reportes en tiempo real. Prueba gratis 14 días sin tarjeta de crédito.',
    keywords: [
        'POS',
        'punto de venta',
        'sistema POS',
        'software POS',
        'gestión de inventario',
        'control de ventas',
        'SaaS',
        'punto de venta en la nube',
        'sistema de ventas',
        'facturación electrónica',
        'gestión empresarial',
        'software para negocios',
        'MITIENDA',
        'punto de venta online',
        'sistema de gestión',
    ],
    authors: [
        { name: 'MITIENDA Team' },
    ],
    creator: 'MITIENDA',
    publisher: 'MITIENDA',
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
    alternates: {
        canonical: '/inicio',
    },
    openGraph: {
        title: 'MITIENDA - Sistema de Punto de Venta en la Nube',
        description: 'Gestiona tu negocio con inteligencia. Inventario, ventas, clientes y reportes en un solo lugar.',
        type: 'website',
        locale: 'es_ES',
        url: '/inicio',
        siteName: 'MITIENDA',
        images: [
            {
                url: '/og-image-inicio.png',
                width: 1200,
                height: 630,
                alt: 'MITIENDA - Sistema de Punto de Venta',
                type: 'image/png',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'MITIENDA - Sistema de Punto de Venta en la Nube',
        description: 'Gestiona tu negocio con inteligencia. Prueba gratis 14 días.',
        creator: '@MITIENDA',
        images: ['/twitter-image-inicio.png'],
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

export default function InicioLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="landing-page">
            {children}
        </div>
    );
}
