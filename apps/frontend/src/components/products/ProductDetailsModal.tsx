'use client';

import React, { memo } from 'react';
import Image from 'next/image';
import { 
  Package, 
  Tag, 
  DollarSign, 
  Calendar, 
  User, 
  BarChart3,
  AlertTriangle,
  CheckCircle,
  X
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { Product } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ProductDetailsModalProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (product: Product) => void;
  onDelete?: (id: string) => void;
}

const InfoItem = memo(function InfoItem({
  icon: Icon,
  label,
  value,
  className = ''
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number | React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center space-x-3', className)}>
      <div className="flex-shrink-0">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground">{value}</p>
      </div>
    </div>
  );
});

export const ProductDetailsModal = memo(function ProductDetailsModal({
  product,
  open,
  onOpenChange,
  onEdit,
  onDelete
}: ProductDetailsModalProps) {
  if (!product) return null;

  const stock = product.stock_quantity || 0;
  const minStock = product.min_stock || 5;
  const isLowStock = stock > 0 && stock <= minStock;
  const isOutOfStock = stock === 0;

  const getStockStatus = () => {
    if (isOutOfStock) {
      return {
        label: 'Sin stock',
        variant: 'destructive' as const,
        icon: AlertTriangle,
        color: 'text-destructive'
      };
    }
    if (isLowStock) {
      return {
        label: 'Stock bajo',
        variant: 'secondary' as const,
        icon: AlertTriangle,
        color: 'text-orange-600'
      };
    }
    return {
      label: 'Stock normal',
      variant: 'default' as const,
      icon: CheckCircle,
      color: 'text-green-600'
    };
  };

  const stockStatus = getStockStatus();
  const StockIcon = stockStatus.icon;

  const formatPrice = (price: number) => 
    `Gs ${price.toLocaleString('es-PY')}`;

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: es });
    } catch {
      return 'Fecha inválida';
    }
  };

  const categoryName = typeof product.category === 'object' 
    ? product.category?.name 
    : 'Sin categoría';

  const supplierName = typeof product.supplier === 'object'
    ? product.supplier?.name
    : 'Sin proveedor';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Detalles del Producto</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Imagen del Producto */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-4">
                <div className="relative aspect-square bg-muted rounded-lg overflow-hidden mb-4">
                  {product.image_url ? (
                    <Image
                      src={product.image_url}
                      alt={product.name || 'Product'}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 400px"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Package className="h-16 w-16 text-muted-foreground/30" />
                    </div>
                  )}
                </div>

                {/* Estado y Badges */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant={stockStatus.variant} className="gap-1">
                      <StockIcon className="h-3 w-3" />
                      {stockStatus.label}
                    </Badge>
                    <Badge variant={product.is_active ? 'default' : 'secondary'}>
                      {product.is_active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-2xl font-bold">{stock}</p>
                    <p className="text-sm text-muted-foreground">
                      unidades en stock
                    </p>
                    {minStock > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Mínimo: {minStock}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Información Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Información Básica */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Información Básica
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold mb-2">
                    {product.name || 'Sin nombre'}
                  </h2>
                  {product.description && (
                    <p className="text-muted-foreground">
                      {product.description}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoItem
                    icon={Tag}
                    label="SKU"
                    value={product.sku || 'N/A'}
                  />
                  <InfoItem
                    icon={Package}
                    label="Categoría"
                    value={categoryName}
                  />
                  <InfoItem
                    icon={User}
                    label="Proveedor"
                    value={supplierName}
                  />
                  {product.barcode && (
                    <InfoItem
                      icon={BarChart3}
                      label="Código de Barras"
                      value={product.barcode}
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Información de Precios */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Precios e Inventario
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Precio de Venta
                      </p>
                      <div className="flex items-center gap-2">
                        {product.offer_price && product.offer_price > 0 ? (
                          <>
                            <p className="text-lg font-semibold text-muted-foreground line-through">
                              {formatPrice(product.sale_price || 0)}
                            </p>
                            <p className="text-2xl font-bold text-green-600">
                              {formatPrice(product.offer_price)}
                            </p>
                            <Badge variant="secondary" className="text-xs">
                              -{((product.sale_price - product.offer_price) / product.sale_price * 100).toFixed(0)}%
                            </Badge>
                          </>
                        ) : (
                          <p className="text-2xl font-bold text-primary">
                            {formatPrice(product.sale_price || 0)}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {product.cost_price && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Precio de Costo
                        </p>
                        <p className="text-lg font-semibold">
                          {formatPrice(product.cost_price)}
                        </p>
                      </div>
                    )}

                    {product.wholesale_price && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Precio Mayorista
                        </p>
                        <p className="text-lg font-semibold">
                          {formatPrice(product.wholesale_price)}
                        </p>
                        {product.min_wholesale_quantity && (
                          <p className="text-xs text-muted-foreground">
                            Mín. {product.min_wholesale_quantity} unidades
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <InfoItem
                      icon={Package}
                      label="Stock Actual"
                      value={
                        <span className={stockStatus.color}>
                          {stock} unidades
                        </span>
                      }
                    />
                    <InfoItem
                      icon={AlertTriangle}
                      label="Stock Mínimo"
                      value={`${minStock} unidades`}
                    />
                    {product.max_stock && (
                      <InfoItem
                        icon={BarChart3}
                        label="Stock Máximo"
                        value={`${product.max_stock} unidades`}
                      />
                    )}
                  </div>
                </div>

                {/* Margen de Ganancia */}
                {product.cost_price && product.sale_price && (
                  <>
                    <Separator className="my-4" />
                    <div className="bg-muted/30 p-4 rounded-lg">
                      <p className="text-sm font-medium text-muted-foreground mb-2">
                        Análisis de Rentabilidad
                      </p>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Margen:</span>
                          <span className="ml-2 font-semibold">
                            {formatPrice(product.sale_price - product.cost_price)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">% Ganancia:</span>
                          <span className="ml-2 font-semibold">
                            {((product.sale_price - product.cost_price) / product.cost_price * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Información de Fechas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Información de Fechas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoItem
                    icon={Calendar}
                    label="Fecha de Creación"
                    value={formatDate(product.created_at || '')}
                  />
                  <InfoItem
                    icon={Calendar}
                    label="Última Actualización"
                    value={formatDate(product.updated_at || '')}
                  />
                  {product.expiration_date && (
                    <InfoItem
                      icon={AlertTriangle}
                      label="Fecha de Vencimiento"
                      value={formatDate(product.expiration_date)}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-end space-x-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cerrar
          </Button>
          {onEdit && (
            <Button
              onClick={() => {
                onEdit(product);
                onOpenChange(false);
              }}
              className="gap-2"
            >
              <Tag className="h-4 w-4" />
              Editar Producto
            </Button>
          )}
          {onDelete && (
            <Button
              variant="destructive"
              onClick={() => {
                onDelete(product.id);
                onOpenChange(false);
              }}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Eliminar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
});