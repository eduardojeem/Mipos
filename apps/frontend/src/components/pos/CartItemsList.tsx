import React, { memo, useEffect, useRef, useState } from 'react';
import { Trash2, Package2, Star, Percent, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useCurrencyFormatter } from '@/contexts/BusinessConfigContext';
import toast from '@/lib/toast';
import { CartQuantityControls } from './CartQuantityControls';
import { CartItemIvaDetails } from './CartItemIvaDetails';

interface ItemWithIva {
  product_id: string;
  product_name: string;
  description?: string;
  price: number;
  quantity: number;
  unit?: string;
  total: number;
  subtotal_without_iva?: number;
  iva_amount?: number;
  iva_rate?: number;
  product?: {
    image_url?: string;
    is_featured?: boolean;
    discount_percentage?: number;
    original_price?: number;
    rating?: number;
    stock_quantity?: number;
    low_stock_threshold?: number;
  };
}

interface CartItemsListProps {
  items: ItemWithIva[];
  onRemoveItem: (productId: string) => void;
  onSetQuantity: (productId: string, quantity: number) => void;
  highlightProductId?: string;
  onViewInCatalog?: (productId: string) => void;
  onViewDetails?: (productId: string) => void;
  isWholesaleMode?: boolean;
  compact?: boolean;
}

function CartItemsListComponent({
  items,
  onRemoveItem,
  onSetQuantity,
  highlightProductId,
  onViewInCatalog,
  onViewDetails,
  isWholesaleMode = false,
  compact = false
}: CartItemsListProps) {
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [pulseItemId, setPulseItemId] = useState<string | null>(null);
  // Swipe-to-remove state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragX, setDragX] = useState<number>(0);
  const touchStartXRef = useRef<number>(0);
  const fmtCurrency = useCurrencyFormatter();

  const handleTouchStart = (id: string, e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches && e.touches.length > 0) {
      touchStartXRef.current = e.touches[0].clientX;
      setDraggingId(id);
      setDragX(0);
    }
  };
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!draggingId) return;
    const x = e.touches[0]?.clientX ?? touchStartXRef.current;
    const dx = x - touchStartXRef.current;
    // Only allow left swipe
    setDragX(Math.min(0, dx));
  };
  const handleTouchEnd = () => {
    if (!draggingId) return;
    const threshold = -64; // px to trigger delete
    if (dragX <= threshold) {
      onRemoveItem(draggingId);
      toast.info('Producto eliminado del carrito');
    }
    setDraggingId(null);
    setDragX(0);
  };

  const handleQuantityChange = (productId: string, delta: number) => {
    const currentItem = items.find(item => item.product_id === productId);
    if (!currentItem) return;
    
    const stock = currentItem.product?.stock_quantity ?? 999;
    const newQuantity = Math.max(1, Math.min(stock, currentItem.quantity + delta));
    if (newQuantity !== currentItem.quantity) {
      onSetQuantity(productId, newQuantity);
      setPulseItemId(productId);
    }
    if (newQuantity >= stock && delta > 0) {
      toast.warning('Stock insuficiente', { description: `Máximo disponible: ${stock}` });
    }
  };

  const handleDirectQuantityChange = (productId: string, value: string) => {
    setQuantities(prev => ({ ...prev, [productId]: value }));
    
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue > 0) {
      const currentItem = items.find(item => item.product_id === productId);
      const stock = currentItem?.product?.stock_quantity ?? 999;
      const clamped = Math.min(stock, numValue);
      if (clamped !== numValue) {
        toast.warning('Stock insuficiente', { description: `Máximo disponible: ${stock}` });
      }
      onSetQuantity(productId, Math.max(1, clamped));
      setPulseItemId(productId);
    }
  };

  useEffect(() => {
    if (highlightProductId) {
      const element = document.getElementById(`cart-item-${highlightProductId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('animate-pulse');
        setTimeout(() => {
          element.classList.remove('animate-pulse');
        }, 2000);
      }
    }
  }, [highlightProductId]);

  useEffect(() => {
    if (!pulseItemId) return;
    const t = setTimeout(() => setPulseItemId(null), 450);
    return () => clearTimeout(t);
  }, [pulseItemId]);

  if (items.length === 0) {
    return (
      <div
        className="text-center py-10 sm:py-12 px-3"
        role="region"
        aria-label="Carrito vacío"
        aria-live="polite"
        style={{ contentVisibility: 'auto' }}
      >
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-4">
          <Package2 className="h-10 w-10 text-muted-foreground" />
        </div>
        <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">
          Carrito vacío
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Selecciona productos del catálogo para comenzar
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
          <Button asChild className="w-full sm:w-auto h-10">
            <a href="#catalog-title" aria-label="Ir al catálogo">Ver catálogo</a>
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto h-10">
            <a href="#quick-access-top-products" aria-label="Ver accesos rápidos">Accesos rápidos</a>
          </Button>
        </div>
        <div className="mt-3 text-xs text-muted-foreground">
          Consejo: usa la barra de búsqueda para encontrar productos rápidamente
        </div>
      </div>
    );
  }

  return (
    <div className={`${compact ? 'space-y-2' : 'space-y-3'} min-h-0 pr-1 sm:pr-2`} style={{ contentVisibility: 'auto' }}>
      {items.map((item) => {
        const hasDiscount = item.product?.discount_percentage && item.product.discount_percentage > 0;
        const isLowStock = item.product?.stock_quantity && item.product?.low_stock_threshold 
          ? item.product.stock_quantity <= item.product.low_stock_threshold 
          : false;
        
        return (
          <Card
            key={item.product_id}
            id={`cart-item-${item.product_id}`}
            className={`group relative overflow-hidden transition-colors duration-200 hover:bg-muted/40 dark:hover:bg-muted/20 ${
              item.product_id === highlightProductId ? "ring-1 ring-primary/50 dark:ring-primary/40" : ""
            } ${isWholesaleMode ? "border-l-2 border-l-orange-500/70 dark:border-l-orange-400/70" : "border-l-2 border-l-primary/30 dark:border-l-primary/40"}`}
          >
            {/* Background delete affordance */}
            <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
              <div className="absolute inset-y-0 right-0 w-24 flex items-center justify-center bg-red-600/80 dark:bg-red-700/80 text-white">
                <Trash2 className="h-5 w-5" />
              </div>
            </div>
            <CardContent
              className={`${compact ? 'p-2 sm:p-2.5' : 'p-3 sm:p-3.5'}`}
              onTouchStart={(e) => handleTouchStart(item.product_id, e)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div
                className="flex flex-col sm:flex-row gap-2.5 sm:gap-3"
                style={{
                  transform: draggingId === item.product_id ? `translateX(${dragX}px)` : undefined,
                  transition: draggingId === item.product_id ? 'none' : 'transform 200ms ease',
                }}
              >
                {/* Imagen del producto */}
                <div className="flex-shrink-0 mx-auto sm:mx-0">
                  <div className={`relative ${compact ? 'w-10 h-10 sm:w-10 sm:h-10' : 'w-12 h-12 sm:w-12 sm:h-12'} rounded-md overflow-hidden bg-muted dark:bg-muted`}>
                    {item.product?.image_url ? (
                      <img
                        src={item.product.image_url}
                        alt={item.product_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package2 className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} text-muted-foreground dark:text-muted-foreground`} />
                      </div>
                    )}
                    
                    {/* Indicadores visuales en la esquina superior derecha */}
                    <div className="absolute top-0.5 right-0.5 hidden group-hover:flex flex-col gap-0.5">
                      {item.product?.is_featured && (
                        <div className="bg-yellow-500 text-white p-0.5 sm:p-1 rounded-full shadow-lg">
                          <Star className={`${compact ? 'h-2 w-2 sm:h-2.5 sm:w-2.5' : 'h-2.5 w-2.5 sm:h-3 sm:w-3'}`} fill="currentColor" />
                        </div>
                      )}
                      {hasDiscount && (
                        <div className="bg-red-500 text-white p-0.5 sm:p-1 rounded-full shadow-lg">
                          <Percent className={`${compact ? 'h-2 w-2 sm:h-2.5 sm:w-2.5' : 'h-2.5 w-2.5 sm:h-3 sm:w-3'}`} />
                        </div>
                      )}
                      {isLowStock && (
                        <div className="bg-orange-500 text-white p-0.5 sm:p-1 rounded-full shadow-lg">
                          <AlertTriangle className={`${compact ? 'h-2 w-2 sm:h-2.5 sm:w-2.5' : 'h-2.5 w-2.5 sm:h-3 sm:w-3'}`} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Información del producto */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col gap-2 sm:gap-2.5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0 pr-2">
                        <h3 className={`${compact ? 'text-xs' : 'text-sm'} font-medium text-foreground truncate`}>
                          {item.product_name}
                        </h3>
                        {item.product?.discount_percentage && item.product.discount_percentage > 0 && (
                          <div className="mt-1">
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400">Promoción</Badge>
                          </div>
                        )}
                        {!compact && (
                          <p className={`text-[11px] text-muted-foreground mt-0.5 truncate opacity-0 group-hover:opacity-100 transition-opacity`}>
                            {item.description || 'Producto sin descripción'}
                          </p>
                        )}
                      </div>
                      
                      {/* Botón eliminar */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveItem(item.product_id)}
                        className={`text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors duration-200 rounded-full shadow-sm hover:shadow-md flex-shrink-0 min-w-[44px] min-h-[44px] ${compact ? 'p-2' : 'p-2.5'}`}
                      >
                        <Trash2 className={`${compact ? 'h-4 w-4' : 'h-5 w-5'}`} />
                      </Button>
                    </div>

                    {/* Rating y disponibilidad: ocultos en modo compacto para priorizar información clave */}
                    {!compact && (
                    <div className="mt-1 hidden group-hover:flex items-center gap-2">
                      {(() => {
                        const rating = item.product?.rating;
                        return rating ? (
                          <div className="flex items-center gap-1">
                            <div className="flex">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-3 w-3 sm:h-4 sm:w-4 ${
                                    i < Math.floor(rating)
                                      ? 'text-yellow-400 fill-current'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-xs sm:text-sm text-gray-600 ml-1">
                              ({rating})
                            </span>
                          </div>
                        ) : null;
                      })()}
                      
                      {/* Disponibilidad de stock */}
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                          isLowStock ? 'bg-orange-500' : 'bg-green-500'
                        }`} />
                        <span className={`text-xs sm:text-sm font-medium ${
                          isLowStock ? 'text-orange-600' : 'text-green-600'
                        }`}>
                          {isLowStock ? 'Stock bajo' : 'Disponible'}
                        </span>
                      </div>
                    </div>
                    )}

                    {/* Precio unitario */}
                    <div className={`flex items-center justify-between gap-2 ${compact ? 'mb-1.5' : 'mb-2'}`}>
                      <div className="flex flex-col xs:flex-row xs:items-center gap-1.5 xs:gap-2 sm:gap-3">
                        {hasDiscount && item.product?.original_price && (
                          <span className="text-xs sm:text-sm text-gray-500 line-through">
                            {fmtCurrency(item.product.original_price)}
                          </span>
                        )}
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <span className={`${compact ? 'text-[13px]' : 'text-sm'} font-semibold text-foreground`}>
                            {fmtCurrency(item.price)}
                          </span>
                          {hasDiscount && (
                            <span className="bg-red-100 text-red-800 text-xs font-semibold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full">
                              -{item.product?.discount_percentage}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Controles de cantidad y total (compactos y accesibles) */}
                    <div className={`${compact ? 'p-1.5' : 'p-2'} rounded-lg border border-border/30 dark:border-border/20`}>
                      <div className="flex items-center justify-between gap-3">
                        {/* Controles de cantidad extraídos */}
                        <CartQuantityControls
                          productId={item.product_id}
                          quantity={item.quantity}
                          stockQuantity={item.product?.stock_quantity}
                          onChangeQuantity={handleQuantityChange}
                          onDirectChange={handleDirectQuantityChange}
                        />

                        {/* Total del ítem */}
                        <div
                          className={`text-right space-y-0.5 ${pulseItemId === item.product_id ? 'animate-pulse' : ''}`}
                          role="status"
                          aria-live="polite"
                        >
                          <div className="text-base font-bold text-primary dark:text-primary">
                            {fmtCurrency(item.total)}
                          </div>
                          <div className="text-[10px] text-muted-foreground dark:text-muted-foreground">
                            Total
                          </div>
                        </div>
                        {/* Toggle y detalles de IVA extraídos */}
                        <div className="flex items-center">
                          <CartItemIvaDetails
                            item={item}
                            expanded={expandedItemId === item.product_id}
                            onToggle={() => setExpandedItemId(expandedItemId === item.product_id ? null : item.product_id)}
                          />
                        </div>
                      </div>
                      {/* Accesos rápidos por ítem: simplificados en modo compacto */}
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          onClick={() => handleQuantityChange(item.product_id, 1)}
                          aria-label="Agregar uno"
                        >
                          +1
                        </Button>
                        {!compact && (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2"
                              onClick={() => handleQuantityChange(item.product_id, 2)}
                              aria-label="Agregar dos"
                            >
                              +2
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2"
                              onClick={() => handleQuantityChange(item.product_id, 5)}
                              aria-label="Agregar cinco"
                            >
                              +5
                            </Button>
                          </>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 px-2"
                          onClick={() => onSetQuantity(item.product_id, 1)}
                          aria-label="Fijar cantidad a uno"
                        >
                          x1
                        </Button>

                        {!compact && onViewInCatalog && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 ml-auto"
                            onClick={() => onViewInCatalog(item.product_id)}
                            aria-label="Ver en catálogo"
                          >
                            Ver
                          </Button>
                        )}
                        {onViewDetails && (
                          <Button
                            type="button"
                            size="sm"
                            variant="link"
                            className="h-7 px-2"
                            onClick={() => onViewDetails(item.product_id)}
                            aria-label="Ver detalles del producto"
                          >
                            Ver detalles
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Panel de IVA ahora renderizado desde sub-componente */}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

const propsAreEqual = (prev: CartItemsListProps, next: CartItemsListProps) => {
  return (
    prev.items === next.items &&
    prev.isWholesaleMode === next.isWholesaleMode &&
    prev.onRemoveItem === next.onRemoveItem &&
    prev.onSetQuantity === next.onSetQuantity &&
    prev.highlightProductId === next.highlightProductId &&
    prev.onViewInCatalog === next.onViewInCatalog &&
    prev.compact === next.compact
  );
};

export const CartItemsList = memo(CartItemsListComponent, propsAreEqual);