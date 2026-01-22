'use client';

import React, { memo } from 'react';
import Image from 'next/image';
import { Package, Edit, Trash2, Eye } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Product } from '@/types';

interface SimpleProductCardProps {
  product: Product;
  onEdit?: (product: Product) => void;
  onDelete?: (id: string) => void;
  onView?: (product: Product) => void;
  priority?: boolean;
}

export const SimpleProductCard = memo(function SimpleProductCard({
  product,
  onEdit,
  onDelete,
  onView,
  priority = false
}: SimpleProductCardProps) {
  const stock = product.stock_quantity || 0;
  const isLowStock = stock <= (product.min_stock || 5) && stock > 0;
  const isOutOfStock = stock === 0;
  const price = `Gs ${(product.sale_price || 0).toLocaleString('es-PY')}`;

  // Get first image from images array or use image_url as fallback
  const imageUrl = Array.isArray(product.images) && product.images.length > 0
    ? product.images[0]
    : product.image_url || null;

  return (
    <Card className="group hover:shadow-2xl hover:shadow-violet-500/20 transition-all duration-300 border-violet-200/50 dark:border-violet-800/30 overflow-hidden">
      <div className="relative aspect-square bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-950/30 dark:to-fuchsia-950/30 overflow-hidden">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.name || 'Product'}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-500"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            loading={priority ? undefined : 'lazy'}
            priority={priority}
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-gradient-to-br from-violet-100/50 via-fuchsia-100/50 to-pink-100/50 dark:from-violet-950/30 dark:via-fuchsia-950/30 dark:to-pink-950/30">
            <Package className="h-12 w-12 text-violet-400 dark:text-violet-500" />
          </div>
        )}

        <div className="absolute bottom-2 left-2">
          <Badge
            variant={isOutOfStock ? 'destructive' : isLowStock ? 'secondary' : 'default'}
            className={`shadow-lg font-semibold ${isOutOfStock
                ? 'bg-red-500 hover:bg-red-600 text-white border-red-600'
                : isLowStock
                  ? 'bg-amber-400 hover:bg-amber-500 text-amber-900 border-amber-500'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600'
              }`}
          >
            {stock}
          </Badge>
        </div>
      </div>

      <CardContent className="p-3 space-y-2 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm">
        <div>
          <h3 className="font-medium text-sm line-clamp-2 min-h-[2.5rem] text-zinc-900 dark:text-zinc-100">
            {product.name || 'Sin nombre'}
          </h3>
          <p className="text-xs text-muted-foreground truncate">
            SKU: {product.sku || 'N/A'}
          </p>
        </div>

        <p className="text-lg font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 dark:from-violet-400 dark:to-fuchsia-400 bg-clip-text text-transparent">{price}</p>

        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/30 hover:border-violet-400 transition-colors"
            onClick={() => onView?.(product)}
          >
            <Eye className="h-3 w-3 mr-1" />
            Ver
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:border-blue-400 transition-colors"
            onClick={() => onEdit?.(product)}
          >
            <Edit className="h-3 w-3 mr-1" />
            Editar
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-8 p-0 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-400 transition-colors"
            onClick={() => onDelete?.(product.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}, (prevProps, nextProps) => {
  // Custom comparison para evitar re-renders innecesarios
  return (
    prevProps.product.id === nextProps.product.id &&
    prevProps.product.stock_quantity === nextProps.product.stock_quantity &&
    prevProps.product.sale_price === nextProps.product.sale_price &&
    JSON.stringify(prevProps.product.images) === JSON.stringify(nextProps.product.images) &&
    prevProps.product.image_url === nextProps.product.image_url &&
    prevProps.priority === nextProps.priority
  );
});