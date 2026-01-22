import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { 
  Package, 
  Plus, 
  Minus, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Settings, 
  History, 
  RefreshCw,
  Search,
  Filter,
  Download,
  Upload
} from 'lucide-react';
import api, { inventoryAPI } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  sku?: string;
  stock_quantity: number;
  min_stock?: number;
  sale_price: number;
  category?: {
    name: string;
  };
}

interface InventoryMovement {
  id: string;
  product_id: string;
  product?: Product;
  type: 'IN' | 'OUT' | 'ADJUSTMENT';
  quantity: number;
  reason?: string;
  created_at: string;
  user?: {
    name: string;
  };
}

interface StockAdjustment {
  productId: string;
  currentStock: number;
  newStock: number;
  reason: string;
}

interface InventoryControlPanelProps {
  products: Product[];
  onStockUpdate?: (productId: string, newStock: number) => void;
  onRefresh?: () => void;
}

export const InventoryControlPanel: React.FC<InventoryControlPanelProps> = ({
  products,
  onStockUpdate,
  onRefresh
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [adjustment, setAdjustment] = useState<StockAdjustment>({
    productId: '',
    currentStock: 0,
    newStock: 0,
    reason: ''
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'low' | 'out'>('all');

  // Cargar movimientos de inventario
  const loadMovements = async () => {
    try {
      const res = await inventoryAPI.getMovements({ limit: 50 });
      setMovements(res.movements || []);
    } catch (error) {
      console.error('Error loading movements:', error);
    }
  };

  useEffect(() => {
    loadMovements();
  }, []);

  // Filtrar productos
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.sku?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterType === 'all' || 
                         (filterType === 'low' && product.stock_quantity <= (product.min_stock || 5)) ||
                         (filterType === 'out' && product.stock_quantity === 0);
    
    return matchesSearch && matchesFilter;
  });

  // Ajustar stock
  const handleStockAdjustment = async () => {
    if (!selectedProduct || adjustment.newStock < 0) {
      toast({
        title: "Error",
        description: "Datos de ajuste inválidos",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const adjustmentData = {
        product_id: selectedProduct.id,
        type: adjustment.newStock > adjustment.currentStock ? 'IN' : 'OUT',
        quantity: Math.abs(adjustment.newStock - adjustment.currentStock),
        reason: adjustment.reason || 'Ajuste manual desde POS'
      };

      await api.post('/inventory/movements', adjustmentData);
      
      // Actualizar stock local
      if (onStockUpdate) {
        onStockUpdate(selectedProduct.id, adjustment.newStock);
      }

      toast({
        title: "Stock actualizado",
        description: `${selectedProduct.name}: ${adjustment.currentStock} → ${adjustment.newStock}`,
        variant: "default"
      });

      // Limpiar formulario
      setSelectedProduct(null);
      setAdjustment({
        productId: '',
        currentStock: 0,
        newStock: 0,
        reason: ''
      });

      // Recargar datos
      loadMovements();
      if (onRefresh) onRefresh();

    } catch (error) {
      console.error('Error adjusting stock:', error);
      toast({
        title: "Error",
        description: "No se pudo ajustar el stock",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Ajuste rápido (+/- 1)
  const handleQuickAdjustment = async (product: Product, change: number) => {
    const newStock = Math.max(0, product.stock_quantity + change);
    
    setLoading(true);
    try {
      const signed = change > 0 ? Math.abs(change) : -Math.abs(change);
      await inventoryAPI.adjustStock(product.id, signed, `Ajuste rápido ${change > 0 ? '+' : ''}${change}`);
      
      if (onStockUpdate) {
        onStockUpdate(product.id, newStock);
      }

      toast({
        title: "Stock ajustado",
        description: `${product.name}: ${product.stock_quantity} → ${newStock}`,
      });

      loadMovements();
      if (onRefresh) onRefresh();

    } catch (error) {
      console.error('Error in quick adjustment:', error);
      toast({
        title: "Error",
        description: "No se pudo ajustar el stock",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStockStatus = (product: Product) => {
    if (product.stock_quantity === 0) return { status: 'out', color: 'bg-red-100 text-red-800', text: 'Agotado' };
    if (product.stock_quantity <= (product.min_stock || 5)) return { status: 'low', color: 'bg-orange-100 text-orange-800', text: 'Bajo' };
    return { status: 'ok', color: 'bg-green-100 text-green-800', text: 'Disponible' };
  };

  const formatMovementType = (type: string) => {
    switch (type) {
      case 'IN': return { text: 'Entrada', color: 'bg-green-100 text-green-800', icon: TrendingUp };
      case 'OUT': return { text: 'Salida', color: 'bg-red-100 text-red-800', icon: TrendingDown };
      case 'ADJUSTMENT': return { text: 'Ajuste', color: 'bg-blue-100 text-blue-800', icon: Settings };
      default: return { text: type, color: 'bg-gray-100 text-gray-800', icon: Package };
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Panel de Control de Inventario
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="products" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="products">Productos</TabsTrigger>
            <TabsTrigger value="movements">Movimientos</TabsTrigger>
            <TabsTrigger value="settings">Configuración</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-4">
            {/* Controles de filtrado */}
            <div className="flex gap-4 items-center">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar productos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="low">Stock Bajo</SelectItem>
                  <SelectItem value="out">Agotados</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={onRefresh}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            {/* Lista de productos */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredProducts.map((product) => {
                const stockStatus = getStockStatus(product);
                return (
                  <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium truncate">{product.name}</h4>
                        <Badge className={stockStatus.color}>
                          {stockStatus.text}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {product.sku && <span>SKU: {product.sku}</span>}
                        <span>Stock: {product.stock_quantity}</span>
                        <span>Mín: {product.min_stock || 5}</span>
                        <span>{formatCurrency(product.sale_price)}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {/* Ajustes rápidos */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickAdjustment(product, -1)}
                        disabled={loading || product.stock_quantity === 0}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickAdjustment(product, 1)}
                        disabled={loading}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      
                      {/* Ajuste manual */}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedProduct(product);
                              setAdjustment({
                                productId: product.id,
                                currentStock: product.stock_quantity,
                                newStock: product.stock_quantity,
                                reason: ''
                              });
                            }}
                          >
                            <Settings className="h-3 w-3" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent aria-labelledby="adjust-stock-title">
                          <DialogHeader>
                            <DialogTitle id="adjust-stock-title">Ajustar Stock - {product.name}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>Stock Actual</Label>
                              <Input value={adjustment.currentStock} disabled />
                            </div>
                            <div>
                              <Label>Nuevo Stock</Label>
                              <Input
                                type="number"
                                min="0"
                                value={adjustment.newStock}
                                onChange={(e) => setAdjustment(prev => ({
                                  ...prev,
                                  newStock: parseInt(e.target.value) || 0
                                }))}
                              />
                            </div>
                            <div>
                              <Label>Motivo (opcional)</Label>
                              <Input
                                placeholder="Motivo del ajuste..."
                                value={adjustment.reason}
                                onChange={(e) => setAdjustment(prev => ({
                                  ...prev,
                                  reason: e.target.value
                                }))}
                              />
                            </div>
                            <Button 
                              onClick={handleStockAdjustment}
                              disabled={loading}
                              className="w-full"
                            >
                              {loading ? 'Ajustando...' : 'Confirmar Ajuste'}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="movements" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Movimientos Recientes</h3>
              <Button variant="outline" onClick={loadMovements}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualizar
              </Button>
            </div>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {movements.map((movement) => {
                const typeInfo = formatMovementType(movement.type);
                const Icon = typeInfo.icon;
                
                return (
                  <div key={movement.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">
                          {movement.product?.name || `Producto ${movement.product_id}`}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {movement.reason || 'Sin motivo especificado'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <Badge className={typeInfo.color}>
                        {movement.type === 'OUT' ? '-' : '+'}{movement.quantity}
                      </Badge>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(movement.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Configuración de Alertas</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Stock Bajo Global</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Label className="text-xs">Umbral mínimo por defecto</Label>
                      <Input type="number" defaultValue="5" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Notificaciones</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Label className="text-xs">Frecuencia de alertas</Label>
                      <Select defaultValue="daily">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="realtime">Tiempo Real</SelectItem>
                          <SelectItem value="hourly">Cada Hora</SelectItem>
                          <SelectItem value="daily">Diario</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Inventario
                </Button>
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Importar Ajustes
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default InventoryControlPanel;