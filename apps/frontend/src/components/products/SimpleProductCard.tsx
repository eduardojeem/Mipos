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
}

export const SimpleProductCard = memo(function SimpleProductCard({
  product,
  onEdit,
  onDelete,
  onView
}: SimpleProductCardProps) {
  const stock = product.stock_quantity || 0;
  const isLowStock = stock <= (product.min_stock || 5);
  const price = `Gs ${(product.sale_price || 0).toLocaleString('es-PY')}`;
  
  return (
    <Card className="group hover:shadow-lg transition-shadow">
      <div className="relative aspect-square bg-muted overflow-hidden">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name || 'Product'}
            fill
            className="object-cover"
            sizes="300px"
            loading="lazy"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Package className="h-12 w-12 text-muted-foreground/30" />
          </div>
        )}
        
        <div className="absolute bottom-2 left-2">
          <Badge variant={stock === 0 ? 'destructive' : isLowStock ? 'secondary' : 'default'}>
            {stock}
          </Badge>
        </div>
      </div>
      
      <CardContent className="p-3 space-y-2">
        <div>
          <h3 className="font-medium text-sm line-clamp-2">
            {product.name || 'Sin nombre'}
          </h3>
          <p className="text-xs text-muted-foreground">
            SKU: {product.sku || 'N/A'}
          </p>
        </div>
        
        <p className="text-lg font-bold text-primary">{price}</p>
        
        <div className="flex gap-1">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => onView?.(product)}>
            <Eye className="h-3 w-3 mr-1" />
            Ver
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={() => onEdit?.(product)}>
            <Edit className="h-3 w-3 mr-1" />
            Editar
          </Button>
          <Button variant="outline" size="sm" className="w-8 p-0" onClick={() => onDelete?.(product.id)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});