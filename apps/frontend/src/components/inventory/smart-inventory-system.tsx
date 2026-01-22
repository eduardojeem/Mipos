'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertTriangle,
  Package,
  TrendingUp,
  TrendingDown,
  Bell,
  Settings,
  RefreshCw,
  Plus,
  Minus,
  Eye,
  EyeOff,
  Zap,
  Target,
  Clock,
  BarChart3,
  ShoppingCart,
  Truck,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  Calendar,
  Filter,
  Download,
  Upload,
  Search,
  Edit,
  Trash2,
  MoreHorizontal
} from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { toast } from '@/lib/toast';

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  reorderPoint: number;
  reorderQuantity: number;
  unitCost: number;
  sellingPrice: number;
  supplier: string;
  lastRestocked: Date;
  averageSales: number;
  daysInStock: number;
  turnoverRate: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'overstock';
  alertLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
  predictedStockout: Date | null;
  seasonalTrend: 'increasing' | 'decreasing' | 'stable';
  autoReorder: boolean;
}

interface InventoryAlert {
  id: string;
  productId: string;
  productName: string;
  type: 'low_stock' | 'out_of_stock' | 'overstock' | 'reorder_needed' | 'expiring_soon' | 'slow_moving';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  createdAt: Date;
  isRead: boolean;
  actionRequired: boolean;
  suggestedAction?: string;
}

interface SmartInventorySystemProps {
  products?: Product[];
  alerts?: InventoryAlert[];
  isLoading?: boolean;
  onUpdateProduct?: (productId: string, updates: Partial<Product>) => void;
  onReorderProduct?: (productId: string, quantity: number) => void;
  onDismissAlert?: (alertId: string) => void;
}

export function SmartInventorySystem({
  products = [],
  alerts = [],
  isLoading = false,
  onUpdateProduct,
  onReorderProduct,
  onDismissAlert
}: SmartInventorySystemProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [alertFilter, setAlertFilter] = useState('all');
  const [showSettings, setShowSettings] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds

  // Mock data para demostración
  const mockProducts: Product[] = [
    {
      id: '1',
      name: 'Laptop HP Pavilion 15',
      sku: 'HP-PAV-15-001',
      category: 'Electrónicos',
      currentStock: 5,
      minStock: 10,
      maxStock: 50,
      reorderPoint: 8,
      reorderQuantity: 20,
      unitCost: 450,
      sellingPrice: 699,
      supplier: 'HP Distribuidor',
      lastRestocked: new Date('2024-01-15'),
      averageSales: 3.2,
      daysInStock: 45,
      turnoverRate: 8.1,
      status: 'low_stock',
      alertLevel: 'high',
      predictedStockout: new Date('2024-02-10'),
      seasonalTrend: 'stable',
      autoReorder: true
    },
    {
      id: '2',
      name: 'Mouse Logitech MX Master 3',
      sku: 'LOG-MX3-001',
      category: 'Accesorios',
      currentStock: 0,
      minStock: 15,
      maxStock: 100,
      reorderPoint: 12,
      reorderQuantity: 50,
      unitCost: 35,
      sellingPrice: 89,
      supplier: 'Logitech SA',
      lastRestocked: new Date('2024-01-20'),
      averageSales: 5.8,
      daysInStock: 0,
      turnoverRate: 12.3,
      status: 'out_of_stock',
      alertLevel: 'critical',
      predictedStockout: new Date('2024-01-25'),
      seasonalTrend: 'increasing',
      autoReorder: true
    },
    {
      id: '3',
      name: 'Teclado Mecánico RGB',
      sku: 'KEY-RGB-001',
      category: 'Accesorios',
      currentStock: 85,
      minStock: 20,
      maxStock: 60,
      reorderPoint: 25,
      reorderQuantity: 30,
      unitCost: 45,
      sellingPrice: 129,
      supplier: 'Gaming Tech',
      lastRestocked: new Date('2024-01-10'),
      averageSales: 2.1,
      daysInStock: 120,
      turnoverRate: 3.0,
      status: 'overstock',
      alertLevel: 'medium',
      predictedStockout: null,
      seasonalTrend: 'decreasing',
      autoReorder: false
    },
    {
      id: '4',
      name: 'Monitor 24" Full HD',
      sku: 'MON-24-FHD-001',
      category: 'Electrónicos',
      currentStock: 25,
      minStock: 8,
      maxStock: 40,
      reorderPoint: 12,
      reorderQuantity: 15,
      unitCost: 180,
      sellingPrice: 299,
      supplier: 'Display Solutions',
      lastRestocked: new Date('2024-01-18'),
      averageSales: 1.8,
      daysInStock: 65,
      turnoverRate: 5.6,
      status: 'in_stock',
      alertLevel: 'none',
      predictedStockout: new Date('2024-03-15'),
      seasonalTrend: 'stable',
      autoReorder: true
    }
  ];

  const mockAlerts: InventoryAlert[] = [
    {
      id: '1',
      productId: '2',
      productName: 'Mouse Logitech MX Master 3',
      type: 'out_of_stock',
      severity: 'critical',
      message: 'Producto agotado. Se requiere reabastecimiento inmediato.',
      createdAt: new Date('2024-01-25T10:30:00'),
      isRead: false,
      actionRequired: true,
      suggestedAction: 'Realizar pedido de 50 unidades al proveedor Logitech SA'
    },
    {
      id: '2',
      productId: '1',
      productName: 'Laptop HP Pavilion 15',
      type: 'low_stock',
      severity: 'high',
      message: 'Stock bajo. Solo quedan 5 unidades disponibles.',
      createdAt: new Date('2024-01-25T09:15:00'),
      isRead: false,
      actionRequired: true,
      suggestedAction: 'Activar reorden automático o realizar pedido manual'
    },
    {
      id: '3',
      productId: '3',
      productName: 'Teclado Mecánico RGB',
      type: 'overstock',
      severity: 'medium',
      message: 'Exceso de inventario detectado. 85 unidades en stock.',
      createdAt: new Date('2024-01-24T16:45:00'),
      isRead: true,
      actionRequired: false,
      suggestedAction: 'Considerar promoción o descuento para reducir inventario'
    },
    {
      id: '4',
      productId: '1',
      productName: 'Laptop HP Pavilion 15',
      type: 'reorder_needed',
      severity: 'high',
      message: 'Se alcanzó el punto de reorden. Reabastecimiento recomendado.',
      createdAt: new Date('2024-01-24T14:20:00'),
      isRead: false,
      actionRequired: true,
      suggestedAction: 'Generar orden de compra automática por 20 unidades'
    }
  ];

  const inventoryData = products.length > 0 ? products : mockProducts;
  const alertsData = alerts.length > 0 ? alerts : mockAlerts;

  // Filtros y búsqueda
  const filteredProducts = useMemo(() => {
    return inventoryData.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           product.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [inventoryData, searchQuery, selectedCategory]);

  const filteredAlerts = useMemo(() => {
    return alertsData.filter(alert => {
      if (alertFilter === 'all') return true;
      if (alertFilter === 'unread') return !alert.isRead;
      if (alertFilter === 'action_required') return alert.actionRequired;
      return alert.severity === alertFilter;
    });
  }, [alertsData, alertFilter]);

  // Estadísticas del inventario
  const inventoryStats = useMemo(() => {
    const totalProducts = inventoryData.length;
    const totalValue = inventoryData.reduce((sum, product) => sum + (product.currentStock * product.unitCost), 0);
    const lowStockCount = inventoryData.filter(p => p.status === 'low_stock').length;
    const outOfStockCount = inventoryData.filter(p => p.status === 'out_of_stock').length;
    const overstockCount = inventoryData.filter(p => p.status === 'overstock').length;
    const criticalAlerts = alertsData.filter(a => a.severity === 'critical' && !a.isRead).length;
    const averageTurnover = inventoryData.reduce((sum, p) => sum + p.turnoverRate, 0) / totalProducts;

    return {
      totalProducts,
      totalValue,
      lowStockCount,
      outOfStockCount,
      overstockCount,
      criticalAlerts,
      averageTurnover: averageTurnover || 0
    };
  }, [inventoryData, alertsData]);

  const getStatusBadge = (status: Product['status']) => {
    const variants = {
      in_stock: { variant: 'default' as const, label: 'En Stock', color: 'bg-green-100 text-green-800' },
      low_stock: { variant: 'destructive' as const, label: 'Stock Bajo', color: 'bg-yellow-100 text-yellow-800' },
      out_of_stock: { variant: 'destructive' as const, label: 'Agotado', color: 'bg-red-100 text-red-800' },
      overstock: { variant: 'secondary' as const, label: 'Exceso', color: 'bg-blue-100 text-blue-800' }
    };
    const config = variants[status];
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getAlertIcon = (type: InventoryAlert['type']) => {
    const icons = {
      low_stock: AlertTriangle,
      out_of_stock: XCircle,
      overstock: Info,
      reorder_needed: RefreshCw,
      expiring_soon: Clock,
      slow_moving: TrendingDown
    };
    const Icon = icons[type];
    return <Icon className="h-4 w-4" />;
  };

  const getSeverityColor = (severity: InventoryAlert['severity']) => {
    const colors = {
      low: 'text-blue-600',
      medium: 'text-yellow-600',
      high: 'text-orange-600',
      critical: 'text-red-600'
    };
    return colors[severity];
  };

  const handleReorder = (product: Product) => {
    if (onReorderProduct) {
      onReorderProduct(product.id, product.reorderQuantity);
    }
    toast.success(`Orden de reabastecimiento creada para ${product.name}`);
  };

  const handleDismissAlert = (alertId: string) => {
    if (onDismissAlert) {
      onDismissAlert(alertId);
    }
    toast.success('Alerta marcada como leída');
  };

  const handleToggleAutoReorder = (productId: string, enabled: boolean) => {
    if (onUpdateProduct) {
      onUpdateProduct(productId, { autoReorder: enabled });
    }
    toast.success(`Reorden automático ${enabled ? 'activado' : 'desactivado'}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="space-y-2">
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con estadísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total Inventario</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(inventoryStats.totalValue)}</div>
            <p className="text-xs text-muted-foreground">
              {inventoryStats.totalProducts} productos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas Críticas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{inventoryStats.criticalAlerts}</div>
            <p className="text-xs text-muted-foreground">
              Requieren atención inmediata
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Productos Agotados</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventoryStats.outOfStockCount}</div>
            <p className="text-xs text-muted-foreground">
              {inventoryStats.lowStockCount} con stock bajo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rotación Promedio</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventoryStats.averageTurnover.toFixed(1)}x</div>
            <p className="text-xs text-muted-foreground">
              Veces por año
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas críticas */}
      {filteredAlerts.filter(a => a.severity === 'critical' && !a.isRead).length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Atención:</strong> Tienes {filteredAlerts.filter(a => a.severity === 'critical' && !a.isRead).length} alertas críticas que requieren acción inmediata.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs principales */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
            <TabsTrigger value="overview">Resumen</TabsTrigger>
            <TabsTrigger value="products">Productos</TabsTrigger>
            <TabsTrigger value="alerts">Alertas</TabsTrigger>
            <TabsTrigger value="analytics">Análisis</TabsTrigger>
          </TabsList>

          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => setShowSettings(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Configurar
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
                  Productos que Requieren Atención
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {inventoryData
                  .filter(p => p.alertLevel !== 'none')
                  .sort((a, b) => {
                    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1, none: 0 };
                    return severityOrder[b.alertLevel] - severityOrder[a.alertLevel];
                  })
                  .slice(0, 5)
                  .map((product) => (
                    <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{product.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Stock: {product.currentStock} / Mín: {product.minStock}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(product.status)}
                        {product.autoReorder && product.status === 'low_stock' && (
                          <Button size="sm" onClick={() => handleReorder(product)}>
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Reordenar
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bell className="h-5 w-5 mr-2 text-blue-500" />
                  Alertas Recientes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {filteredAlerts
                  .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
                  .slice(0, 5)
                  .map((alert) => (
                    <div key={alert.id} className={`p-3 border rounded-lg ${alert.isRead ? 'opacity-60' : ''}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-2">
                          <div className={getSeverityColor(alert.severity)}>
                            {getAlertIcon(alert.type)}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{alert.productName}</h4>
                            <p className="text-xs text-muted-foreground">{alert.message}</p>
                            {alert.suggestedAction && (
                              <p className="text-xs text-blue-600 mt-1">
                                💡 {alert.suggestedAction}
                              </p>
                            )}
                          </div>
                        </div>
                        {!alert.isRead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDismissAlert(alert.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar productos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                <SelectItem value="Electrónicos">Electrónicos</SelectItem>
                <SelectItem value="Accesorios">Accesorios</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4">
            {filteredProducts.map((product) => (
              <Card key={product.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <div>
                          <h3 className="font-semibold">{product.name}</h3>
                          <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                        </div>
                        {getStatusBadge(product.status)}
                      </div>
                      
                      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <Label className="text-muted-foreground">Stock Actual</Label>
                          <p className="font-medium">{product.currentStock} unidades</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Stock Mínimo</Label>
                          <p className="font-medium">{product.minStock} unidades</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Rotación</Label>
                          <p className="font-medium">{product.turnoverRate.toFixed(1)}x/año</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Valor Stock</Label>
                          <p className="font-medium">{formatCurrency(product.currentStock * product.unitCost)}</p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span>Nivel de Stock</span>
                          <span>{Math.round((product.currentStock / product.maxStock) * 100)}%</span>
                        </div>
                        <Progress 
                          value={(product.currentStock / product.maxStock) * 100} 
                          className="h-2"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col items-end space-y-2">
                      <div className="flex items-center space-x-2">
                        <Label htmlFor={`auto-reorder-${product.id}`} className="text-sm">
                          Auto-reorden
                        </Label>
                        <Switch
                          id={`auto-reorder-${product.id}`}
                          checked={product.autoReorder}
                          onCheckedChange={(checked) => handleToggleAutoReorder(product.id, checked)}
                        />
                      </div>
                      
                      {(product.status === 'low_stock' || product.status === 'out_of_stock') && (
                        <Button size="sm" onClick={() => handleReorder(product)}>
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Reordenar
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <div className="flex items-center space-x-4">
            <Select value={alertFilter} onValueChange={setAlertFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar alertas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las alertas</SelectItem>
                <SelectItem value="unread">No leídas</SelectItem>
                <SelectItem value="action_required">Acción requerida</SelectItem>
                <SelectItem value="critical">Críticas</SelectItem>
                <SelectItem value="high">Alta prioridad</SelectItem>
                <SelectItem value="medium">Media prioridad</SelectItem>
                <SelectItem value="low">Baja prioridad</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            {filteredAlerts.map((alert) => (
              <Card key={alert.id} className={`${alert.isRead ? 'opacity-60' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className={`mt-1 ${getSeverityColor(alert.severity)}`}>
                        {getAlertIcon(alert.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium">{alert.productName}</h4>
                          <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                            {alert.severity.toUpperCase()}
                          </Badge>
                          {alert.actionRequired && (
                            <Badge variant="outline">Acción Requerida</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{alert.message}</p>
                        {alert.suggestedAction && (
                          <div className="p-2 bg-blue-50 rounded text-sm text-blue-800">
                            <strong>Acción sugerida:</strong> {alert.suggestedAction}
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {alert.createdAt.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {!alert.isRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDismissAlert(alert.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Distribución por Estado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { status: 'in_stock', label: 'En Stock', count: inventoryData.filter(p => p.status === 'in_stock').length, color: 'bg-green-500' },
                    { status: 'low_stock', label: 'Stock Bajo', count: inventoryData.filter(p => p.status === 'low_stock').length, color: 'bg-yellow-500' },
                    { status: 'out_of_stock', label: 'Agotado', count: inventoryData.filter(p => p.status === 'out_of_stock').length, color: 'bg-red-500' },
                    { status: 'overstock', label: 'Exceso', count: inventoryData.filter(p => p.status === 'overstock').length, color: 'bg-blue-500' }
                  ].map((item) => (
                    <div key={item.status} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${item.color}`} />
                        <span className="text-sm font-medium">{item.label}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">{item.count}</span>
                        <div className="w-20">
                          <Progress value={(item.count / inventoryData.length) * 100} className="h-2" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Productos por Rotación</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {inventoryData
                    .sort((a, b) => b.turnoverRate - a.turnoverRate)
                    .slice(0, 5)
                    .map((product, index) => (
                      <div key={product.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                            {index + 1}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{product.name}</p>
                            <p className="text-xs text-muted-foreground">{product.category}</p>
                          </div>
                        </div>
                        <Badge variant="outline">{product.turnoverRate.toFixed(1)}x</Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog de configuración */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configuración del Sistema</DialogTitle>
            <DialogDescription>
              Personaliza las alertas y configuraciones automáticas
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-refresh">Actualización Automática</Label>
              <Switch
                id="auto-refresh"
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
              />
            </div>
            {autoRefresh && (
              <div>
                <Label htmlFor="refresh-interval">Intervalo (segundos)</Label>
                <Input
                  id="refresh-interval"
                  type="number"
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  min="10"
                  max="300"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowSettings(false)}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SmartInventorySystem;