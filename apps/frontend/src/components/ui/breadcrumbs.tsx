'use client';

import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { usePathname } from 'next/navigation';

interface BreadcrumbItem {
    label: string;
    href: string;
}

interface BreadcrumbsProps {
    items?: BreadcrumbItem[];
    className?: string;
}

export default function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
    const pathname = usePathname();

    // Si no se pasan items, generar automáticamente desde el pathname
    const breadcrumbItems: BreadcrumbItem[] = items || [
        { label: 'Inicio', href: '/' },
    ];

    // Agregar item actual si no está incluido
    if (!items && pathname && pathname !== '/') {
        const segments = pathname.split('/').filter(Boolean);
        let currentPath = '';

        segments.forEach((segment, index) => {
            currentPath += `/${segment}`;
            const isLast = index === segments.length - 1;

            // Capitalizar y formatear el label
            const label = segment
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');

            if (!isLast || breadcrumbItems.length === 1) {
                breadcrumbItems.push({ label, href: currentPath });
            }
        });
    }

    return (
        <nav
            aria-label="Breadcrumb"
            className={`flex items-center space-x-1 text-sm ${className}`}
        >
            <ol className="flex items-center space-x-1">
                {breadcrumbItems.map((item, index) => {
                    const isLast = index === breadcrumbItems.length - 1;
                    const isFirst = index === 0;

                    return (
                        <li key={item.href} className="flex items-center">
                            {!isFirst && (
                                <ChevronRight
                                    className="h-4 w-4 text-muted-foreground mx-1"
                                    aria-hidden="true"
                                />
                            )}

                            {isLast ? (
                                <span
                                    className="font-medium text-foreground flex items-center gap-1"
                                    aria-current="page"
                                >
                                    {isFirst && <Home className="h-4 w-4" aria-hidden="true" />}
                                    {item.label}
                                </span>
                            ) : (
                                <Link
                                    href={item.href}
                                    className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                                >
                                    {isFirst && <Home className="h-4 w-4" aria-hidden="true" />}
                                    {item.label}
                                </Link>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
