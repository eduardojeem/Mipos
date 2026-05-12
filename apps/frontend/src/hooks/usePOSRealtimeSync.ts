import { useCallback, useEffect, useRef, useState } from 'react';
import { realtimeService } from '@/lib/supabase-realtime';
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

    // ─── Canal único multiplexado para el POS ────────────────────────────────
    // Consolidamos 10 suscripciones previas en 1 canal con múltiples listeners,
    // reduciendo el consumo de conexiones WebSocket de Supabase drásticamente.
    let posChannel: ReturnType<typeof realtimeService.createPOSMultiplexedChannel> | null = null;

    try {
      setStatus('connecting');

      const store = usePOSStore.getState();

      const invalidatePromotionsCaches = () => {
        try {
          store.invalidate('promotions:list:{}');
          store.invalidate('promotions:list:{"status":"active"}');
          store.invalidate('promotions:list:{"status":"inactive"}');
          store.invalidate('promotions:list:{"status":"all"}');
        } catch { }
      };

      posChannel = realtimeService.createPOSMultiplexedChannel({
        onSaleChange: (payload) => {
          if (!mountedRef.current) return;
          setLastUpdate(new Date());
          if (payload.eventType === 'INSERT') setNewSalesCount(c => c + 1);
          scheduleRefresh();
        },
        onSaleItemChange: (payload) => {
          if (!mountedRef.current) return;
          setLastUpdate(new Date());
          if (payload.eventType === 'INSERT') setNewSalesCount(c => c + 1);
          scheduleRefresh();
        },
        onInventoryChange: (_payload) => {
          if (!mountedRef.current) return;
          setLastUpdate(new Date());
          scheduleRefresh();
        },
        onProductChange: (_payload) => {
          if (!mountedRef.current) return;
          setLastUpdate(new Date());
          scheduleRefresh();
        },
        onPromotionChange: (_payload) => {
          if (!mountedRef.current) return;
          setLastUpdate(new Date());
          invalidatePromotionsCaches();
          store.fetchPromotions({ status: 'active' }).catch(() => { });
        },
        onCouponChange: (_payload) => {
          if (!mountedRef.current) return;
          setLastUpdate(new Date());
          try {
            store.invalidate('coupons:list:{}');
            store.invalidate('coupons:list:{"status":"active"}');
          } catch { }
        },
        onRoleOrPermissionChange: (_payload) => {
          if (!mountedRef.current) return;
          setLastUpdate(new Date());
          try { usePOSStore.getState().invalidate('session'); } catch { }
        },
      });

      setIsConnected(true);
      setStatus('connected');

      return () => {
        // Un solo cleanup para el canal consolidado
        try {
          posChannel?.unsubscribe();
        } catch (err) {
          console.warn('[POS] Error al desuscribir canal:', err);
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