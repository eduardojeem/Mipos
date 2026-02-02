import { Metadata } from 'next';
import './landing.css';

export const metadata: Metadata = {
    title: 'Sistema POS - Gestiona tu negocio de forma eficiente',
    description: 'Plataforma SaaS completa para la gestión de tu punto de venta. Inventario, ventas, clientes y reportes en un solo lugar.',
    keywords: ['POS', 'punto de venta', 'gestión', 'inventario', 'ventas', 'SaaS'],
    openGraph: {
        title: 'Sistema POS - Gestiona tu negocio',
        description: 'Plataforma completa para la gestión de tu punto de venta',
        type: 'website',
    },
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
