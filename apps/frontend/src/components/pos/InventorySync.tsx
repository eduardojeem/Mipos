import React, { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { api } from '../../lib/api';

interface Product {
  id: string;
  name: string;
  sku: string;
  stockQuantity: number;
  minimumStock?: number;
}

interface InventorySyncProps {
  onStockUpdate?: (productId: string, newStock: number) => void;
  onLowStockAlert?: (products: Product[]) => void;
  refreshInterval?: number; // en milisegundos
}

interface StockAlert {
  id: string;
  productId: string;
  productName: string;
  currentStock: number;
  minimumStock: number;
  timestamp: Date;
}

export const InventorySync: React.FC<InventorySyncProps> = ({
  onStockUpdate,
  onLowStockAlert,
  refreshInterval = 30000 // 30 segundos por defecto
}) => {
  const [isConnected, setIsConnected] = useState(true);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Función para sincronizar inventario
  const syncInventory = useCallback(async () => {
    try {
      setIsLoading(true);
      setIsConnected(true);

      // Obtener productos con stock actualizado
      const response = await api.get('/products?includeStock=true');
      const products: Product[] = response.data.products || response.data;

      // Detectar productos con stock bajo
      const lowStockProducts = products.filter(product => 
        product.minimumStock && product.stockQuantity <= product.minimumStock
      );

      // Actualizar alertas de stock bajo
      const newAlerts: StockAlert[] = lowStockProducts.map(product => ({
        id: `${product.id}-${Date.now()}`,
        productId: product.id,
        productName: product.name,
        currentStock: product.stockQuantity,
        minimumStock: product.minimumStock || 0,
        timestamp: new Date()
      }));

      setStockAlerts(newAlerts);
      setLastSync(new Date());

      // Notificar actualizaciones de stock
      if (onStockUpdate) {
        products.forEach(product => {
          onStockUpdate(product.id, product.stockQuantity);
        });
      }

      // Notificar alertas de stock bajo
      if (onLowStockAlert && lowStockProducts.length > 0) {
        onLowStockAlert(lowStockProducts);
      }

    } catch (error) {
      console.error('Error sincronizando inventario:', error);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, [onStockUpdate, onLowStockAlert]);

  // Sincronización automática
  useEffect(() => {
    // Sincronización inicial
    syncInventory();

    // Configurar intervalo de sincronización
    const interval = setInterval(syncInventory, refreshInterval);

    return () => clearInterval(interval);
  }, [syncInventory, refreshInterval]);

  // Función para sincronización manual
  const handleManualSync = () => {
    syncInventory();
  };

  // Función para limpiar alertas
  const clearAlerts = () => {
    setStockAlerts([]);
  };

  return (
    <div className="inventory-sync">
      {/* Indicador de estado de conexión */}
      <div className="flex items-center gap-2 mb-4">
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
          isConnected 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {isConnected ? (
            <>
              <Wifi className="w-3 h-3" />
              <span>Conectado</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3" />
              <span>Desconectado</span>
            </>
          )}
        </div>

        {lastSync && (
          <span className="text-xs text-gray-500">
            Última sync: {lastSync.toLocaleTimeString()}
          </span>
        )}

        <button
          onClick={handleManualSync}
          disabled={isLoading}
          className={`p-1 rounded-full hover:bg-gray-100 ${
            isLoading ? 'animate-spin' : ''
          }`}
          title="Sincronizar manualmente"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Alertas de stock bajo */}
      {stockAlerts.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">
                Stock Bajo ({stockAlerts.length} productos)
              </span>
            </div>
            <button
              onClick={clearAlerts}
              className="text-xs text-yellow-600 hover:text-yellow-800"
            >
              Limpiar
            </button>
          </div>
          
          <div className="space-y-1">
            {stockAlerts.slice(0, 3).map(alert => (
              <div key={alert.id} className="text-xs text-yellow-700">
                <span className="font-medium">{alert.productName}</span>
                <span className="ml-2">
                  Stock: {alert.currentStock} / Mín: {alert.minimumStock}
                </span>
              </div>
            ))}
            {stockAlerts.length > 3 && (
              <div className="text-xs text-yellow-600">
                +{stockAlerts.length - 3} productos más...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Indicador de carga */}
      {isLoading && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <RefreshCw className="w-3 h-3 animate-spin" />
          <span>Sincronizando...</span>
        </div>
      )}
    </div>
  );
};

export default InventorySync;