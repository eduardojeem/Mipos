'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Minus, Plus, Trash2, X } from 'lucide-react';
import type { Product } from '@/types';
import { cn } from '@/lib/utils';

export interface CartItemDetail {
  product: Product;
  quantity: number;
  selectedOptions?: Record<string, string> | null;
}

interface CartItemDetailModalProps {
  item: CartItemDetail | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
}

export const CartItemDetailModal: React.FC<CartItemDetailModalProps> = ({ item, isOpen, onClose, onUpdateQuantity, onRemoveItem }) => {
  const [localQty, setLocalQty] = useState<number>(item?.quantity ?? 1);
  const isOutOfStock = (item?.product?.stock_quantity ?? 0) <= 0;
  const maxQty = Math.max(1, item?.product?.stock_quantity ?? 1);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setLocalQty(item?.quantity ?? 1);
  }, [item?.quantity, item?.product?.id]);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    }
    // restore focus on close
    return () => {
      previousFocusRef.current?.focus();
    };
  }, [isOpen]);

  const unitPrice = useMemo(() => item?.product?.sale_price ?? 0, [item?.product?.sale_price]);
  const totalPrice = useMemo(() => unitPrice * (localQty || 0), [unitPrice, localQty]);

  if (!item || !item.product) return null;

  const handleQtyDelta = (delta: number) => {
    const next = Math.min(maxQty, Math.max(1, (localQty || 1) + delta));
    setLocalQty(next);
    onUpdateQuantity(item.product.id, next);
    // a11y live region announcement
    const live = document.createElement('div');
    live.setAttribute('aria-live', 'polite');
    live.className = 'sr-only';
    live.textContent = `Cantidad actualizada a ${next}`;
    document.body.appendChild(live);
    setTimeout(() => document.body.removeChild(live), 700);
  };

  const hasOptions = !!item.selectedOptions && Object.keys(item.selectedOptions).length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn('max-w-3xl p-0 animate-in fade-in-50 zoom-in-95 duration-200')}> 
        <DialogHeader>
          <DialogTitle className="sr-only">Detalles del artículo en el carrito</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[85vh]">
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Imagen alta resolución */}
            <div className="relative bg-muted/20">
              <div className="relative aspect-square overflow-hidden">
                <Image
                  src={item.product.image_url || '/api/placeholder/800/800'}
                  alt={item.product.name}
                  fill
                  sizes="(min-width:768px) 50vw, 100vw"
                  className="object-cover"
                  priority
                />
                <Badge className="absolute top-3 left-3" variant="secondary">Alta resolución</Badge>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onClose}
                  aria-label="Cerrar detalles"
                  className="absolute top-3 right-3 h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Información */}
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <h2 className="text-xl font-bold">{item.product.name}</h2>
                {item.product.category_id && (
                  <p className="text-sm text-muted-foreground">SKU: {item.product.sku}</p>
                )}
              </div>

              {/* Descripción completa */}
              {item.product.description && (
                <div>
                  <h3 className="text-sm font-semibold">Descripción</h3>
                  <p className="text-sm text-foreground/90 leading-relaxed">{item.product.description}</p>
                </div>
              )}

              {/* Especificaciones técnicas */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Especificaciones técnicas</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {item.product.brand && (<div><span className="text-muted-foreground">Marca:</span> {item.product.brand}</div>)}
                  {item.product.volume && (<div><span className="text-muted-foreground">Volumen:</span> {item.product.volume}</div>)}
                  {item.product.shade && (<div><span className="text-muted-foreground">Tono:</span> {item.product.shade}</div>)}
                  {typeof item.product.spf === 'number' && (<div><span className="text-muted-foreground">SPF:</span> {item.product.spf}</div>)}
                  {item.product.finish && (<div><span className="text-muted-foreground">Acabado:</span> {item.product.finish}</div>)}
                  {item.product.skin_type && (<div><span className="text-muted-foreground">Piel:</span> {item.product.skin_type}</div>)}
                </div>
              </div>

              {/* Precio unitario y total */}
              <div className="space-y-1" role="group" aria-labelledby="price-info">
                <span id="price-info" className="sr-only">Información de precio</span>
                <p className="text-sm">Precio unitario: <span className="font-medium">{unitPrice.toLocaleString()}</span></p>
                <p className="text-base font-semibold">Total por cantidad: <span className="text-primary">{totalPrice.toLocaleString()}</span></p>
              </div>

              <Separator />

              {/* Opciones de personalización seleccionadas */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Opciones de personalización seleccionadas</h3>
                {hasOptions ? (
                  <ul className="text-sm space-y-1" role="list">
                    {Object.entries(item.selectedOptions as Record<string, string>).map(([key, val]) => (
                      <li key={key} role="listitem"><span className="text-muted-foreground">{key}:</span> {val}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin opciones seleccionadas</p>
                )}
              </div>

              {/* Controles de cantidad */}
              <div className="flex items-center gap-2 mt-2" role="group" aria-label="Modificar cantidad">
                <Button size="sm" variant="outline" onClick={() => handleQtyDelta(-1)} className="h-8 w-8 p-0" aria-label="Disminuir cantidad">
                  <Minus className="w-3 h-3" />
                </Button>
                <span className="w-10 text-center text-sm font-semibold" aria-live="polite">{localQty}</span>
                <Button size="sm" variant="outline" onClick={() => handleQtyDelta(1)} className="h-8 w-8 p-0" aria-label="Aumentar cantidad" disabled={isOutOfStock || localQty >= maxQty}>
                  <Plus className="w-3 h-3" />
                </Button>
              </div>

              {/* Eliminar del carrito */}
              <div className="pt-2">
                <Button variant="ghost" size="sm" onClick={() => onRemoveItem(item.product.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                  <Trash2 className="w-4 h-4 mr-2" aria-hidden="true" />
                  Eliminar del carrito
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default CartItemDetailModal;