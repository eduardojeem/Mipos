'use client';

import { Eye, EyeOff, Globe } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { BusinessConfig } from '@/types/business-config';

interface SectionVisibilityPanelProps {
  config: BusinessConfig;
  onUpdate: (updates: Partial<BusinessConfig>) => void;
}

interface VisibilityOption {
  key: keyof NonNullable<BusinessConfig['publicSite']>['sections'];
  label: string;
  description: string;
  icon: React.ReactNode;
}

export function SectionVisibilityPanel({ config, onUpdate }: SectionVisibilityPanelProps) {
  const publicSite = config.publicSite;

  const visibilityOptions: VisibilityOption[] = [
    {
      key: 'showHeroStats',
      label: 'Estadísticas del Hero',
      description: 'Números/métricas en la sección principal',
      icon: '📊',
    },
    {
      key: 'showOffers',
      label: 'Ofertas y Promociones',
      description: 'Sección de banners promocionales',
      icon: '🏷️',
    },
    {
      key: 'showCatalog',
      label: 'Catálogo de Productos',
      description: 'Galería de productos/servicios',
      icon: '🛍️',
    },
    {
      key: 'showCategories',
      label: 'Categorías Destacadas',
      description: 'Categorías sugeridas/populares',
      icon: '📂',
    },
    {
      key: 'showFeaturedProducts',
      label: 'Productos Destacados',
      description: 'Productos recomendados/nuevos',
      icon: '⭐',
    },
    {
      key: 'showCart',
      label: 'Carrito de Compras',
      description: 'Funcionalidad de compra online',
      icon: '🛒',
    },
    {
      key: 'showOrderTracking',
      label: 'Seguimiento de Pedidos',
      description: 'Estado y tracking de órdenes',
      icon: '📍',
    },
    {
      key: 'showBusinessHours',
      label: 'Horarios de Atención',
      description: 'Horas de funcionamiento',
      icon: '🕐',
    },
    {
      key: 'showContactInfo',
      label: 'Información de Contacto',
      description: 'Teléfono, email y dirección',
      icon: '📞',
    },
    {
      key: 'showLocation',
      label: 'Mapa de Ubicación',
      description: 'Mapa embebido de la sucursal',
      icon: '🗺️',
    },
    {
      key: 'showSocialLinks',
      label: 'Enlaces Sociales',
      description: 'Links a redes sociales',
      icon: '📱',
    },
  ];

  const toggleVisibility = (key: keyof NonNullable<BusinessConfig['publicSite']>['sections']) => {
    const currentValue = publicSite?.sections[key] ?? false;
    onUpdate({
      publicSite: {
        ...publicSite,
        sections: {
          ...publicSite?.sections,
          [key]: !currentValue,
        },
      } as any,
    });
  };

  const enabledCount = Object.values(publicSite?.sections || {}).filter(Boolean).length;
  const totalCount = visibilityOptions.length;

  return (
    <Card className="border-border/60 bg-background/80">
      <CardHeader className="border-b border-border/40 bg-muted/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-primary/10 text-primary">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">Visibilidad en la Web Pública</CardTitle>
              <CardDescription className="text-xs">
                Controla qué secciones se muestran en tu página pública
              </CardDescription>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-foreground">
              {enabledCount}/{totalCount}
            </p>
            <p className="text-xs text-muted-foreground">activas</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {visibilityOptions.map((option) => {
            const isVisible = publicSite?.sections[option.key] ?? false;

            return (
              <div
                key={option.key}
                className={cn(
                  'flex items-start justify-between gap-3 rounded-lg border p-3 transition-all',
                  isVisible
                    ? 'border-emerald-200/50 bg-emerald-50/30 dark:border-emerald-900/30 dark:bg-emerald-950/10'
                    : 'border-muted-foreground/20 bg-muted/30'
                )}
              >
                <div className="flex items-start gap-3 flex-1">
                  <span className="text-lg">{option.icon}</span>
                  <div className="min-w-0">
                    <label className="text-sm font-medium text-foreground cursor-pointer">
                      {option.label}
                    </label>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {option.description}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => toggleVisibility(option.key)}
                  className={cn(
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0',
                    isVisible ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      isVisible ? 'translate-x-6' : 'translate-x-1'
                    )}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white pointer-events-none">
                    {isVisible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  </span>
                </button>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="mt-6 rounded-lg border border-blue-200/50 bg-blue-50/30 p-3 dark:border-blue-900/30 dark:bg-blue-950/10">
          <p className="text-xs text-blue-900 dark:text-blue-100">
            <span className="font-semibold">💡 Tip:</span> Mostrando <span className="font-medium">{enabledCount}</span> de{' '}
            <span className="font-medium">{totalCount}</span> secciones. Oculta secciones que no uses para una experiencia más limpia.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
