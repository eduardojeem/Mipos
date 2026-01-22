import { useCallback, useEffect, useRef, useState } from 'react';
import { realtimeService } from '@/lib/supabase-realtime';
import { createClient } from '@/lib/supabase';
import { usePOSStore } from '@/store';

interface POSRealtimeSyncOptions {
  onRefresh?: () => Promise<void> | void;
  refreshDebounceMs?: number;
  enableNotifications?: boolean;
}

export interface POSRealtimeState {
  isConnected: boolean;
  status: 'connecting' | 'connected' | 'error' | 'inactive';
  lastUpdate: Date | null;
  newSalesCount: number;
  notificationsEnabled: boolean;
  refresh: () => void;
  toggleNotifications: () => void;
  markSalesAsViewed: () => void;
}

/**
 * Hook que orquesta suscripciones realtime para POS (ventas, items de venta y movimientos de inventario)
 * - Actualiza estado de conexión y últimas actualizaciones
 * - Agrega un contador de nuevas ventas
 * - Expone un método de refresh (manual) y un scheduler con debounce para evitar tormenta de requests
 */
export function usePOSRealtimeSync(options: POSRealtimeSyncOptions = {}): POSRealtimeState {
  const { onRefresh, refreshDebounceMs = 1500, enableNotifications = true } = options;

  const [status, setStatus] = useState<POSRealtimeState['status']>('connecting');
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [newSalesCount, setNewSalesCount] = useState(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(enableNotifications);

  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingEventsRef = useRef<number>(0);
  const mountedRef = useRef<boolean>(false);

  const scheduleRefresh = useCallback(() => {
    pendingEventsRef.current += 1;

    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    refreshTimerRef.current = setTimeout(async () => {
      try {
        if (onRefresh) await onRefresh();
        setLastUpdate(new Date());
        pendingEventsRef.current = 0;
      } catch (err) {
        console.error('POS realtime refresh error:', err);
        setStatus('error');
      }
    }, refreshDebounceMs);
  }, [onRefresh, refreshDebounceMs]);

  const refresh = useCallback(() => {
    // Permite refresco manual inmediato
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    scheduleRefresh();
  }, [scheduleRefresh]);

  const toggleNotifications = useCallback(() => {
    setNotificationsEnabled(prev => !prev);
  }, []);

  const markSalesAsViewed = useCallback(() => {
    setNewSalesCount(0);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const supabase = createClient();

    // Intentar suscripciones en serie para obtener estado
    try {
      setStatus('connecting');

      const salesSub = realtimeService.subscribeToSales((payload) => {
        // INSERT/UPDATE/DELETE de ventas
        setLastUpdate(new Date());
        if (payload.eventType === 'INSERT') {
          setNewSalesCount(c => c + 1);
        }
        scheduleRefresh();
      });

      const saleItemsSub = realtimeService.subscribeToSaleItemsGlobal((payload) => {
        setLastUpdate(new Date());
        try {
          const entityId = payload.new?.id || payload.old?.id;
          supabase.from('sync_acks').insert({ entity: 'sale_items', entity_id: String(entityId || ''), event: payload.eventType, node_id: typeof navigator !== 'undefined' ? navigator.userAgent : 'pos-node' }).then(() => { }).catch(() => { });
        } catch { }
        if (payload.eventType === 'INSERT') {
          setNewSalesCount(c => c + 1);
        }
        scheduleRefresh();
      });

      const invMovSub = realtimeService.subscribeToInventoryMovementsGlobal((payload) => {
        // Movimientos de inventario (SALE/RETURN/ADJUSTMENT)
        setLastUpdate(new Date());
        try {
          const entityId = payload.new?.id || payload.old?.id;
          supabase.from('sync_acks').insert({ entity: 'inventory_movements', entity_id: String(entityId || ''), event: payload.eventType, node_id: typeof navigator !== 'undefined' ? navigator.userAgent : 'pos-node' }).then(() => { }).catch(() => { });
        } catch { }
        scheduleRefresh();
      });

      // Suscripción a cambios en Productos (Precios, Nombres, etc.)
      const productsSub = realtimeService.subscribeToTable('products', (_payload) => {
        setLastUpdate(new Date());
        scheduleRefresh();
      });

      // Promociones: invalidar cachés locales y refrescar listado activo
      const store = usePOSStore.getState();
      const invalidatePromotionsCaches = () => {
        try {
          store.invalidate('promotions:list:{}');
          store.invalidate('promotions:list:{"status":"active"}');
          store.invalidate('promotions:list:{"status":"inactive"}');
          store.invalidate('promotions:list:{"status":"all"}');
        } catch { }
      };

      const promotionsSub = realtimeService.subscribeToTable<any>('promotions', (_payload) => {
        setLastUpdate(new Date());
        invalidatePromotionsCaches();
        // Refrescar activas para el POS
        store.fetchPromotions({ status: 'active' }).catch(() => { });
      });

      const promotionsProductsSub = realtimeService.subscribeToTable<any>('promotions_products', (_payload) => {
        setLastUpdate(new Date());
        invalidatePromotionsCaches();
        store.fetchPromotions({ status: 'active' }).catch(() => { });
      });

      const couponsSub = realtimeService.subscribeToTable<any>('coupons', (_payload) => {
        setLastUpdate(new Date());
        try {
          store.invalidate('coupons:list:{}');
          store.invalidate('coupons:list:{"status":"active"}');
        } catch { }
      });

      const couponUsagesSub = realtimeService.subscribeToTable<any>('coupon_usages', (_payload) => {
        setLastUpdate(new Date());
        try {
          store.invalidate('coupons:list:{}');
        } catch { }
      });

      const rolesSub = realtimeService.subscribeToRoles((_payload) => {
        setLastUpdate(new Date());
        try { usePOSStore.getState().invalidate('session'); } catch { }
      });

      const permissionsSub = realtimeService.subscribeToPermissions((_payload) => {
        setLastUpdate(new Date());
        try { usePOSStore.getState().invalidate('session'); } catch { }
      });

      setIsConnected(true);
      setStatus('connected');

      return () => {
        // Cleanup suscripciones y timers
        try {
          realtimeService.unsubscribe('sales');
          // Cancelar canales globales usados por el hook
          realtimeService.unsubscribe('global-sale-items');
          realtimeService.unsubscribe('global-inventory-movements');
          realtimeService.unsubscribe('table-sale_items-changes');
          // Promociones
          realtimeService.unsubscribe('table-promotions-changes');
          realtimeService.unsubscribe('table-promotions_products-changes');
          realtimeService.unsubscribe('table-coupons-changes');
          realtimeService.unsubscribe('table-coupon_usages-changes');
          realtimeService.unsubscribe('roles');
          realtimeService.unsubscribe('permissions');
        } catch (err) {
          console.warn('Error unsubscribing realtime channels:', err);
        }
        if (refreshTimerRef.current) {
          clearTimeout(refreshTimerRef.current);
          refreshTimerRef.current = null;
        }
        mountedRef.current = false;
      };
    } catch (error) {
      console.error('Error initializing POS realtime subscriptions:', error);
      setStatus('error');
      setIsConnected(false);
    }
  }, [scheduleRefresh]);

  return {
    isConnected,
    status,
    lastUpdate,
    newSalesCount,
    notificationsEnabled,
    refresh,
    toggleNotifications,
    markSalesAsViewed,
  };
}