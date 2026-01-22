import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Package, RefreshCw, X } from 'lucide-react';

interface LowStockProduct {
  id: string;
  name: string;
  sku?: string;
  currentStock: number;
  minimumStock: number;
  category?: string;
}

interface LowStockAlertProps {
  products: LowStockProduct[];
  onDismiss?: () => void;
  onRefresh?: () => void;
  onViewInventory?: () => void;
  showDismiss?: boolean;
  variant?: 'banner' | 'card' | 'compact';
}

export const LowStockAlert: React.FC<LowStockAlertProps> = ({
  products,
  onDismiss,
  onRefresh,
  onViewInventory,
  showDismiss = true,
  variant = 'banner'
}) => {
  if (products.length === 0) return null;

  const getStockLevel = (current: number, minimum: number) => {
    const percentage = (current / minimum) * 100;
    if (current === 0) return 'critical';
    if (percentage <= 50) return 'low';
    return 'warning';
  };

  const getStockColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'low': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (variant === 'compact') {
    return (
      <Alert className="border-orange-200 bg-orange-50">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertTitle className="text-orange-800">
          Stock Bajo ({products.length} productos)
        </AlertTitle>
        <AlertDescription className="text-orange-700">
          <div className="flex items-center gap-2 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onViewInventory}
              className="text-orange-700 border-orange-300 hover:bg-orange-100"
            >
              <Package className="h-3 w-3 mr-1" />
              Ver Inventario
            </Button>
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                className="text-orange-700 border-orange-300 hover:bg-orange-100"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Actualizar
              </Button>
            )}
            {showDismiss && onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="text-orange-700 hover:bg-orange-100 ml-auto"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  if (variant === 'card') {
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-orange-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Alerta de Stock Bajo
            </CardTitle>
            {showDismiss && onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="text-orange-700 hover:bg-orange-100"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-orange-700 text-sm">
              {products.length} productos necesitan reposición
            </p>
            
            <div className="max-h-40 overflow-y-auto space-y-2">
              {products.slice(0, 5).map((product) => {
                const level = getStockLevel(product.currentStock, product.minimumStock);
                return (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-2 bg-white rounded border"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {product.name}
                      </p>
                      {product.sku && (
                        <p className="text-xs text-gray-500">SKU: {product.sku}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStockColor(level)}>
                        {product.currentStock}/{product.minimumStock}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {products.length > 5 && (
              <p className="text-xs text-orange-600">
                Y {products.length - 5} productos más...
              </p>
            )}
            
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onViewInventory}
                className="text-orange-700 border-orange-300 hover:bg-orange-100"
              >
                <Package className="h-3 w-3 mr-1" />
                Ver Inventario
              </Button>
              {onRefresh && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRefresh}
                  className="text-orange-700 border-orange-300 hover:bg-orange-100"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Actualizar
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Banner variant (default)
  return (
    <Alert className="border-orange-200 bg-orange-50">
      <AlertTriangle className="h-4 w-4 text-orange-600" />
      <AlertTitle className="text-orange-800">
        Alerta de Stock Bajo
      </AlertTitle>
      <AlertDescription className="text-orange-700">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="mb-2">
              {products.length} productos necesitan reposición urgente
            </p>
            
            <div className="flex flex-wrap gap-1 mb-3">
              {products.slice(0, 3).map((product) => {
                const level = getStockLevel(product.currentStock, product.minimumStock);
                return (
                  <Badge
                    key={product.id}
                    className={getStockColor(level)}
                  >
                    {product.name}: {product.currentStock}
                  </Badge>
                );
              })}
              {products.length > 3 && (
                <Badge variant="outline" className="text-orange-700 border-orange-300">
                  +{products.length - 3} más
                </Badge>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onViewInventory}
                className="text-orange-700 border-orange-300 hover:bg-orange-100"
              >
                <Package className="h-3 w-3 mr-1" />
                Ver Inventario
              </Button>
              {onRefresh && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRefresh}
                  className="text-orange-700 border-orange-300 hover:bg-orange-100"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Actualizar Stock
                </Button>
              )}
            </div>
          </div>
          
          {showDismiss && onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="text-orange-700 hover:bg-orange-100 ml-4"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default LowStockAlert;