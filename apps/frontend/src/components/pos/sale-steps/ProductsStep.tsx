'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Package2, AlertTriangle } from 'lucide-react';
import { useCurrencyFormatter } from '@/contexts/BusinessConfigContext';
import type { CartItem } from '@/hooks/useCart';
import type { Product } from '@/types';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface ProductsStepProps {
  cart: CartItem[];
  products: Product[];
  onRemoveItem?: (productId: string) => void;
  insufficientStockItems: Array<{ id: string; name: string; requested: number; available: number }>;
}

/**
 * Step 1: Products Review
 * Displays cart items with stock validation
 */
export function ProductsStep({ cart, products, onRemoveItem, insufficientStockItems }: ProductsStepProps) {
  const fmtCurrency = useCurrencyFormatter();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package2 className="w-5 h-5" />
          Productos en el carrito ({cart.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Stock warnings */}
        {insufficientStockItems.length > 0 && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-destructive">Stock insuficiente</p>
                <ul className="text-xs text-destructive/80 mt-1 space-y-1">
                  {insufficientStockItems.map((item) => (
                    <li key={item.id}>
                      {item.name}: Solicitado {item.requested}, Disponible {item.available}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Cart items */}
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {cart.map((item) => {
            const product = products.find((p) => p.id === item.product_id);
            const hasStockIssue = insufficientStockItems.some((i) => i.id === item.product_id);

            return (
              <div
                key={item.product_id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border',
                  hasStockIssue ? 'bg-destructive/5 border-destructive/20' : 'bg-muted/50'
                )}
              >
                {/* Product image */}
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  {product?.image_url ? (
                    <Image
                      src={product.image_url}
                      alt={item.product_name}
                      width={48}
                      height={48}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package2 className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Product info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.product_name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {item.quantity}x {fmtCurrency(item.price)}
                    </Badge>
                    {hasStockIssue && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Sin stock
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Total and actions */}
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm">{fmtCurrency(item.total)}</p>
                  {onRemoveItem && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveItem(item.product_id)}
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {cart.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Package2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No hay productos en el carrito</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
