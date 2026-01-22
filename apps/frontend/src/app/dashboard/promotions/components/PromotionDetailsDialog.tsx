'use client';

import { useState, useMemo, useCallback, memo } from 'react';
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
import { Calendar, Percent, Package, Users, TrendingUp, Clock, ExternalLink, Eye, BarChart3 } from 'lucide-react';
import { formatDate, formatCurrency, cn } from '@/lib/utils';
import { ProductsManager } from './ProductsManager';
import { OfferPreview } from './OfferPreview';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useEnhancedTabs } from '@/hooks/useTabPersistence';
import { validatePromotion, getPromotionStatus, getTimeRemaining, type Promotion } from '@/lib/validation/promotion-validation';
import { ValidationErrors, TabContentWrapper } from '@/components/ui/states';

// Usar el tipo importado de validation
// interface Promotion ya está definida en promotion-validation.ts

interface PromotionDetailsDialogProps {
  promotion: Promotion | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Componentes memoizados para optimización
const MemoizedProductsManager = memo(ProductsManager);
const MemoizedOfferPreview = memo(OfferPreview);

export function PromotionDetailsDialog({
  promotion,
  open,
  onOpenChange,
}: PromotionDetailsDialogProps) {
  // Hooks para responsive y navegación
  const { isMobile, isTablet } = useResponsiveLayout();
  
  // Validación de datos
  const validation = useMemo(() => validatePromotion(promotion), [promotion]);
  
  // Si hay errores de validación, mostrar componente de error
  if (!validation.isValid) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Error en los datos</DialogTitle>
            <DialogDescription>
              No se puede mostrar la información de la promoción
            </DialogDescription>
          </DialogHeader>
          <ValidationErrors 
            errors={validation.errors}
            warnings={validation.warnings}
            onClose={() => onOpenChange(false)}
          />
        </DialogContent>
      </Dialog>
    );
  }

  // Ahora sabemos que promotion es válida
  const validPromotion = promotion!;
  
  // Pestañas disponibles
  const tabs = ['overview', 'products', 'preview'];
  
  // Hook para persistencia de pestañas con navegación por teclado
  const { activeTab, setActiveTab } = useEnhancedTabs(
    `promotion-${validPromotion.id}`,
    tabs,
    'overview',
    { 
      sessionOnly: false,
      expireAfter: 24 * 60 * 60 * 1000, // 24 horas
      keyboardNavigation: true 
    }
  );

  // Calcular estado y tiempo restante
  const status = useMemo(() => getPromotionStatus(validPromotion), [validPromotion]);
  const timeRemaining = useMemo(() => getTimeRemaining(validPromotion.endDate), [validPromotion.endDate]);

  // Memoizar props para componentes hijos
  const productsManagerProps = useMemo(() => ({
    promotionId: validPromotion.id,
    discountType: validPromotion.discountType,
    discountValue: validPromotion.discountValue
  }), [validPromotion.id, validPromotion.discountType, validPromotion.discountValue]);

  const handleViewInPublicSite = useCallback(() => {
    const url = `/offers?promotion=${validPromotion.id}`;
    window.open(url, '_blank');
  }, [validPromotion.id]);

  const statusConfig = {
    active: {
      label: 'Activa',
      className: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400',
    },
    scheduled: {
      label: 'Programada',
      className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-400',
    },
    expired: {
      label: 'Expirada',
      className: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400',
    },
    inactive: {
      label: 'Inactiva',
      className: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400',
    },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={cn(
          "flex flex-col p-0 gap-0",
          isMobile 
            ? "h-full max-h-full m-0 rounded-none w-full" 
            : "max-w-4xl max-h-[90vh]"
        )}
      >
        {/* Header responsivo */}
        <DialogHeader className={cn(
          "flex-shrink-0 p-4 border-b bg-white dark:bg-slate-900",
          isMobile ? "pb-3" : "p-6 pb-4"
        )}>
          <div className={cn(
            "flex gap-4",
            isMobile ? "flex-col space-y-3" : "items-start justify-between"
          )}>
            <div className="flex-1 min-w-0">
              <DialogTitle className={cn(
                "font-bold mb-2 line-clamp-2",
                isMobile ? "text-xl" : "text-2xl"
              )}>
                {validPromotion.name}
              </DialogTitle>
              <DialogDescription className={cn(
                "line-clamp-3",
                isMobile ? "text-sm" : "text-base"
              )}>
                {validPromotion.description}
              </DialogDescription>
            </div>
            <div className={cn(
              "flex gap-2 flex-shrink-0",
              isMobile ? "flex-row justify-between" : "items-center flex-col sm:flex-row"
            )}>
              <Badge className={cn(
                statusConfig[status].className,
                "whitespace-nowrap"
              )}>
                {statusConfig[status].label}
                {status === 'active' && timeRemaining && (
                  <span className="ml-1 text-xs opacity-75">
                    ({timeRemaining})
                  </span>
                )}
              </Badge>
              <Button
                variant="outline"
                size={isMobile ? "sm" : "default"}
                onClick={handleViewInPublicSite}
                className="gap-2 whitespace-nowrap"
              >
                <ExternalLink className="h-4 w-4" />
                {isMobile ? "Ver" : "Ver en sitio"}
              </Button>
            </div>
          </div>
          
          {/* Mostrar advertencias si las hay */}
          {validation.warnings.length > 0 && (
            <div className="mt-3">
              <ValidationErrors 
                errors={[]}
                warnings={validation.warnings}
                title="Advertencias"
              />
            </div>
          )}
        </DialogHeader>

        {/* Contenido principal con scroll */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList 
              className={cn(
                "grid w-full grid-cols-3 flex-shrink-0 mx-4 mt-4",
                isMobile ? "mx-2 mt-2" : "mx-6 mt-4"
              )}
              role="tablist"
              aria-label="Información de la promoción"
            >
              <TabsTrigger 
                value="overview" 
                className="gap-2 relative"
                role="tab"
                aria-selected={activeTab === 'overview'}
                title="Resumen general (Ctrl+1)"
              >
                <TrendingUp className="h-4 w-4" />
                <span className={cn(isMobile ? "hidden sm:inline" : "")}>
                  Resumen
                </span>
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
              </TabsTrigger>
              <TabsTrigger 
                value="products" 
                className="gap-2 relative"
                role="tab"
                aria-selected={activeTab === 'products'}
                title="Gestión de productos (Ctrl+2)"
              >
                <Package className="h-4 w-4" />
                <span className={cn(isMobile ? "hidden sm:inline" : "")}>
                  Productos
                </span>
                {validPromotion.applicableProducts && validPromotion.applicableProducts.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-xs flex items-center justify-center">
                    {validPromotion.applicableProducts.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="preview" 
                className="gap-2 relative"
                role="tab"
                aria-selected={activeTab === 'preview'}
                title="Vista previa pública (Ctrl+3)"
              >
                <Eye className="h-4 w-4" />
                <span className={cn(isMobile ? "hidden sm:inline" : "")}>
                  Vista Previa
                </span>
                {status === 'active' && (
                  <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 text-xs bg-green-100 text-green-700">
                    ●
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Contenido de pestañas con scroll */}
            <div className="flex-1 min-h-0">
              <ScrollArea className="h-full">
                <div className={cn(
                  "pb-6",
                  isMobile ? "px-2" : "px-6"
                )}>
                  <TabsContent 
                    value="overview" 
                    className="space-y-6 mt-4 focus:outline-none"
                    role="tabpanel"
                    aria-labelledby="tab-overview"
                    tabIndex={0}
                  >
                    {/* Discount Info */}
                    <Card className="border-violet-200 dark:border-violet-800 bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30">
                      <CardContent className={cn(
                        isMobile ? "p-4" : "p-6"
                      )}>
                        <div className={cn(
                          "flex items-center gap-4",
                          isMobile ? "flex-col text-center" : ""
                        )}>
                          <div className={cn(
                            "bg-white dark:bg-slate-900 rounded-xl shadow-sm",
                            isMobile ? "p-3" : "p-4"
                          )}>
                            <Percent className={cn(
                              "text-violet-600 dark:text-violet-400",
                              isMobile ? "h-6 w-6" : "h-8 w-8"
                            )} />
                          </div>
                          <div className={cn(isMobile ? "space-y-1" : "")}>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                              Descuento
                            </p>
                            <p className={cn(
                              "font-bold text-slate-900 dark:text-white",
                              isMobile ? "text-2xl" : "text-3xl"
                            )}>
                              {validPromotion.discountType === 'PERCENTAGE'
                                ? `${validPromotion.discountValue}%`
                                : formatCurrency(validPromotion.discountValue)}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                              {validPromotion.discountType === 'PERCENTAGE' ? 'Porcentaje' : 'Monto fijo'}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Date Range */}
                    <div className={cn(
                      "grid gap-4",
                      isMobile ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
                    )}>
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-950/30 rounded-lg">
                              <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-500">Inicio</p>
                              <p className="font-semibold text-slate-900 dark:text-white">
                                {formatDate(validPromotion.startDate)}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-100 dark:bg-red-950/30 rounded-lg">
                              <Clock className="h-5 w-5 text-red-600 dark:text-red-400" />
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-500">Fin</p>
                              <p className="font-semibold text-slate-900 dark:text-white">
                                {formatDate(validPromotion.endDate)}
                              </p>
                              {timeRemaining && status === 'active' && (
                                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                  Quedan {timeRemaining}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

          <Separator />

                    <Separator />

                    {/* Usage Stats */}
                    {validPromotion.usageLimit && (
                      <div>
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          Estadísticas de Uso
                        </h3>
                        <Card>
                          <CardContent className="p-4">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-600 dark:text-slate-400">
                                  Usos actuales
                                </span>
                                <span className="font-semibold text-slate-900 dark:text-white">
                                  {validPromotion.usageCount || 0} / {validPromotion.usageLimit}
                                </span>
                              </div>
                              <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-300"
                                  style={{
                                    width: `${Math.min(
                                      ((validPromotion.usageCount || 0) / validPromotion.usageLimit) * 100,
                                      100
                                    )}%`,
                                  }}
                                />
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-500">
                                {validPromotion.usageLimit - (validPromotion.usageCount || 0)} usos restantes
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {/* Conditions */}
                    {(validPromotion.minPurchaseAmount || validPromotion.maxDiscountAmount) && (
                      <div>
                        <h3 className="text-sm font-semibold mb-3">Condiciones</h3>
                        <Card>
                          <CardContent className="p-4 space-y-2">
                            {validPromotion.minPurchaseAmount && validPromotion.minPurchaseAmount > 0 && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-600 dark:text-slate-400">
                                  Compra mínima
                                </span>
                                <span className="font-semibold text-slate-900 dark:text-white">
                                  {formatCurrency(validPromotion.minPurchaseAmount)}
                                </span>
                              </div>
                            )}
                            {validPromotion.maxDiscountAmount && validPromotion.maxDiscountAmount > 0 && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-600 dark:text-slate-400">
                                  Descuento máximo
                                </span>
                                <span className="font-semibold text-slate-900 dark:text-white">
                                  {formatCurrency(validPromotion.maxDiscountAmount)}
                                </span>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {/* Applicable Products */}
                    {validPromotion.applicableProducts && validPromotion.applicableProducts.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          Productos Aplicables ({validPromotion.applicableProducts.length})
                        </h3>
                        <Card>
                          <CardContent className="p-4">
                            <div className="max-h-40 overflow-y-auto space-y-2">
                              {validPromotion.applicableProducts.map((product: any) => (
                                <div
                                  key={product.id}
                                  className="flex items-center justify-between text-sm py-2 border-b last:border-0"
                                >
                                  <span className="text-slate-900 dark:text-white truncate">
                                    {product.name}
                                  </span>
                                  <span className="text-slate-600 dark:text-slate-400 ml-2 flex-shrink-0">
                                    {formatCurrency(product.price)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {/* Metadata */}
                    {validPromotion.createdAt && (
                      <div className="text-xs text-slate-500 dark:text-slate-500 text-center pt-4 border-t">
                        Creada el {formatDate(validPromotion.createdAt)}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent 
                    value="products" 
                    className="mt-4 focus:outline-none"
                    role="tabpanel"
                    aria-labelledby="tab-products"
                    tabIndex={0}
                  >
                    <TabContentWrapper>
                      <MemoizedProductsManager {...productsManagerProps} />
                    </TabContentWrapper>
                  </TabsContent>

                  <TabsContent 
                    value="preview" 
                    className="mt-4 focus:outline-none"
                    role="tabpanel"
                    aria-labelledby="tab-preview"
                    tabIndex={0}
                  >
                    <TabContentWrapper>
                      <MemoizedOfferPreview promotion={validPromotion} />
                    </TabContentWrapper>
                  </TabsContent>
                </div>
              </ScrollArea>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
