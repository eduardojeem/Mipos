import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../lib/api';
import type { Product } from '@/types';

interface StockUpdate {
  productId: string;
  oldStock: number;
  newStock: number;
  timestamp: Date;
}

interface UseInventorySyncOptions {
  refreshInterval?: number;
  enableAutoSync?: boolean;
  onStockChange?: (update: StockUpdate) => void;
  onLowStock?: (products: Product[]) => void;
}

export const useInventorySync = (options: UseInventorySyncOptions = {}) => {
  const {
    refreshInterval = 30000,
    enableAutoSync = true,
    onStockChange,
    onLowStock
  } = options;

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousStocksRef = useRef<Map<string, number>>(new Map());

  // Función para sincronizar inventario
  const syncInventory = useCallback(async () => {
    try {
      setIsLoading(true);
      setIsConnected(true);

      const response = await api.get('/products?includeStock=true');
      const updatedProducts: Product[] = response.data.products || response.data;

      // Detectar cambios en el stock
      const stockUpdates: StockUpdate[] = [];
      updatedProducts.forEach(product => {
        const previousStock = previousStocksRef.current.get(product.id);
        if (previousStock !== undefined && previousStock !== product.stock_quantity) {
          const update: StockUpdate = {
            productId: product.id,
            oldStock: previousStock,
            newStock: product.stock_quantity,
            timestamp: new Date()
          };
          stockUpdates.push(update);
          
          // Notificar cambio de stock
          if (onStockChange) {
            onStockChange(update);
          }
        }
        
        // Actualizar referencia de stock anterior
        previousStocksRef.current.set(product.id, product.stock_quantity);
      });

      // Detectar productos con stock bajo
      const lowStock = updatedProducts.filter(product => 
        product.min_stock && product.stock_quantity <= product.min_stock
      );

      setProducts(updatedProducts);
      setLowStockProducts(lowStock);
      setLastSync(new Date());

      // Notificar productos con stock bajo
      if (onLowStock && lowStock.length > 0) {
        onLowStock(lowStock);
      }

      return { products: updatedProducts, stockUpdates, lowStock };

    } catch (error) {
      console.error('Error sincronizando inventario:', error);
      setIsConnected(false);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [onStockChange, onLowStock]);

  // Función para obtener stock de un producto específico
  const getProductStock = useCallback((productId: string): number | null => {
    const product = products.find(p => p.id === productId);
    return product ? product.stock_quantity : null;
  }, [products]);

  // Función para verificar si un producto tiene stock bajo
  const isLowStock = useCallback((productId: string): boolean => {
    return lowStockProducts.some(p => p.id === productId);
  }, [lowStockProducts]);

  // Función para actualizar stock localmente (optimistic update)
  const updateLocalStock = useCallback((productId: string, newStock: number) => {
    setProducts(prev => prev.map(product => 
      product.id === productId 
        ? { ...product, stock_quantity: newStock }
        : product
    ));
    
    // Actualizar referencia
    previousStocksRef.current.set(productId, newStock);
  }, []);

  // Función para forzar sincronización
  const forceSync = useCallback(() => {
    return syncInventory();
  }, [syncInventory]);

  // Configurar sincronización automática
  useEffect(() => {
    if (!enableAutoSync) return;

    // Sincronización inicial
    syncInventory();

    // Configurar intervalo
    intervalRef.current = setInterval(syncInventory, refreshInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [syncInventory, refreshInterval, enableAutoSync]);

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    // Estado
    products,
    isLoading,
    isConnected,
    lastSync,
    lowStockProducts,
    
    // Funciones
    syncInventory: forceSync,
    getProductStock,
    isLowStock,
    updateLocalStock,
    
    // Estadísticas
    totalProducts: products.length,
    lowStockCount: lowStockProducts.length,
    outOfStockCount: products.filter(p => p.stock_quantity === 0).length
  };
};

export default useInventorySync;