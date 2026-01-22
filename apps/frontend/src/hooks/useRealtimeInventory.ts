import { useState, useEffect, useCallback, useRef } from 'react';
import { inventoryAPI } from '@/lib/api';
import { toast } from '@/lib/toast';
import { realtimeService } from '@/lib/supabase-realtime';
import { createClient } from '@/lib/supabase';

export interface InventoryMovement {
  id: string;
  product_id: string;
  product_name: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'SALE' | 'RETURN';
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reason?: string;
  created_at: string;
  user_id?: string;
  sale_id?: string;
}

export interface InventoryStats {
  totalProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalValue: number;
  recentMovements: number;
}

export interface UseRealtimeInventoryReturn {
  movements: InventoryMovement[];
  stats: InventoryStats;
  loading: boolean;
  error: string | null;
  subscribeToProduct: (productId: string) => void;
  unsubscribeFromProduct: (productId: string) => void;
  refreshMovements: () => Promise<void>;
  getProductMovements: (productId: string) => Promise<InventoryMovement[]>;
  adjustStock: (productId: string, quantity: number, reason: string) => Promise<void>;
  bulkAdjustStock: (adjustments: Array<{productId: string; quantity: number; reason: string}>) => Promise<void>;
}

export const useRealtimeInventory = (): UseRealtimeInventoryReturn => {
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [stats, setStats] = useState<InventoryStats>({
    totalProducts: 0,
    lowStockProducts: 0,
    outOfStockProducts: 0,
    totalValue: 0,
    recentMovements: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscribedProducts, setSubscribedProducts] = useState<Set<string>>(new Set());
  const productNamesRef = useRef<Map<string, string>>(new Map());
  const supabase = createClient();
  const offlineQueueRef = useRef<Array<{ productId: string; quantity: number; reason: string; timestamp: number }>>([]);
  const saveQueue = useCallback(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('inventory_offline_queue', JSON.stringify(offlineQueueRef.current));
      }
    } catch {}
  }, []);
  const loadQueue = useCallback(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem('inventory_offline_queue');
        if (raw) offlineQueueRef.current = JSON.parse(raw) || [];
      }
    } catch {}
  }, []);

  // Cargar movimientos iniciales
  const loadMovements = useCallback(async () => {
    try {
      setLoading(true);
      const res = await inventoryAPI.getMovements();
      setMovements(res.movements);
      
      const statsResponse = await inventoryAPI.getStats();
      setStats(statsResponse as any);
      
      setError(null);
    } catch (err) {
      const offline = typeof navigator !== 'undefined' && !navigator.onLine;
      setError(offline ? null : 'Error al cargar movimientos de inventario');
      if (!offline) {
        toast.error('Error al cargar inventario');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshMovements = useCallback(async () => {
    await loadMovements();
    toast.success('Inventario actualizado');
  }, [loadMovements]);


  // Suscribirse a movimientos globales
  useEffect(() => {
    loadMovements();
    loadQueue();

    let unsubscribe: (() => void) | undefined;

    realtimeService.subscribeToInventoryMovementsGlobal((payload) => {
      const row = payload.new || payload.old;
      if (!row) return;
      const type = String((row as any).movement_type || (row as any).reference_type || 'ADJUSTMENT').toUpperCase();
      const productId = String((row as any).product_id || '');
      const nameMap = productNamesRef.current;
      const pname = nameMap.get(productId) || productId;
      const next: InventoryMovement = {
        id: String((row as any).id || `${productId}-${Date.now()}`),
        product_id: productId,
        product_name: pname,
        type: type as any,
        quantity: Number((row as any).quantity) || 0,
        previous_stock: 0,
        new_stock: 0,
        reason: (row as any).notes || undefined,
        created_at: String((row as any).created_at || new Date().toISOString()),
        user_id: (row as any).user_id || undefined,
        sale_id: (row as any).reference_id || undefined,
      };
      setMovements(prev => [next, ...prev]);
      if (next.type === 'OUT' || next.type === 'SALE') {
        setStats(prev => ({ ...prev, recentMovements: prev.recentMovements + 1 }));
      }
      if (!nameMap.has(productId)) {
        supabase
          .from('products')
          .select('id,name')
          .eq('id', productId)
          .limit(1)
          .then((res: any) => {
            const nm = (res && res.data && res.data[0] && res.data[0].name) ? String(res.data[0].name) : undefined;
            if (nm) {
              nameMap.set(productId, nm);
              setMovements(prev => prev.map(m => m.product_id === productId ? { ...m, product_name: nm } : m));
            }
          });
      }
      toast.success(`Inventario actualizado${pname ? `: ${pname}` : ''}`);
    }).then((unsub) => {
      unsubscribe = unsub;
    });

    const handleOnline = () => {
      const items = [...offlineQueueRef.current];
      if (!items.length) return;
      const flush = async () => {
        for (const it of items) {
          try {
            await inventoryAPI.adjustStock(it.productId, it.quantity, it.reason);
            offlineQueueRef.current = offlineQueueRef.current.filter(q => !(q.productId === it.productId && q.timestamp === it.timestamp));
            saveQueue();
          } catch {}
        }
        refreshMovements();
        toast.success('Ajustes de stock sincronizados');
      };
      flush();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
    }
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
      }
    };
  }, [loadMovements, loadQueue, saveQueue, refreshMovements, supabase]);

  // Suscribirse a movimientos de producto específico
  const subscribeToProduct = useCallback(async (productId: string) => {
    if (subscribedProducts.has(productId)) return;
    try {
      realtimeService.subscribeToInventoryMovementsByProduct(productId, (payload) => {
        const row = payload.new || payload.old;
        if (!row) return;
        const type = String((row as any).movement_type || (row as any).reference_type || 'ADJUSTMENT').toUpperCase();
        const pname = productNamesRef.current.get(productId) || productId;
        const next: InventoryMovement = {
          id: String((row as any).id || `${productId}-${Date.now()}`),
          product_id: productId,
          product_name: pname,
          type: type as any,
          quantity: Number((row as any).quantity) || 0,
          previous_stock: 0,
          new_stock: 0,
          reason: (row as any).notes || undefined,
          created_at: String((row as any).created_at || new Date().toISOString()),
          user_id: (row as any).user_id || undefined,
          sale_id: (row as any).reference_id || undefined,
        };
        setMovements(prev => [next, ...prev]);
      });
      setSubscribedProducts(prev => new Set(Array.from(prev).concat(productId)));
      return () => {
        realtimeService.unsubscribe(`inventory_movements:${productId}`);
        setSubscribedProducts(prev => {
          const newSet = new Set(prev);
          newSet.delete(productId);
          return newSet;
        });
      };
    } catch (error) {
      console.error(`Failed to subscribe to product ${productId}:`, error);
      return () => {};
    }
  }, [subscribedProducts]);

  const unsubscribeFromProduct = useCallback((productId: string) => {
    // La desuscripción se maneja automáticamente al desmontar
    setSubscribedProducts(prev => {
      const newSet = new Set(prev);
      newSet.delete(productId);
      return newSet;
    });
  }, []);


  // Obtener movimientos de un producto específico
  const getProductMovements = useCallback(async (productId: string): Promise<InventoryMovement[]> => {
    try {
      const res = await inventoryAPI.getProductMovements(productId);
      return res.movements;
    } catch (err) {
      toast.error('Error al obtener movimientos del producto');
      return [];
    }
  }, []);

  // Ajustar stock
  const adjustStock = useCallback(async (productId: string, quantity: number, reason: string) => {
    try {
      const offline = typeof navigator !== 'undefined' && !navigator.onLine;
      if (offline) {
        const item = { productId, quantity, reason, timestamp: Date.now() };
        offlineQueueRef.current.push(item);
        saveQueue();
        toast.success('Ajuste en cola (offline)');
        return;
      }
      await inventoryAPI.adjustStock(productId, quantity, reason);
      toast.success('Stock ajustado correctamente');
      
      // Refrescar movimientos para ver el cambio
      await refreshMovements();
    } catch (err) {
      toast.error('Error al ajustar stock');
      throw err;
    }
  }, [refreshMovements, saveQueue]);

  // Ajuste masivo de stock
  const bulkAdjustStock = useCallback(async (adjustments: Array<{productId: string; quantity: number; reason: string}>) => {
    try {
      await inventoryAPI.bulkAdjustStock(adjustments);
      toast.success('Stock ajustado masivamente');
      
      // Refrescar movimientos
      await refreshMovements();
    } catch (err) {
      toast.error('Error al ajustar stock masivamente');
      throw err;
    }
  }, [refreshMovements]);

  return {
    movements,
    stats,
    loading,
    error,
    subscribeToProduct,
    unsubscribeFromProduct,
    refreshMovements,
    getProductMovements,
    adjustStock,
    bulkAdjustStock
  };
};