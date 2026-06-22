'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  Circle,
  Compass,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Building2,
  Palette,
  Phone,
  ShoppingBag,
  Globe,
  Eye,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BusinessConfig } from '@/types/business-config';

interface ConfigSetupGuideProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  config: BusinessConfig;
}

export function ConfigSetupGuide({ activeTab, onTabChange, config }: ConfigSetupGuideProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('business-config-setup-guide-collapsed');
    if (stored) {
      setIsCollapsed(stored === 'true');
    }
  }, []);

  const toggleCollapse = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    localStorage.setItem('business-config-setup-guide-collapsed', String(nextState));
  };

  const steps = [
    {
      id: 'content',
      label: 'Contenido',
      icon: Sparkles,
      description: 'Nombre, identidad y mensajes principales',
      isCompleted: !!(config.businessName?.trim() && config.heroTitle?.trim() && config.heroDescription?.trim()),
      tip: 'Completa la identidad de tu negocio. Este es el contenido que ven tus clientes en la página pública.',
    },
    {
      id: 'brand',
      label: 'Marca',
      icon: Palette,
      description: 'Colores, logo y personalización visual',
      isCompleted: !!(config.branding?.primaryColor && config.branding?.logo),
      tip: 'Personaliza los colores y agrega tu logo para que la página refleje tu identidad de marca.',
    },
    {
      id: 'contact',
      label: 'Contacto y Legal',
      icon: Phone,
      description: 'Teléfono, email, dirección y datos legales',
      isCompleted: !!(config.contact?.phone?.trim() && config.contact?.email?.trim() && config.address?.street?.trim()),
      tip: 'Los datos de contacto son esenciales para que los clientes puedan comunicarse contigo.',
    },
    {
      id: 'commerce',
      label: 'Comercio',
      icon: ShoppingBag,
      description: 'Moneda, impuestos, envíos y reglas de venta',
      isCompleted: !!(config.storeSettings?.currency && config.storeSettings?.currencySymbol),
      tip: 'Configura los detalles comerciales que afectan cómo se muestran los precios en la web pública.',
    },
    {
      id: 'publication',
      label: 'Publicación',
      icon: Globe,
      description: 'Ruta pública, dominio personalizado y visibilidad',
      isCompleted: !!config.address?.street,
      tip: 'Define cómo y dónde aparecerá tu negocio en internet.',
    },
    {
      id: 'preview',
      label: 'Revisión',
      icon: Eye,
      description: 'Vista previa y validación final',
      isCompleted: !!(config.businessName?.trim() && config.heroTitle?.trim()),
      tip: 'Revisa cómo se ve todo antes de publicar los cambios.',
    },
  ];

  const completedCount = steps.filter((s) => s.isCompleted).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);
  const allCompleted = completedCount === steps.length;

  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all duration-300 shadow-md border bg-gradient-to-br',
        allCompleted
          ? 'from-emerald-50/40 via-background to-background border-emerald-200 dark:from-emerald-950/10 dark:border-emerald-900/30'
          : 'from-blue-50/40 via-background to-background border-border dark:from-blue-950/5'
      )}
    >
      {/* Decorative glow */}
      {allCompleted && (
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
      )}
      {!allCompleted && (
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-32 w-32 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />
      )}

      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3 p-5">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border',
              allCompleted
                ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800'
                : 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800'
            )}
          >
            {allCompleted ? <Sparkles className="h-5 w-5" /> : <Compass className="h-5 w-5" />}
          </div>
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              Guía de Configuración
              {allCompleted && (
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                  ✓ Completo
                </span>
              )}
            </CardTitle>
            <CardDescription className="text-xs">
              {allCompleted
                ? '¡Perfecto! Tu configuración pública está lista para publicar.'
                : 'Sigue los pasos para configurar tu página pública.'}
            </CardDescription>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={toggleCollapse} className="h-8 w-8 text-muted-foreground rounded-lg">
          {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </Button>
      </CardHeader>

      <CardContent className="p-5 pt-0 space-y-4">
        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-muted-foreground">Progreso</span>
            <span className="font-bold text-foreground">
              {progressPercent}% ({completedCount} de {steps.length})
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-500 ease-out', allCompleted ? 'bg-emerald-500' : 'bg-blue-600')}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Steps Grid */}
        {!isCollapsed && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-2">
            {steps.map((step) => {
              const StepIcon = step.icon;
              const isActive = activeTab === step.id;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => onTabChange(step.id)}
                  className={cn(
                    'text-left flex items-start gap-3 rounded-xl border p-3 transition-all hover:scale-[1.01] active:scale-[0.99]',
                    isActive
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/10 shadow-sm'
                      : 'border-border bg-card hover:bg-muted/30 hover:border-muted-foreground/30',
                    step.isCompleted && !isActive && 'border-emerald-100 dark:border-emerald-900/20 bg-emerald-50/5'
                  )}
                >
                  <div className="mt-0.5 shrink-0">
                    {step.isCompleted ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 fill-emerald-100 dark:fill-transparent" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground/60" />
                    )}
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <p
                      className={cn(
                        'text-xs font-bold leading-none flex items-center gap-1.5',
                        step.isCompleted ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground',
                        isActive && 'text-primary'
                      )}
                    >
                      <StepIcon className="h-3.5 w-3.5 shrink-0" />
                      {step.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground leading-normal line-clamp-2">{step.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Selected tab tip card */}
        {!isCollapsed && (
          <div className="flex items-start gap-2.5 rounded-xl border bg-muted/20 p-3 text-xs text-muted-foreground">
            <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold text-foreground">Tip:</span>
              <p className="leading-relaxed text-muted-foreground">{steps.find((s) => s.id === activeTab)?.tip}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
