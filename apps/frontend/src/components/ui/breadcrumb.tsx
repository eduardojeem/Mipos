'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
  isCurrentPage?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
  showHome?: boolean;
  homeHref?: string;
  separator?: React.ReactNode;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  className,
  showHome = true,
  homeHref = '/',
  separator = <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
}) => {
  const allItems = showHome 
    ? [{ label: 'Inicio', href: homeHref, icon: Home, isCurrentPage: false }, ...items]
    : items;

  return (
    <nav 
      className={cn('flex items-center space-x-2 text-sm', className)}
      aria-label="Navegación de ruta"
      role="navigation"
    >
      <ol className="flex items-center space-x-2" role="list">
        {allItems.map((item, index) => {
          const isLast = index === allItems.length - 1;
          const ItemIcon = item.icon;

          return (
            <li key={index} className="flex items-center space-x-2" role="listitem">
              {index > 0 && (
                <span className="flex-shrink-0" aria-hidden="true">
                  {separator}
                </span>
              )}
              
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center space-x-1 text-muted-foreground hover:text-foreground transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm px-1 py-0.5',
                    index === 0 && 'font-medium'
                  )}
                  aria-label={`Ir a ${item.label}`}
                >
                  {ItemIcon && (
                    <ItemIcon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  )}
                  <span>{item.label}</span>
                </Link>
              ) : (
                <span
                  className={cn(
                    'flex items-center space-x-1',
                    isLast || item.isCurrentPage 
                      ? 'text-foreground font-medium' 
                      : 'text-muted-foreground'
                  )}
                  aria-current={isLast || item.isCurrentPage ? 'page' : undefined}
                >
                  {ItemIcon && (
                    <ItemIcon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  )}
                  <span>{item.label}</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

// Hook para generar breadcrumbs automáticamente basado en la ruta
export const useBreadcrumbs = (pathname: string, customLabels?: Record<string, string>) => {
  const segments = pathname.split('/').filter(Boolean);
  
  const items: BreadcrumbItem[] = segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/');
    const isLast = index === segments.length - 1;
    
    // Usar etiquetas personalizadas o convertir el segmento
    const label = customLabels?.[segment] || 
      segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
    
    return {
      label,
      href: isLast ? undefined : href,
      isCurrentPage: isLast
    };
  });
  
  return items;
};

export default Breadcrumb;