import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Package, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Clock,
  Filter,
  RefreshCw,
  Plus,
  Minus,
  BarChart3,
  Search
} from 'lucide-react';
import { useRealtimeInventory, type InventoryMovement } from '@/hooks/useRealtimeInventory';
import { formatCurrency } from '@/lib/utils';
import { toast } from '@/lib/toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useDebounce } from '@/hooks/useDebounce';

interface InventoryDashboardProps {
  className?: string;
  initialSearch?: string;
  initialType?: string;
  initialProductId?: string;
}

export const InventoryDashboard: React.FC<InventoryDashboardProps> = ({ className, initialSearch, initialType, initialProductId }) => {
  const {
    movements,
    stats,
    loading,
    error,
    refreshMovements,
    adjustStock,
    bulkAdjustStock
  } = useRealtimeInventory();

  const [searchTerm, setSearchTerm] = useState(initialSearch || '');
  const [movementType, setMovementType] = useState<string>(initialType || 'all');
  const [selectedProduct, setSelectedProduct] = useState<string>(initialProductId || '');
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [adjustmentData, setAdjustmentData] = useState({
    productId: '',
    quantity: 0,
    reason: '',
    type: 'ADJUSTMENT' as 'IN' | 'OUT' | 'ADJUSTMENT'
  });
  const [isOffline, setIsOffline] = useState<boolean>(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  React.useEffect(() => {
    const handle = () => setIsOffline(typeof navigator !== 'undefined' ? !navigator.onLine : false);
    if (typeof window !== 'undefined') {
      window.addEventListener('online', handle);
      window.addEventListener('offline', handle);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handle);
        window.removeEventListener('offline', handle);
      }
    };
  }, []);

  // Filtrar movimientos
  const debouncedSearch = useDebounce(searchTerm, 300);
  const filteredMovements = useMemo(() => {
    return movements.filter(movement => {
      const matchesSearch = movement.product_name.toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchesType = movementType === 'all' || movement.type === movementType;
      const matchesProduct = !selectedProduct || movement.product_id === selectedProduct;
      
      return matchesSearch && matchesType && matchesProduct;
    });
  }, [movements, debouncedSearch, movementType, selectedProduct]);

  // Agrupar movimientos por producto para estadísticas rápidas
  const productStats = useMemo(() => {
    const stats = new Map<string, { 
      name: string; 
      totalIn: number; 
      totalOut: number; 
      netChange: number;
      lastMovement: string;
    }>();

    movements.forEach(movement => {
      const existing = stats.get(movement.product_id) || {
        name: movement.product_name,
        totalIn: 0,
        totalOut: 0,
        netChange: 0,
        lastMovement: movement.created_at
      };

      if (movement.type === 'IN') {
        existing.totalIn += movement.quantity;
        existing.netChange += movement.quantity;
      } else if (movement.type === 'OUT' || movement.type === 'SALE') {
        existing.totalOut += movement.quantity;
        existing.netChange -= movement.quantity;
      }

      if (new Date(movement.created_at) > new Date(existing.lastMovement)) {
        existing.lastMovement = movement.created_at;
      }

      stats.set(movement.product_id, existing);
    });

    return Array.from(stats.entries()).map(([productId, data]) => ({
      productId,
      ...data
    }));
  }, [movements]);

  const handleStockAdjustment = useCallback(async () => {
    if (!adjustmentData.productId || adjustmentData.quantity === 0) {
      toast.error('Por favor complete todos los campos');
      return;
    }

    try {
      const finalQuantity = adjustmentData.type === 'OUT' ? -Math.abs(adjustmentData.quantity) : Math.abs(adjustmentData.quantity);
      
      await adjustStock(
        adjustmentData.productId,
        finalQuantity,
        adjustmentData.reason || `Ajuste manual - ${adjustmentData.type}`
      );

      setShowAdjustmentModal(false);
      setAdjustmentData({ productId: '', quantity: 0, reason: '', type: 'ADJUSTMENT' });
      toast.success('Stock ajustado correctamente');
    } catch (error) {
      toast.error('Error al ajustar stock');
    }
  }, [adjustmentData, adjustStock]);

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'IN': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'OUT': return <TrendingDown className="w-4 h-4 text-red-500" />;
      case 'SALE': return <Package className="w-4 h-4 text-blue-500" />;
      case 'RETURN': return <RefreshCw className="w-4 h-4 text-purple-500" />;
      default: return <BarChart3 className="w-4 h-4 text-gray-500" />;
    }
  };

  const getMovementBadgeColor = (type: string) => {
    switch (type) {
      case 'IN': return 'bg-green-100 text-green-800';
      case 'OUT': return 'bg-red-100 text-red-800';
      case 'SALE': return 'bg-blue-100 text-blue-800';
      case 'RETURN': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getMovementTypeLabel = (type: string) => {
    switch (type) {
      case 'IN': return 'Entrada';
      case 'OUT': return 'Salida';
      case 'SALE': return 'Venta';
      case 'RETURN': return 'Devolución';
      case 'ADJUSTMENT': return 'Ajuste';
      default: return type;
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Inventario en Tiempo Real
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Error de Inventario
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">{error}</p>
          <Button onClick={refreshMovements} className="mt-4">
            <RefreshCw className="w-4 h-4 mr-2" />
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      {isOffline && (
        <div className="mb-4">
          <Badge variant="outline" className="w-fit bg-yellow-100 text-yellow-800">Sin conexión: los ajustes se encolarán</Badge>
        </div>
      )}
      {/* Estadísticas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Productos</p>
                <p className="text-2xl font-bold">{stats.totalProducts}</p>
              </div>
              <Package className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Bajo Stock</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.lowStockProducts}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Sin Stock</p>
                <p className="text-2xl font-bold text-red-600">{stats.outOfStockProducts}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Valor Total</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalValue)}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Movimientos Hoy</p>
                <p className="text-2xl font-bold">{stats.recentMovements}</p>
              </div>
              <Clock className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controles y Filtros */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Control de Inventario
            </span>
            <Button onClick={() => setShowAdjustmentModal(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Ajustar Stock
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Buscar Producto</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Nombre del producto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="movementType">Tipo de Movimiento</Label>
              <Select value={movementType} onValueChange={setMovementType}>
                <SelectTrigger id="movementType">
                  <SelectValue placeholder="Todos los tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="IN">Entradas</SelectItem>
                  <SelectItem value="OUT">Salidas</SelectItem>
                  <SelectItem value="SALE">Ventas</SelectItem>
                  <SelectItem value="RETURN">Devoluciones</SelectItem>
                  <SelectItem value="ADJUSTMENT">Ajustes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={refreshMovements} variant="outline" className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Actualizar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Movimientos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Movimientos Recientes ({filteredMovements.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            <AnimatePresence>
              {filteredMovements.map((movement, index) => (
                <motion.div
                  key={movement.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {getMovementIcon(movement.type)}
                    <div>
                      <p className="font-medium text-sm">{movement.product_name}</p>
                      <p className="text-xs text-gray-600">
                        {getMovementTypeLabel(movement.type)} • 
                        {new Date(movement.created_at).toLocaleString('es-ES')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                      </p>
                      <p className="text-xs text-gray-600">
                        {movement.previous_stock} → {movement.new_stock}
                      </p>
                    </div>
                    <Badge className={getMovementBadgeColor(movement.type)}>
                      {movement.type}
                    </Badge>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {filteredMovements.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No hay movimientos de inventario</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal de Ajuste de Stock */}
      {showAdjustmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Ajustar Stock</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="product">Producto</Label>
                <Input
                  id="product"
                  placeholder="ID del producto"
                  value={adjustmentData.productId}
                  onChange={(e) => setAdjustmentData(prev => ({ ...prev, productId: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="type">Tipo de Ajuste</Label>
                <Select 
                  value={adjustmentData.type} 
                  onValueChange={(value) => setAdjustmentData(prev => ({ ...prev, type: value as any }))}
                >
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IN">Entrada (+)</SelectItem>
                    <SelectItem value="OUT">Salida (-)</SelectItem>
                    <SelectItem value="ADJUSTMENT">Ajuste</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="quantity">Cantidad</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={adjustmentData.quantity}
                  onChange={(e) => setAdjustmentData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                />
              </div>

              <div>
                <Label htmlFor="reason">Motivo</Label>
                <Input
                  id="reason"
                  placeholder="Razón del ajuste"
                  value={adjustmentData.reason}
                  onChange={(e) => setAdjustmentData(prev => ({ ...prev, reason: e.target.value }))}
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleStockAdjustment} 
                  className="flex-1"
                >
                  Aplicar Ajuste
                </Button>
                <Button 
                  onClick={() => setShowAdjustmentModal(false)} 
                  variant="outline"
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};