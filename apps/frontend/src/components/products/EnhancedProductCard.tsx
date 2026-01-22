'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Star,
  Package,
  TrendingUp,
  Copy
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProductQuickViewModal } from './ProductQuickViewModal';

interface Product {
  id: string;
  name: string;
  code: string;
  description?: string;
  stock: number;
  minStock: number;
  price: number;
  costPrice: number;
  categoryId: string;
  category?: {
    id: string;
    name: string;
  };
  discount_percentage?: number;
  image?: string;
  images?: string[];
  supplier?: {
    name: string;
  };
  createdAt: Date;
  updatedAt: Date;
  isFavorite?: boolean;
}

interface EnhancedProductCardProps {
  product: Product;
  onView?: (product: Product) => void;
  onEdit?: (product: Product) => void;
  onDelete?: (productId: string) => void;
  onToggleFavorite?: (productId: string) => void;
  onDuplicate?: (product: Product) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  showActions?: boolean;
}

export function EnhancedProductCard({
  product,
  onView,
  onEdit,
  onDelete,
  onToggleFavorite,
  onDuplicate,
  canEdit = true,
  canDelete = true,
  showActions = true
}: EnhancedProductCardProps) {
  const [showQuickView, setShowQuickView] = useState(false);

  // Calculate if product is new (created in last 7 days)
  const isNew = () => {
    const daysSinceCreation = Math.floor(
      (Date.now() - new Date(product.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysSinceCreation <= 7;
  };

  // Get stock status badge
  const getStockBadge = () => {
    if (product.stock === 0) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          Sin stock
        </Badge>
      );
    }
    
    const criticalThreshold = Math.floor(product.minStock * 0.3);
    
    if (product.stock <= criticalThreshold) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Crítico ({product.stock})
        </Badge>
      );
    }
    
    if (product.stock <= product.minStock) {
      return (
        <Badge className="gap-1 bg-yellow-500 hover:bg-yellow-600 text-white">
          <AlertTriangle className="h-3 w-3" />
          Bajo ({product.stock})
        </Badge>
      );
    }
    
    return (
      <Badge className="gap-1 bg-green-500 hover:bg-green-600 text-white">
        <CheckCircle className="h-3 w-3" />
        Normal ({product.stock})
      </Badge>
    );
  };

  // Calculate discounted price
  const getDiscountedPrice = () => {
    if (!product.discount_percentage || product.discount_percentage === 0) {
      return product.price;
    }
    return Math.round(product.price * (1 - product.discount_percentage / 100));
  };

  // Get stock status color for border
  const getStockBorderColor = () => {
    if (product.stock === 0) return 'border-red-500';
    if (product.stock <= Math.floor(product.minStock * 0.3)) return 'border-red-400';
    if (product.stock <= product.minStock) return 'border-yellow-400';
    return 'border-green-400';
  };

  return (
    <Card 
      className={cn(
        "group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-l-4",
        getStockBorderColor()
      )}
    >
      <CardContent className="p-4">
        {/* Image section */}
        <div className="relative mb-3 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
          <div className="aspect-square relative">
            <Image
              src={product.image || '/placeholder.png'}
              alt={product.name}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-110"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>

          {/* Badges overlay */}
          <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
            <div className="flex flex-col gap-1">
              {isNew() && (
                <Badge className="bg-blue-600 hover:bg-blue-700">
                  ✨ Nuevo
                </Badge>
              )}
              {product.discount_percentage && product.discount_percentage > 0 && (
                <Badge className="bg-purple-600 hover:bg-purple-700">
                  -{product.discount_percentage}% OFF
                </Badge>
              )}
            </div>
            
            {onToggleFavorite && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 bg-white/90 hover:bg-white dark:bg-gray-800/90 dark:hover:bg-gray-800"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(product.id);
                }}
              >
                <Star
                  className={cn(
                    "h-4 w-4",
                    product.isFavorite ? "fill-yellow-400 text-yellow-400" : "text-gray-400"
                  )}
                />
              </Button>
            )}
          </div>

          {/* Quick view on hover */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setShowQuickView(true);
              }}
              className="transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300"
            >
              <Eye className="h-4 w-4 mr-2" />
              Vista Rápida
            </Button>
          </div>
        </div>

        {/* Product info */}
        <div className="space-y-2">
          {/* Category */}
          {product.category && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Package className="h-3 w-3" />
              <span>{product.category.name}</span>
            </div>
          )}

          {/* Name */}
          <h3 className="font-semibold text-lg line-clamp-2 min-h-[3.5rem]" title={product.name}>
            {product.name}
          </h3>

          {/* SKU */}
          <p className="text-sm text-muted-foreground font-mono">
            SKU: {product.code}
          </p>

          {/* Supplier */}
          {product.supplier && (
            <p className="text-xs text-muted-foreground">
              Proveedor: {product.supplier.name}
            </p>
          )}

          {/* Stock badge */}
          <div className="flex items-center justify-between">
            {getStockBadge()}
            {product.stock > 0 && product.stock <= product.minStock && (
              <span className="text-xs text-muted-foreground">
                Min: {product.minStock}
              </span>
            )}
          </div>

          {/* Price */}
          <div className="pt-2 border-t">
            {product.discount_percentage && product.discount_percentage > 0 ? (
              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-green-600">
                    Gs {getDiscountedPrice().toLocaleString()}
                  </span>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm line-through text-muted-foreground">
                    Gs {product.price.toLocaleString()}
                  </span>
                  <span className="text-xs text-green-600 font-semibold">
                    Ahorro: Gs {(product.price - getDiscountedPrice()).toLocaleString()}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-2xl font-bold">
                Gs {product.price.toLocaleString()}
              </div>
            )}
            
            {/* Cost price (for reference) */}
            {product.costPrice > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Costo: Gs {product.costPrice.toLocaleString()}
                {product.price > product.costPrice && (
                  <span className="text-green-600 ml-2">
                    +{Math.round(((product.price - product.costPrice) / product.costPrice) * 100)}%
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Actions */}
          {showActions && (
            <div className="flex gap-2 pt-3">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => onView?.(product)}
              >
                <Eye className="h-4 w-4 mr-1" />
                Ver
              </Button>
              
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => onEdit?.(product)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Editar
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="px-2">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onView?.(product)}>
                    <Eye className="h-4 w-4 mr-2" />
                    Ver detalles
                  </DropdownMenuItem>
                  
                  {canEdit && (
                    <>
                      <DropdownMenuItem onClick={() => onEdit?.(product)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      
                      {onDuplicate && (
                        <DropdownMenuItem onClick={() => onDuplicate(product)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicar
                        </DropdownMenuItem>
                      )}
                    </>
                  )}
                  
                  {canDelete && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onDelete?.(product.id)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </CardContent>

      {/* Quick View Modal */}
      <ProductQuickViewModal
        product={product}
        open={showQuickView}
        onOpenChange={setShowQuickView}
        onEdit={onEdit}
        onViewFull={onView}
        onToggleFavorite={onToggleFavorite}
      />
    </Card>
  );
}
