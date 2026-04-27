'use client';

import { useMemo, useCallback, memo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, Percent, Package, TrendingUp, Clock, ExternalLink, Eye } from 'lucide-react';
import { formatDate, formatCurrency, cn } from '@/lib/utils';
import { ProductsManager } from './ProductsManager';
import { OfferPreview } from './OfferPreview';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useEnhancedTabs } from '@/hooks/useTabPersistence';
import { validatePromotion, getPromotionStatus, getTimeRemaining, type Promotion } from '@/lib/validation/promotion-validation';
import { ValidationErrors, TabContentWrapper } from '@/components/ui/states';

interface PromotionDetailsDialogProps {
  promotion: Promotion | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MemoizedProductsManager = memo(ProductsManager);
const MemoizedOfferPreview = memo(OfferPreview);

const STATUS_CONFIG = {
  active:    { label: 'Activa',      className: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400' },
  scheduled: { label: 'Programada',  className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-400' },
  expired:   { label: 'Expirada',    className: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400' },
  inactive:  { label: 'Inactiva',    className: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400' },
} as const;

// Inner component — all hooks run unconditionally here
function PromotionDetailsContent({
  promotion,
  onOpenChange,
}: {
  promotion: Promotion;
  onOpenChange: (open: boolean) => void;
}) {
  const { isMobile } = useResponsiveLayout();

  const { activeTab, setActiveTab } = useEnhancedTabs(
    `promotion-${promotion.id}`,
    ['overview', 'products', 'preview'],
    'overview',
    { sessionOnly: false, expireAfter: 24 * 60 * 60 * 1000, keyboardNavigation: true },
  );

  const status = useMemo(() => getPromotionStatus(promotion), [promotion]);
  const timeRemaining = useMemo(() => getTimeRemaining(promotion.endDate), [promotion.endDate]);

  const productsManagerProps = useMemo(
    () => ({
      promotionId: promotion.id,
      discountType: promotion.discountType,
      discountValue: promotion.discountValue,
    }),
    [promotion.id, promotion.discountType, promotion.discountValue],
  );

  const handleViewInPublicSite = useCallback(() => {
    window.open(`/offers?promotion=${promotion.id}`, '_blank');
  }, [promotion.id]);

  const statusCfg = STATUS_CONFIG[status];

  return (
    <DialogContent
      className={cn(
        'flex flex-col p-0 gap-0',
        isMobile ? 'h-full max-h-full m-0 rounded-none w-full' : 'max-w-4xl max-h-[90vh]',
      )}
    >
      {/* Header */}
      <DialogHeader
        className={cn(
          'flex-shrink-0 border-b bg-white dark:bg-slate-900',
          isMobile ? 'p-4 pb-3' : 'p-6 pb-4',
        )}
      >
        <div className={cn('flex gap-4', isMobile ? 'flex-col' : 'items-start justify-between')}>
          <div className="flex-1 min-w-0">
            <DialogTitle className={cn('font-bold mb-1 line-clamp-2', isMobile ? 'text-xl' : 'text-2xl')}>
              {promotion.name}
            </DialogTitle>
            <DialogDescription className={cn('line-clamp-2', isMobile ? 'text-sm' : 'text-base')}>
              {promotion.description || 'Sin descripción'}
            </DialogDescription>
          </div>

          <div className={cn('flex gap-2 flex-shrink-0', isMobile ? 'flex-row justify-between' : 'items-center flex-row')}>
            <Badge className={cn(statusCfg.className, 'whitespace-nowrap')}>
              {statusCfg.label}
              {status === 'active' && timeRemaining && (
                <span className="ml-1 text-xs opacity-75">({timeRemaining})</span>
              )}
            </Badge>
            <Button
              variant="outline"
              size={isMobile ? 'sm' : 'default'}
              onClick={handleViewInPublicSite}
              className="gap-2 whitespace-nowrap"
            >
              <ExternalLink className="h-4 w-4" />
              {isMobile ? 'Ver' : 'Ver en sitio'}
            </Button>
          </div>
        </div>
      </DialogHeader>

      {/* Tabs */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList
            className={cn('grid w-full grid-cols-3 flex-shrink-0', isMobile ? 'mx-2 mt-2' : 'mx-6 mt-4')}
            aria-label="Secciones de la promoción"
          >
            <TabsTrigger value="overview" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className={isMobile ? 'hidden sm:inline' : ''}>Resumen</span>
            </TabsTrigger>
            <TabsTrigger value="products" className="gap-2">
              <Package className="h-4 w-4" />
              <span className={isMobile ? 'hidden sm:inline' : ''}>Productos</span>
              {promotion.applicableProducts && promotion.applicableProducts.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1 text-xs">
                  {promotion.applicableProducts.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-2">
              <Eye className="h-4 w-4" />
              <span className={isMobile ? 'hidden sm:inline' : ''}>Vista Previa</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 min-h-0">
            <ScrollArea className="h-full">
              <div className={cn('pb-6', isMobile ? 'px-3' : 'px-6')}>

                {/* ── OVERVIEW TAB ── */}
                <TabsContent value="overview" className="space-y-5 mt-4">

                  {/* Discount highlight */}
                  <Card className="border-violet-200 dark:border-violet-800 bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30">
                    <CardContent className={cn('flex items-center gap-4', isMobile ? 'p-4 flex-col text-center' : 'p-6')}>
                      <div className={cn('bg-white dark:bg-slate-900 rounded-xl shadow-sm', isMobile ? 'p-3' : 'p-4')}>
                        <Percent className={cn('text-violet-600 dark:text-violet-400', isMobile ? 'h-6 w-6' : 'h-8 w-8')} />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Descuento</p>
                        <p className={cn('font-bold text-slate-900 dark:text-white', isMobile ? 'text-2xl' : 'text-3xl')}>
                          {promotion.discountType === 'PERCENTAGE'
                            ? `${promotion.discountValue}%`
                            : formatCurrency(promotion.discountValue)}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {promotion.discountType === 'PERCENTAGE' ? 'Porcentaje' : 'Monto fijo'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Date range */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-950/30 rounded-lg">
                          <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Inicio</p>
                          <p className="font-semibold text-slate-900 dark:text-white">{formatDate(promotion.startDate)}</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-2 bg-red-100 dark:bg-red-950/30 rounded-lg">
                          <Clock className="h-5 w-5 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Fin</p>
                          <p className="font-semibold text-slate-900 dark:text-white">{formatDate(promotion.endDate)}</p>
                          {timeRemaining && status === 'active' && (
                            <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">Quedan {timeRemaining}</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Separator />

                  {/* Usage stats */}
                  {!!promotion.usageLimit && (
                    <div>
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Estadísticas de Uso
                      </h3>
                      <Card>
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600 dark:text-slate-400">Usos actuales</span>
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {promotion.usageCount ?? 0} / {promotion.usageLimit}
                            </span>
                          </div>
                          <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-300"
                              style={{
                                width: `${Math.min(((promotion.usageCount ?? 0) / promotion.usageLimit) * 100, 100)}%`,
                              }}
                            />
                          </div>
                          <p className="text-xs text-slate-500">
                            {promotion.usageLimit - (promotion.usageCount ?? 0)} usos restantes
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Conditions */}
                  {((promotion.minPurchaseAmount ?? 0) > 0 || (promotion.maxDiscountAmount ?? 0) > 0) && (
                    <div>
                      <h3 className="text-sm font-semibold mb-3">Condiciones</h3>
                      <Card>
                        <CardContent className="p-4 space-y-2">
                          {(promotion.minPurchaseAmount ?? 0) > 0 && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-600 dark:text-slate-400">Compra mínima</span>
                              <span className="font-semibold text-slate-900 dark:text-white">
                                {formatCurrency(promotion.minPurchaseAmount!)}
                              </span>
                            </div>
                          )}
                          {(promotion.maxDiscountAmount ?? 0) > 0 && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-600 dark:text-slate-400">Descuento máximo</span>
                              <span className="font-semibold text-slate-900 dark:text-white">
                                {formatCurrency(promotion.maxDiscountAmount!)}
                              </span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Applicable products summary */}
                  {promotion.applicableProducts && promotion.applicableProducts.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Productos Aplicables ({promotion.applicableProducts.length})
                      </h3>
                      <Card>
                        <CardContent className="p-4">
                          <div className="max-h-40 overflow-y-auto space-y-1">
                            {promotion.applicableProducts.map((product: any) => (
                              <div
                                key={product.id}
                                className="flex items-center justify-between text-sm py-1.5 border-b last:border-0"
                              >
                                <span className="text-slate-900 dark:text-white truncate">{product.name}</span>
                                {product.price != null && (
                                  <span className="text-slate-500 ml-2 flex-shrink-0">
                                    {formatCurrency(product.price)}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Metadata */}
                  {promotion.createdAt && (
                    <p className="text-xs text-slate-400 text-center pt-2 border-t">
                      Creada el {formatDate(promotion.createdAt)}
                    </p>
                  )}
                </TabsContent>

                {/* ── PRODUCTS TAB ── */}
                <TabsContent value="products" className="mt-4">
                  <TabContentWrapper>
                    <MemoizedProductsManager {...productsManagerProps} />
                  </TabContentWrapper>
                </TabsContent>

                {/* ── PREVIEW TAB ── */}
                <TabsContent value="preview" className="mt-4">
                  <TabContentWrapper>
                    <MemoizedOfferPreview promotion={promotion} />
                  </TabContentWrapper>
                </TabsContent>

              </div>
            </ScrollArea>
          </div>
        </Tabs>
      </div>
    </DialogContent>
  );
}

export function PromotionDetailsDialog({ promotion, open, onOpenChange }: PromotionDetailsDialogProps) {
  const validation = useMemo(() => validatePromotion(promotion), [promotion]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {!validation.isValid ? (
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Error en los datos</DialogTitle>
            <DialogDescription>No se puede mostrar la información de la promoción</DialogDescription>
          </DialogHeader>
          <ValidationErrors
            errors={validation.errors}
            warnings={validation.warnings}
            onClose={() => onOpenChange(false)}
          />
        </DialogContent>
      ) : (
        <PromotionDetailsContent promotion={promotion!} onOpenChange={onOpenChange} />
      )}
    </Dialog>
  );
}
