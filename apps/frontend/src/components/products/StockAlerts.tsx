'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { 
  AlertTriangle, 
  Package, 
  Bell, 
  X, 
  RefreshCw,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Settings
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/lib/toast';

interface Product {
  id: string;
  name: string;
  code: string;
  stock: number;
  minStock: number;
  price: number;
  category?: {
    name: string;
  };
  image?: string;
}

interface StockAlert {
  id: string;
  productId: string;
  type: 'low_stock' | 'out_of_stock' | 'critical_stock';
  message: string;
  createdAt: Date;
  isRead: boolean;
  priority: 'high' | 'medium' | 'low';
}

interface AlertSettings {
  enableNotifications: boolean;
  criticalStockThreshold: number;
  lowStockMultiplier: number;
  autoRefreshInterval: number;
}

interface StockAlertsProps {
  products: Product[];
  onUpdateStock?: (productId: string, newStock: number) => Promise<void>;
  onUpdateMinStock?: (productId: string, newMinStock: number) => Promise<void>;
}

export default function StockAlerts({ 
  products, 
  onUpdateStock, 
  onUpdateMinStock 
}: StockAlertsProps) {
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [settings, setSettings] = useState<AlertSettings>({
    enableNotifications: true,
    criticalStockThreshold: 5,
    lowStockMultiplier: 1.5,
    autoRefreshInterval: 30000 // 30 segundos
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Generar alertas basadas en los productos
  useEffect(() => {
    const generateAlerts = () => {
      const newAlerts: StockAlert[] = [];

      products.forEach(product => {
        const alertId = `${product.id}-${Date.now()}`;
        
        if (product.stock === 0) {
          newAlerts.push({
            id: alertId,
            productId: product.id,
            type: 'out_of_stock',
            message: `${product.name} está sin stock`,
            createdAt: new Date(),
            isRead: false,
            priority: 'high'
          });
        } else if (product.stock <= settings.criticalStockThreshold) {
          newAlerts.push({
            id: alertId,
            productId: product.id,
            type: 'critical_stock',
            message: `${product.name} tiene stock crítico (${product.stock} unidades)`,
            createdAt: new Date(),
            isRead: false,
            priority: 'high'
          });
        } else if (product.stock <= product.minStock * settings.lowStockMultiplier) {
          newAlerts.push({
            id: alertId,
            productId: product.id,
            type: 'low_stock',
            message: `${product.name} tiene stock bajo (${product.stock} unidades)`,
            createdAt: new Date(),
            isRead: false,
            priority: 'medium'
          });
        }
      });

      setAlerts(newAlerts);
      setLastUpdate(new Date());

      // Mostrar notificaciones toast para alertas críticas
      if (settings.enableNotifications) {
        const criticalAlerts = newAlerts.filter(alert => 
          alert.priority === 'high' && !alert.isRead
        );
        
        criticalAlerts.forEach(alert => {
          if (alert.type === 'out_of_stock') {
            toast.error(alert.message, {
              action: {
                label: 'Ver',
                onClick: () => scrollToProduct(alert.productId)
              }
            } as any);
          } else if (alert.type === 'critical_stock') {
            toast.warning(alert.message, {
              action: {
                label: 'Ver',
                onClick: () => scrollToProduct(alert.productId)
              }
            } as any);
          }
        });
      }
    };

    generateAlerts();
  }, [products, settings]);

  // Auto-refresh
  useEffect(() => {
    if (settings.autoRefreshInterval > 0) {
      const interval = setInterval(() => {
        setLastUpdate(new Date());
      }, settings.autoRefreshInterval);

      return () => clearInterval(interval);
    }
  }, [settings.autoRefreshInterval]);

  const scrollToProduct = (productId: string) => {
    const element = document.getElementById(`product-${productId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const markAsRead = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, isRead: true } : alert
    ));
  };

  const markAllAsRead = () => {
    setAlerts(prev => prev.map(alert => ({ ...alert, isRead: true })));
  };

  const getAlertIcon = (type: StockAlert['type']) => {
    switch (type) {
      case 'out_of_stock':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'critical_stock':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'low_stock':
        return <TrendingDown className="h-4 w-4 text-yellow-500" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getAlertVariant = (type: StockAlert['type']) => {
    switch (type) {
      case 'out_of_stock':
        return 'destructive' as const;
      case 'critical_stock':
        return 'destructive' as const;
      case 'low_stock':
        return 'default' as const;
      default:
        return 'default' as const;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const unreadAlerts = alerts.filter(alert => !alert.isRead);
  const criticalAlerts = alerts.filter(alert => alert.priority === 'high');
  const outOfStockProducts = products.filter(p => p.stock === 0);
  const lowStockProducts = products.filter(p => p.stock > 0 && p.stock <= p.minStock);

  return (
    <div className="space-y-6">
      {/* Resumen de alertas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold text-red-600">{outOfStockProducts.length}</p>
                <p className="text-sm text-gray-600">Sin Stock</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold text-orange-600">{lowStockProducts.length}</p>
                <p className="text-sm text-gray-600">Stock Bajo</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Bell className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold text-blue-600">{unreadAlerts.length}</p>
                <p className="text-sm text-gray-600">Alertas Nuevas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {products.filter(p => p.stock > p.minStock).length}
                </p>
                <p className="text-sm text-gray-600">Stock Normal</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Panel de alertas */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <span>Alertas de Stock</span>
              {unreadAlerts.length > 0 && (
                <Badge variant="destructive">{unreadAlerts.length}</Badge>
              )}
            </CardTitle>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLastUpdate(new Date())}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualizar
              </Button>
              {unreadAlerts.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={markAllAsRead}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Marcar como leídas
                </Button>
              )}
              <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Configurar
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Configuración de Alertas</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="notifications">Notificaciones automáticas</Label>
                      <Switch
                        id="notifications"
                        checked={settings.enableNotifications}
                        onCheckedChange={(checked) =>
                          setSettings(prev => ({ ...prev, enableNotifications: checked }))
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="critical-threshold">Umbral de stock crítico</Label>
                      <Input
                        id="critical-threshold"
                        type="number"
                        value={settings.criticalStockThreshold}
                        onChange={(e) =>
                          setSettings(prev => ({ 
                            ...prev, 
                            criticalStockThreshold: parseInt(e.target.value) || 0 
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="low-stock-multiplier">Multiplicador de stock bajo</Label>
                      <Input
                        id="low-stock-multiplier"
                        type="number"
                        step="0.1"
                        value={settings.lowStockMultiplier}
                        onChange={(e) =>
                          setSettings(prev => ({ 
                            ...prev, 
                            lowStockMultiplier: parseFloat(e.target.value) || 1 
                          }))
                        }
                      />
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          <p className="text-sm text-gray-500">
            Última actualización: {lastUpdate.toLocaleTimeString()}
          </p>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-green-600 mb-2">
                ¡Todo en orden!
              </h3>
              <p className="text-gray-500">
                No hay alertas de stock en este momento.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => {
                const product = products.find(p => p.id === alert.productId);
                if (!product) return null;

                return (
                  <Alert 
                    key={alert.id} 
                    variant={getAlertVariant(alert.type)}
                    className={`${alert.isRead ? 'opacity-60' : ''} transition-opacity`}
                  >
                    <div className="flex items-start justify-between w-full">
                      <div className="flex items-start space-x-3">
                        {getAlertIcon(alert.type)}
                        <div className="flex-1">
                          <AlertDescription className="font-medium">
                            {alert.message}
                          </AlertDescription>
                          <div className="mt-2 text-sm space-y-1">
                            <p><strong>Código:</strong> {product.code}</p>
                            <p><strong>Stock actual:</strong> {product.stock} unidades</p>
                            <p><strong>Stock mínimo:</strong> {product.minStock} unidades</p>
                            <p><strong>Precio:</strong> {formatCurrency(product.price)}</p>
                            {product.category && (
                              <p><strong>Categoría:</strong> {product.category.name}</p>
                            )}
                          </div>
                          <div className="mt-3 flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => scrollToProduct(product.id)}
                            >
                              Ver Producto
                            </Button>
                            {onUpdateStock && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  const newStock = prompt(
                                    `Ingrese el nuevo stock para ${product.name}:`,
                                    product.stock.toString()
                                  );
                                  if (newStock && !isNaN(parseInt(newStock))) {
                                    onUpdateStock(product.id, parseInt(newStock));
                                  }
                                }}
                              >
                                Actualizar Stock
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsRead(alert.id)}
                        className="ml-2"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </Alert>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Productos críticos - Vista rápida */}
      {criticalAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <span>Productos que Requieren Atención Inmediata</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {products
                .filter(product => 
                  product.stock === 0 || product.stock <= settings.criticalStockThreshold
                )
                .map((product) => (
                  <Card key={product.id} className="border-red-200 bg-red-50">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-red-800">{product.name}</h4>
                          <p className="text-sm text-red-600">{product.code}</p>
                          <div className="mt-2">
                            <Badge variant={product.stock === 0 ? 'destructive' : 'secondary'}>
                              {product.stock === 0 ? 'Sin Stock' : `${product.stock} unidades`}
                            </Badge>
                          </div>
                        </div>
                        {product.image && (
                          <div className="relative w-12 h-12 rounded overflow-hidden ml-3">
                            <Image
                              src={product.image}
                              alt={product.name}
                              fill
                              sizes="48px"
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
