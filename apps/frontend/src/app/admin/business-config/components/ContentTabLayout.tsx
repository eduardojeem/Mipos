'use client';

import { AlertCircle, CheckCircle2, Sparkles, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { BusinessConfig } from '@/types/business-config';
import { buildDefaultPublicSite } from '@/types/business-config';
import type { BusinessVertical } from '@/config/verticals';
import { useVertical } from '@/app/dashboard/settings/hooks/useVertical';
import { getContentSections, SECTION_DESCRIPTIONS, type ContentSection, type SectionId } from '../config/content-sections';
import { VerticalForm } from './VerticalForm';
import { BusinessInfoForm } from './BusinessInfoForm';
import { CarouselEditor } from './CarouselEditor';
import { PublicExperienceForm } from './PublicExperienceForm';
import { MarketplaceCategoryForm } from './MarketplaceCategoryForm';
import { SectionLocked } from './SectionLocked';
import { useBusinessConfigAccess } from '../hooks/useBusinessConfigAccess';

interface ContentTabLayoutProps {
  config: BusinessConfig;
  onUpdate: (updates: Partial<BusinessConfig>) => void;
  onSave?: () => Promise<void>;
}

export function ContentTabLayout({ config, onUpdate, onSave }: ContentTabLayoutProps) {
  const { vertical } = useVertical();
  const { checkSectionAccess, currentPlan, isPlanResolved } = useBusinessConfigAccess();
  const [lastVertical, setLastVertical] = useState<BusinessVertical | null>(vertical || null);
  const [showVerticalSync, setShowVerticalSync] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<SectionId>>(new Set());

  const sections = getContentSections(vertical);
  const verticalDescription = vertical ? SECTION_DESCRIPTIONS[vertical] : null;

  // Detectar cambio de vertical y avisar si necesita resincronizar
  useEffect(() => {
    if (vertical && lastVertical && vertical !== lastVertical) {
      setShowVerticalSync(true);
      setLastVertical(vertical);
      setExpandedSections(new Set());
    } else if (vertical && !lastVertical) {
      setLastVertical(vertical);
    }
  }, [vertical, lastVertical]);

  // Auto-sincronizar publicSite cuando cambia el vertical
  const handleAutoSyncVertical = useCallback(() => {
    if (vertical) {
      const defaultPublicSite = buildDefaultPublicSite(vertical);
      onUpdate({
        publicSite: {
          ...config.publicSite,
          sections: defaultPublicSite.sections,
          content: {
            ...config.publicSite?.content,
            ...defaultPublicSite.content,
          },
        },
      });
      setShowVerticalSync(false);
    }
  }, [vertical, config.publicSite, onUpdate]);

  const toggleSection = (sectionId: SectionId) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const heroComplete = !!(config.heroTitle?.trim() && config.heroDescription?.trim());
  const carouselComplete = !!(config.carousel?.images && config.carousel.images.length > 0);

  const renderSectionComponent = (section: ContentSection) => {
    switch (section.component) {
      case 'BusinessInfoForm':
        return <BusinessInfoForm config={config} onUpdate={onUpdate} />;
      case 'CarouselEditor':
        return <CarouselEditor config={config} onUpdate={onUpdate} onSave={onSave} />;
      case 'MarketplaceCategoryForm':
        return <MarketplaceCategoryForm />;
      case 'HeroSection':
      case 'CatalogSection':
      case 'ProductsSection':
      case 'OffersSection':
      case 'ServicesSection':
      case 'AppointmentsSection':
        return <PublicExperienceForm config={config} onUpdate={onUpdate} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Sincronización de Vertical */}
      {showVerticalSync && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-100">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>
              El tipo de negocio cambió. Los módulos públicos se actualizarán según el nuevo rubro.
            </span>
            <button
              onClick={handleAutoSyncVertical}
              className="inline-flex items-center gap-2 rounded-md bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700"
            >
              <CheckCircle2 className="h-3 w-3" />
              Sincronizar ahora
            </button>
          </AlertDescription>
        </Alert>
      )}

      {/* Tipo de negocio - siempre primero */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            0
          </span>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Tipo de negocio
          </h3>
        </div>
        <VerticalForm />
      </div>

      {/* Resumen del vertical */}
      {verticalDescription && vertical && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-start gap-3 pt-6">
            <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-medium text-foreground">{vertical === 'RETAIL' ? '🛍️ Tienda Online' : '✂️ Barbería'}</p>
              <p className="text-xs text-muted-foreground">{verticalDescription}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Secciones dinámicas por vertical */}
      {!vertical ? (
        <Card className="border-border/40 bg-muted/30">
          <CardContent className="flex items-start gap-3 pt-6">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-medium text-foreground">Selecciona un tipo de negocio</p>
              <p className="text-xs text-muted-foreground">
                Elige entre Tienda Online o Barbería para ver las secciones disponibles.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sections.map((section) => {
            const isExpanded = expandedSections.has(section.id);
            const Icon = section.icon;
            const access = checkSectionAccess(`business_config_${section.id}`);
            const isLocked = !access.isAllowed;

            return (
              <Card
                key={section.id}
                className={cn(
                  'border-border/60 bg-background/80 transition-all',
                  isExpanded && 'ring-1 ring-primary/30',
                  isLocked && 'border-amber-200/50 bg-amber-50/20 dark:border-amber-900/30 dark:bg-amber-950/10'
                )}
              >
                <button
                  onClick={() => !isLocked && toggleSection(section.id)}
                  disabled={isLocked}
                  className={cn(
                    'flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition-colors',
                    !isLocked && 'hover:bg-muted/30 cursor-pointer',
                    isLocked && 'cursor-not-allowed opacity-75'
                  )}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0',
                      isLocked ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400' : 'bg-primary/10 text-primary'
                    )}>
                      {isLocked ? <Lock className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{section.label}</p>
                      <p className="text-xs text-muted-foreground">{section.description}</p>
                      {isLocked && (
                        <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mt-1">
                          Requiere plan {access.requiredPlan}
                        </p>
                      )}
                    </div>
                  </div>
                  {!isLocked && (
                    <>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      )}
                    </>
                  )}
                </button>

                {isExpanded && !isLocked && (
                  <div className="border-t border-border/60 px-6 py-4">
                    {renderSectionComponent(section)}
                  </div>
                )}

                {isLocked && isExpanded && (
                  <div className="border-t border-amber-200/50 dark:border-amber-900/30 px-6 py-4">
                    <SectionLocked
                      sectionLabel={section.label}
                      requiredPlan={access.requiredPlan || 'superior'}
                      currentPlan={currentPlan}
                    />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Helper hint */}
      {vertical && (
        <Card className="border-border/40 bg-gradient-to-r from-blue-500/5 to-cyan-500/5">
          <CardContent className="flex items-start gap-3 pt-6">
            <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-medium text-foreground">
                💡 Completa las secciones de arriba hacia abajo
              </p>
              <p className="text-xs text-muted-foreground">
                Cada sección es independiente. Expande, completa y guarda.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
