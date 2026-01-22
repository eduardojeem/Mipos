'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Package,
  DollarSign,
  TrendingUp,
  Calendar,
  Tag,
  Truck,
  Edit,
  ExternalLink,
  Star,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

interface ProductQuickViewModalProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (product: Product) => void;
  onViewFull?: (product: Product) => void;
  onToggleFavorite?: (productId: string) => void;
}

export function ProductQuickViewModal({
  product,
  open,
  onOpenChange,
  onEdit,
  onViewFull,
  onToggleFavorite
}: ProductQuickViewModalProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  if (!product) return null;

  const images = product.images && product.images.length > 0 
    ? product.images 
    : product.image 
    ? [product.image] 
    : ['/placeholder.png'];

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
          Stock crítico
        </Badge>
      );
    }
    
    if (product.stock <= product.minStock) {
      return (
        <Badge className="gap-1 bg-yellow-500 hover:bg-yellow-600 text-white">
          <AlertTriangle className="h-3 w-3" />
          Stock bajo
        </Badge>
      );
    }
    
    return (
      <Badge className="gap-1 bg-green-500 hover:bg-green-600 text-white">
        <CheckCircle className="h-3 w-3" />
        Stock normal
      </Badge>
    );
  };

  const getDiscountedPrice = () => {
    if (!product.discount_percentage || product.discount_percentage === 0) {
      return product.price;
    }
    return Math.round(product.price * (1 - product.discount_percentage / 100));
  };

  const isNew = () => {
    const daysSinceCreation = Math.floor(
      (Date.now() - new Date(product.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysSinceCreation <= 7;
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold pr-8">
                {product.name}
              </DialogTitle>
              <DialogDescription className="mt-1">
                SKU: {product.code}
              </DialogDescription>
            </div>
            {onToggleFavorite && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggleFavorite(product.id)}
              >
                <Star
                  className={cn(
                    "h-5 w-5",
                    product.isFavorite ? "fill-yellow-400 text-yellow-400" : "text-gray-400"
                  )}
                />
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {/* Left column - Images */}
          <div className="space-y-4">
            <div className="relative aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
              <Image
                src={images[currentImageIndex]}
                alt={product.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              
              {/* Image navigation */}
              {images.length > 1 && (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute left-2 top-1/2 -translate-y-1/2"
                    onClick={prevImage}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={nextImage}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  
                  {/* Image indicators */}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                    {images.map((_, index) => (
                      <button
                        key={index}
                        className={cn(
                          "w-2 h-2 rounded-full transition-all",
                          index === currentImageIndex
                            ? "bg-white w-4"
                            : "bg-white/50"
                        )}
                        onClick={() => setCurrentImageIndex(index)}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* Badges */}
              <div className="absolute top-2 left-2 flex flex-col gap-1">
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
            </div>

            {/* Thumbnail gallery */}
            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {images.map((img, index) => (
                  <button
                    key={index}
                    className={cn(
                      "relative aspect-square rounded-lg overflow-hidden border-2 transition-all",
                      index === currentImageIndex
                        ? "border-primary"
                        : "border-transparent hover:border-gray-300"
                    )}
                    onClick={() => setCurrentImageIndex(index)}
                  >
                    <Image
                      src={img}
                      alt={`${product.name} - ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="100px"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right column - Details */}
          <div className="space-y-4">
            {/* Category and Stock */}
            <div className="flex items-center justify-between">
              {product.category && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Package className="h-4 w-4" />
                  <span>{product.category.name}</span>
                </div>
              )}
              {getStockBadge()}
            </div>

            {/* Price */}
            <div className="space-y-2">
              {product.discount_percentage && product.discount_percentage > 0 ? (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-green-600">
                      Gs {getDiscountedPrice().toLocaleString()}
                    </span>
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg line-through text-muted-foreground">
                      Gs {product.price.toLocaleString()}
                    </span>
                    <Badge className="bg-green-600">
                      Ahorro: Gs {(product.price - getDiscountedPrice()).toLocaleString()}
                    </Badge>
                  </div>
                </>
              ) : (
                <div className="text-3xl font-bold">
                  Gs {product.price.toLocaleString()}
                </div>
              )}
            </div>

            <Separator />

            {/* Tabs with details */}
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Detalles</TabsTrigger>
                <TabsTrigger value="inventory">Inventario</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4 mt-4">
                {/* Description */}
                {product.description && (
                  <div>
                    <h4 className="font-semibold mb-2">Descripción</h4>
                    <p className="text-sm text-muted-foreground">
                      {product.description}
                    </p>
                  </div>
                )}

                {/* Supplier */}
                {product.supplier && (
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      <span className="text-muted-foreground">Proveedor:</span>{' '}
                      <span className="font-medium">{product.supplier.name}</span>
                    </span>
                  </div>
                )}

                {/* Cost and margin */}
                {product.costPrice > 0 && (
                  <div className="space-y-2 p-3 bg-muted rounded-lg">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Precio de costo:</span>
                      <span className="font-medium">Gs {product.costPrice.toLocaleString()}</span>
                    </div>
                    {product.price > product.costPrice && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Margen de ganancia:</span>
                        <span className="font-medium text-green-600">
                          +{Math.round(((product.price - product.costPrice) / product.costPrice) * 100)}%
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Dates */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Creado: {new Date(product.createdAt).toLocaleDateString('es-PY')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Actualizado: {new Date(product.updatedAt).toLocaleDateString('es-PY')}
                    </span>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="inventory" className="space-y-4 mt-4">
                {/* Stock info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Stock actual</div>
                    <div className="text-2xl font-bold">{product.stock}</div>
                    <div className="text-xs text-muted-foreground">unidades</div>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Stock mínimo</div>
                    <div className="text-2xl font-bold">{product.minStock}</div>
                    <div className="text-xs text-muted-foreground">unidades</div>
                  </div>
                </div>

                {/* Stock status */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Estado:</span>
                    {getStockBadge()}
                  </div>
                  
                  {product.stock > 0 && product.stock <= product.minStock && (
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-yellow-900 dark:text-yellow-100">
                            Stock bajo
                          </p>
                          <p className="text-yellow-700 dark:text-yellow-300">
                            Se recomienda reabastecer pronto. Faltan{' '}
                            {product.minStock - product.stock} unidades para alcanzar el mínimo.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {product.stock === 0 && (
                    <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-red-900 dark:text-red-100">
                            Sin stock
                          </p>
                          <p className="text-red-700 dark:text-red-300">
                            Este producto no está disponible. Se requiere reabastecimiento urgente.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Inventory value */}
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Valor en inventario</div>
                  <div className="text-xl font-bold">
                    Gs {(product.stock * product.costPrice).toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Basado en precio de costo
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              {onEdit && (
                <Button
                  className="flex-1"
                  onClick={() => {
                    onEdit(product);
                    onOpenChange(false);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar Producto
                </Button>
              )}
              {onViewFull && (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    onViewFull(product);
                    onOpenChange(false);
                  }}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ver Completo
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
