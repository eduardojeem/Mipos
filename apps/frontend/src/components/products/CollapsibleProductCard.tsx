'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  ChevronDown, 
  ChevronUp, 
  Package, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Edit,
  Trash2,
  Eye,
  BarChart3,
  Calendar,
  Tag,
  Warehouse,
  Lock
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

import type { Product as SupabaseProduct } from '@/types';

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  costPrice?: number;
  stock: number;
  minStock: number;
  maxStock?: number;
  sku: string;
  barcode?: string;
  category?: {
    id: string;
    name: string;
    color?: string;
  };
  supplier?: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  image_url?: string;
  tags?: string[];
  salesCount?: number;
  lastSaleDate?: string;
}

interface CollapsibleProductCardProps {
  product: Product;
  onEdit?: (product: Product) => void;
  onDelete?: (productId: string) => void;
  onView?: (product: Product) => void;
  showActions?: boolean;
  defaultExpanded?: boolean;
  compact?: boolean;
}

export function CollapsibleProductCard({
  product,
  onEdit,
  onDelete,
  onView,
  showActions = true,
  defaultExpanded = false,
  compact = false
}: CollapsibleProductCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const stockPercentage = product.maxStock 
    ? (product.stock / product.maxStock) * 100 
    : (product.stock / (product.minStock * 3)) * 100;

  const stockStatus = product.stock === 0 
    ? 'out' 
    : product.stock <= product.minStock 
    ? 'low' 
    : 'good';

  const profitMargin = product.costPrice 
    ? ((product.price - product.costPrice) / product.price) * 100 
    : 0;

  const getStockStatusColor = () => {
    switch (stockStatus) {
      case 'out': return 'destructive';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getStockStatusIcon = () => {
    switch (stockStatus) {
      case 'out': return <AlertTriangle className="h-4 w-4" />;
      case 'low': return <TrendingDown className="h-4 w-4" />;
      default: return <CheckCircle className="h-4 w-4" />;
    }
  };

  return (
    <Card className={`transition-all duration-300 hover:shadow-lg ${compact ? 'p-2' : ''}`}>
      <CardHeader 
        className={`cursor-pointer ${compact ? 'pb-2' : 'pb-4'}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Imagen del producto */}
            <div className={`${compact ? 'w-10 h-10' : 'w-12 h-12'} bg-muted rounded-lg flex items-center justify-center flex-shrink-0`}>
              {product.image_url ? (
                <img 
                  src={product.image_url} 
                  alt={product.name}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <Package className={`${compact ? 'h-5 w-5' : 'h-6 w-6'} text-muted-foreground`} />
              )}
            </div>

            {/* Información básica */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <CardTitle className={`${compact ? 'text-sm' : 'text-base'} truncate`}>
                  {product.name}
                </CardTitle>
                {product.category && (
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${compact ? 'px-1 py-0' : ''}`}
                    style={{ 
                      borderColor: product.category.color,
                      color: product.category.color 
                    }}
                  >
                    {product.category.name}
                  </Badge>
                )}
                {!product.supplier && (
                  <Badge variant="secondary" className={`gap-1 text-xs ${compact ? 'px-1 py-0' : ''}`}>
                    <Lock className="h-3 w-3" />
                    Proveedor restringido
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  {formatCurrency(product.price)}
                </span>
                <span className="flex items-center gap-1">
                  <Warehouse className="h-3 w-3" />
                  Stock: {product.stock}
                </span>
                <Badge variant={getStockStatusColor()} className="text-xs">
                  {getStockStatusIcon()}
                  {stockStatus === 'out' ? 'Sin stock' : 
                   stockStatus === 'low' ? 'Stock bajo' : 'Stock OK'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Controles */}
          <div className="flex items-center gap-2">
            {showActions && (
              <div className="flex gap-1">
                {onView && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onView(product);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(product);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(product.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
            
            <Button variant="ghost" size="sm">
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className={`${compact ? 'pt-0' : 'pt-0'} space-y-4`}>
          {/* Descripción */}
          {product.description && (
            <div>
              <p className="text-sm text-muted-foreground">
                {product.description}
              </p>
            </div>
          )}

          <Separator />

          {/* Métricas detalladas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Stock Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Stock</span>
                <span className="font-medium">{product.stock}/{product.maxStock || product.minStock * 3}</span>
              </div>
              <Progress 
                value={Math.min(stockPercentage, 100)} 
                className="h-2"
              />
              <div className="text-xs text-muted-foreground">
                Mínimo: {product.minStock}
              </div>
            </div>

            {/* Precio y Costo */}
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Precios</div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Venta:</span>
                  <span className="font-medium">{formatCurrency(product.price)}</span>
                </div>
                {product.costPrice && (
                  <div className="flex justify-between text-sm">
                    <span>Costo:</span>
                    <span className="text-muted-foreground">{formatCurrency(product.costPrice)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Margen de ganancia */}
            {product.costPrice && (
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Margen</div>
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-bold ${profitMargin > 30 ? 'text-green-600' : profitMargin > 15 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {profitMargin.toFixed(1)}%
                  </span>
                  {profitMargin > 30 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                </div>
              </div>
            )}

            {/* Ventas */}
            {product.salesCount !== undefined && (
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Ventas</div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">{product.salesCount}</span>
                </div>
                {product.lastSaleDate && (
                  <div className="text-xs text-muted-foreground">
                    Última: {new Date(product.lastSaleDate).toLocaleDateString()}
                  </div>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Información adicional */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">SKU:</span>
                <span className="text-muted-foreground">{product.sku}</span>
              </div>
              
              {product.barcode && (
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Código:</span>
                  <span className="text-muted-foreground">{product.barcode}</span>
                </div>
              )}

              {product.supplier && (
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Proveedor:</span>
                  <span className="text-muted-foreground">{product.supplier.name}</span>
                </div>
              )}
              {!product.supplier && (
                <Badge variant="secondary" className="gap-1">
                  <Lock className="h-3 w-3" />
                  Proveedor restringido
                </Badge>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Creado:</span>
                <span className="text-muted-foreground">
                  {new Date(product.createdAt).toLocaleDateString()}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Actualizado:</span>
                <span className="text-muted-foreground">
                  {new Date(product.updatedAt).toLocaleDateString()}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Estado:</span>
                <Badge variant={product.isActive ? 'default' : 'secondary'}>
                  {product.isActive ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Tags */}
          {product.tags && product.tags.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="text-sm font-medium">Etiquetas</div>
                <div className="flex flex-wrap gap-2">
                  {product.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}