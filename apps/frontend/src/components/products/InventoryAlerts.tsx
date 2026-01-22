'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Package,
  Calendar,
  TrendingDown,
  Bell,
  X,
  Eye,
  EyeOff,
  Settings,
  RefreshCw,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from '@/lib/toast';
import { formatCurrency } from '@/lib/utils';
import type { Product } from '@/types';

// Helper function to get alert icons
const getAlertIcon = (type: 'low_stock' | 'out_of_stock' | 'expiring_soon' | 'expired') => {
  switch (type) {
    case 'out_of_stock':
      return <Package className="h-4 w-4" />;
    case 'low_stock':
      return <TrendingDown className="h-4 w-4" />;
    case 'expired':
      return <AlertCircle className="h-4 w-4" />;
    case 'expiring_soon':
      return <Clock className="h-4 w-4" />;
    default:
      return <AlertTriangle className="h-4 w-4" />;
  }
};

interface InventoryAlert {
  id: string;
  type: 'low_stock' | 'out_of_stock' | 'expiring_soon' | 'expired';
  product: Product;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;
  acknowledged: boolean;
}

interface AlertSettings {
  lowStockEnabled: boolean;
  lowStockThreshold: number;
  expirationEnabled: boolean;
  expirationDays: number;
  outOfStockEnabled: boolean;
  emailNotifications: boolean;
  soundNotifications: boolean;
}

interface InventoryAlertsProps {
  products: Product[];
  onProductUpdate?: (productId: string) => void;
  className?: string;
}

export default function InventoryAlerts({
  products,
  onProductUpdate,
  className = ''
}: InventoryAlertsProps) {
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [settings, setSettings] = useState<AlertSettings>({
    lowStockEnabled: true,
    lowStockThreshold: 10,
    expirationEnabled: true,
    expirationDays: 30,
    outOfStockEnabled: true,
    emailNotifications: false,
    soundNotifications: true,
  });
  const [showSettings, setShowSettings] = useState(false);
  const [hiddenAlerts, setHiddenAlerts] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  // Generar alertas basadas en los productos
  const generateAlerts = React.useCallback(() => {
    const newAlerts: InventoryAlert[] = [];
    const now = new Date();

    products.forEach((product) => {
      // Alerta de stock bajo
      if (settings.lowStockEnabled && product.stock_quantity <= (product.min_stock || settings.lowStockThreshold)) {
        if (product.stock_quantity === 0) {
          // Sin stock
          if (settings.outOfStockEnabled) {
            newAlerts.push({
              id: `out_of_stock_${product.id}`,
              type: 'out_of_stock',
              product,
              message: `${product.name} está agotado`,
              severity: 'critical',
              createdAt: now,
              acknowledged: false,
            });
          }
        } else {
          // Stock bajo
          newAlerts.push({
            id: `low_stock_${product.id}`,
            type: 'low_stock',
            product,
            message: `${product.name} tiene stock bajo (${product.stock_quantity} unidades)`,
            severity: product.stock_quantity <= 5 ? 'high' : 'medium',
            createdAt: now,
            acknowledged: false,
          });
        }
      }

      // Alertas de vencimiento (si el producto tiene fecha de vencimiento)
      // Note: Product type doesn't have expiration_date, this feature would need to be added to the schema
      // if (settings.expirationEnabled && product.expiration_date) {
      //   const expirationDate = new Date(product.expiration_date);
      //   const daysUntilExpiration = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      //   if (daysUntilExpiration < 0) {
      //     // Producto vencido
      //     newAlerts.push({
      //       id: `expired_${product.id}`,
      //       type: 'expired',
      //       product,
      //       message: `${product.name} venció hace ${Math.abs(daysUntilExpiration)} días`,
      //       severity: 'critical',
      //       createdAt: now,
      //       acknowledged: false,
      //     });
      //   } else if (daysUntilExpiration <= settings.expirationDays) {
      //     // Producto próximo a vencer
      //     newAlerts.push({
      //       id: `expiring_soon_${product.id}`,
      //       type: 'expiring_soon',
      //       product,
      //       message: `${product.name} vence en ${daysUntilExpiration} días`,
      //       severity: daysUntilExpiration <= 7 ? 'high' : 'medium',
      //       createdAt: now,
      //       acknowledged: false,
      //     });
      //   }
      // }
    });

    setAlerts(newAlerts);
  }, [products, settings]);

  useEffect(() => {
    generateAlerts();
  }, [products, settings, generateAlerts]);

  const getSeverityColor = (severity: InventoryAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 border-red-200 text-red-800';
      case 'high':
        return 'bg-orange-100 border-orange-200 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 border-yellow-200 text-yellow-800';
      case 'low':
        return 'bg-blue-100 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-100 border-gray-200 text-gray-800';
    }
  };

  const acknowledgeAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    ));
  };

  const hideAlert = (alertId: string) => {
    setHiddenAlerts(prev => new Set([...prev, alertId]));
  };

  const refreshAlerts = () => {
    setIsLoading(true);
    setTimeout(() => {
      generateAlerts();
      setIsLoading(false);
      toast.success('Alertas actualizadas');
    }, 1000);
  };

  const updateSettings = (newSettings: Partial<AlertSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
    toast.success('Configuración de alertas actualizada');
  };

  const visibleAlerts = alerts.filter(alert => !hiddenAlerts.has(alert.id));
  const criticalAlerts = visibleAlerts.filter(alert => alert.severity === 'critical');
  const highAlerts = visibleAlerts.filter(alert => alert.severity === 'high');
  const mediumAlerts = visibleAlerts.filter(alert => alert.severity === 'medium');
  const lowAlerts = visibleAlerts.filter(alert => alert.severity === 'low');

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <CardTitle>Alertas de Inventario</CardTitle>
              {visibleAlerts.length > 0 && (
                <Badge variant="destructive">
                  {visibleAlerts.length}
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshAlerts}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Dialog open={showSettings} onOpenChange={setShowSettings}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Configuración de Alertas</DialogTitle>
                    <DialogDescription>
                      Personaliza las alertas de inventario según tus necesidades.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-6">
                    {/* Stock Bajo */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="low-stock">Alertas de Stock Bajo</Label>
                        <Switch
                          id="low-stock"
                          checked={settings.lowStockEnabled}
                          onCheckedChange={(checked) => updateSettings({ lowStockEnabled: checked })}
                        />
                      </div>
                      {settings.lowStockEnabled && (
                        <div>
                          <Label htmlFor="threshold">Umbral de Stock Bajo</Label>
                          <Input
                            id="threshold"
                            type="number"
                            min="1"
                            value={settings.lowStockThreshold}
                            onChange={(e) => updateSettings({ lowStockThreshold: parseInt(e.target.value) || 10 })}
                          />
                        </div>
                      )}
                    </div>

                    {/* Sin Stock */}
                    <div className="flex items-center justify-between">
                      <Label htmlFor="out-of-stock">Alertas de Sin Stock</Label>
                      <Switch
                        id="out-of-stock"
                        checked={settings.outOfStockEnabled}
                        onCheckedChange={(checked) => updateSettings({ outOfStockEnabled: checked })}
                      />
                    </div>

                    {/* Vencimiento */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="expiration">Alertas de Vencimiento</Label>
                        <Switch
                          id="expiration"
                          checked={settings.expirationEnabled}
                          onCheckedChange={(checked) => updateSettings({ expirationEnabled: checked })}
                        />
                      </div>
                      {settings.expirationEnabled && (
                        <div>
                          <Label htmlFor="expiration-days">Días de Anticipación</Label>
                          <Input
                            id="expiration-days"
                            type="number"
                            min="1"
                            value={settings.expirationDays}
                            onChange={(e) => updateSettings({ expirationDays: parseInt(e.target.value) || 30 })}
                          />
                        </div>
                      )}
                    </div>

                    {/* Notificaciones */}
                    <div className="space-y-3">
                      <h4 className="font-medium">Notificaciones</h4>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="email-notifications">Email</Label>
                        <Switch
                          id="email-notifications"
                          checked={settings.emailNotifications}
                          onCheckedChange={(checked) => updateSettings({ emailNotifications: checked })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="sound-notifications">Sonido</Label>
                        <Switch
                          id="sound-notifications"
                          checked={settings.soundNotifications}
                          onCheckedChange={(checked) => updateSettings({ soundNotifications: checked })}
                        />
                      </div>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button onClick={() => setShowSettings(false)}>
                      Cerrar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {visibleAlerts.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                ¡Todo en orden!
              </h3>
              <p className="text-gray-500">
                No hay alertas de inventario en este momento.
              </p>
            </div>
          ) : (
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all">
                  Todas ({visibleAlerts.length})
                </TabsTrigger>
                <TabsTrigger value="critical" className="text-red-600">
                  Críticas ({criticalAlerts.length})
                </TabsTrigger>
                <TabsTrigger value="high" className="text-orange-600">
                  Altas ({highAlerts.length})
                </TabsTrigger>
                <TabsTrigger value="medium" className="text-yellow-600">
                  Medias ({mediumAlerts.length})
                </TabsTrigger>
                <TabsTrigger value="low" className="text-blue-600">
                  Bajas ({lowAlerts.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-3 mt-4">
                {visibleAlerts.map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    onAcknowledge={acknowledgeAlert}
                    onHide={hideAlert}
                    onProductUpdate={onProductUpdate}
                  />
                ))}
              </TabsContent>

              <TabsContent value="critical" className="space-y-3 mt-4">
                {criticalAlerts.map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    onAcknowledge={acknowledgeAlert}
                    onHide={hideAlert}
                    onProductUpdate={onProductUpdate}
                  />
                ))}
              </TabsContent>

              <TabsContent value="high" className="space-y-3 mt-4">
                {highAlerts.map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    onAcknowledge={acknowledgeAlert}
                    onHide={hideAlert}
                    onProductUpdate={onProductUpdate}
                  />
                ))}
              </TabsContent>

              <TabsContent value="medium" className="space-y-3 mt-4">
                {mediumAlerts.map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    onAcknowledge={acknowledgeAlert}
                    onHide={hideAlert}
                    onProductUpdate={onProductUpdate}
                  />
                ))}
              </TabsContent>

              <TabsContent value="low" className="space-y-3 mt-4">
                {lowAlerts.map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    onAcknowledge={acknowledgeAlert}
                    onHide={hideAlert}
                    onProductUpdate={onProductUpdate}
                  />
                ))}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface AlertCardProps {
  alert: InventoryAlert;
  onAcknowledge: (alertId: string) => void;
  onHide: (alertId: string) => void;
  onProductUpdate?: (productId: string) => void;
}

function AlertCard({ alert, onAcknowledge, onHide, onProductUpdate }: AlertCardProps) {
  return (
    <Alert className={`${alert.acknowledged ? 'opacity-60' : ''} ${
      alert.severity === 'critical' ? 'border-red-200 bg-red-50' :
      alert.severity === 'high' ? 'border-orange-200 bg-orange-50' :
      alert.severity === 'medium' ? 'border-yellow-200 bg-yellow-50' :
      'border-blue-200 bg-blue-50'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className={`p-2 rounded-full ${
            alert.severity === 'critical' ? 'bg-red-100 text-red-600' :
            alert.severity === 'high' ? 'bg-orange-100 text-orange-600' :
            alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-600' :
            'bg-blue-100 text-blue-600'
          }`}>
            {getAlertIcon(alert.type)}
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h4 className="font-medium">{alert.product.name}</h4>
              <Badge variant="outline" className="text-xs">
                {alert.product.sku}
              </Badge>
              <Badge 
                variant="secondary" 
                className={`text-xs ${
                  alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                  alert.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                  alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}
              >
                {alert.severity === 'critical' ? 'Crítico' :
                 alert.severity === 'high' ? 'Alto' :
                 alert.severity === 'medium' ? 'Medio' : 'Bajo'}
              </Badge>
            </div>
            <AlertDescription className="text-sm">
              {alert.message}
            </AlertDescription>
            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
              <span>Stock actual: {alert.product.stock_quantity}</span>
              <span>Precio: {formatCurrency(alert.product.sale_price)}</span>
              {/* {alert.product.expiration_date && (
                <span>Vence: {new Date(alert.product.expiration_date).toLocaleDateString()}</span>
              )} */}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          {!alert.acknowledged && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAcknowledge(alert.id)}
              className="h-8 w-8 p-0"
            >
              <CheckCircle className="h-4 w-4" />
            </Button>
          )}
          {onProductUpdate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onProductUpdate(alert.product.id)}
              className="h-8 w-8 p-0"
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onHide(alert.id)}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Alert>
  );
}