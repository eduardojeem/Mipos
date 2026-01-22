import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/utils';
import type { Sale } from '@/types';
import { realtimeService } from '@/lib/supabase-realtime';
import { isSupabaseActive } from '@/lib/env';

interface UseRealTimeSalesOptions {
  enabled?: boolean;
  interval?: number; // en milisegundos
  onNewSale?: (sale: Sale) => void;
  onSaleUpdate?: (sale: Sale) => void;
  page?: number;
  limit?: number;
  filters?: {
    customerId?: string;
    paymentMethod?: string;
    status?: string;
    saleType?: string;
    dateFrom?: string;
    dateTo?: string;
    amountRange?: string;
    discountRange?: string;
    itemCountRange?: string;
    couponCode?: string;
    hasCoupon?: 'yes' | 'no';
  };
}

interface ServerPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface UseRealTimeSalesReturn {
  sales: Sale[];
  isConnected: boolean;
  lastUpdate: Date | null;
  newSalesCount: number;
  refreshSales: () => Promise<void>;
  markAsViewed: () => void;
  isLoading: boolean;
  dataSource: 'supabase' | 'backend' | 'mock' | 'unknown';
  serverPagination: ServerPagination | null;
}

export const useRealTimeSales = (
  options: UseRealTimeSalesOptions = {}
): UseRealTimeSalesReturn => {
  const {
    enabled = true,
    interval = 30000, // 30 segundos por defecto
    onNewSale,
    onSaleUpdate,
    page = 1,
    limit = 50,
    filters = {}
  } = options;

  const [sales, setSales] = useState<Sale[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [newSalesCount, setNewSalesCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [dataSource, setDataSource] = useState<'supabase' | 'backend' | 'mock' | 'unknown'>('unknown');
  const [serverPagination, setServerPagination] = useState<ServerPagination | null>(null);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSalesRef = useRef<Sale[]>([]);
  const retryCountRef = useRef(0);
  const maxRetries = 5; // Aumentamos los reintentos
  const baseDelay = 2000; // 2 segundos base (más conservador)
  const maxDelay = 60000; // Máximo 60 segundos de espera
  const lastErrorTimeRef = useRef<number>(0);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fetchAbortControllerRef = useRef<AbortController | null>(null);
  const isFetchingRef = useRef<boolean>(false);
  // Deduplicación y caché breve (SWR-like)
  const inflightRequestsRef = useRef<Map<string, Promise<{ sales: Sale[]; pagination: ServerPagination | null }>>>(new Map());
  const responseCacheRef = useRef<Map<string, { result: { sales: Sale[]; pagination: ServerPagination | null }; expiresAt: number }>>(new Map());
  const cacheTTLRef = useRef<number>(5000); // 5s de TTL para respuesta reciente
  const currentRequestKeyRef = useRef<string | null>(null);

  // Mantener callbacks del consumidor en refs para evitar recrear updateSales en cada render
  const onNewSaleRef = useRef<UseRealTimeSalesOptions['onNewSale']>(undefined);
  const onSaleUpdateRef = useRef<UseRealTimeSalesOptions['onSaleUpdate']>(undefined);
  useEffect(() => { onNewSaleRef.current = onNewSale; }, [onNewSale]);
  useEffect(() => { onSaleUpdateRef.current = onSaleUpdate; }, [onSaleUpdate]);

  // Mantener page/limit actuales en refs para evitar recrear callbacks
  const pageRef = useRef<number>(page);
  const limitRef = useRef<number>(limit);
  const filtersRef = useRef<UseRealTimeSalesOptions['filters']>({});
  pageRef.current = page;
  limitRef.current = limit;
  filtersRef.current = filters ?? {};

  // Función para obtener las ventas del servidor con retry y rate limiting
  const fetchSales = useCallback(async (): Promise<{ sales: Sale[]; pagination: ServerPagination | null }> => {
    try {
      const currentPage = pageRef.current ?? 1;
      const currentLimit = limitRef.current ?? 50;
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(currentLimit)
      });
      const f = filtersRef.current || {};
      // Map filters to API expected snake_case names
      if (f.customerId) params.set('customer_id', f.customerId);
      // Normalizar a mayúsculas para coincidir con backend/Supabase
      if (f.paymentMethod) params.set('payment_method', String(f.paymentMethod).toUpperCase());
      if (f.status) params.set('status', String(f.status).toUpperCase());
      if (f.saleType) params.set('sale_type', String(f.saleType).toUpperCase());
      if (f.dateFrom) params.set('date_from', f.dateFrom);
      if (f.dateTo) params.set('date_to', f.dateTo);
      // Parse amountRange like "0-100" or "500+" into min/max numbers
      if (f.amountRange) {
        const r = String(f.amountRange).trim();
        if (r.endsWith('+')) {
          const min = Number(r.slice(0, -1));
          if (!Number.isNaN(min)) params.set('min_amount', String(min));
        } else if (r.includes('-')) {
          const [minStr, maxStr] = r.split('-');
          const min = Number(minStr);
          const max = Number(maxStr);
          if (!Number.isNaN(min)) params.set('min_amount', String(min));
          if (!Number.isNaN(max)) params.set('max_amount', String(max));
        }
      }
      // Discount range to min/max
      if (f.discountRange) {
        const r = String(f.discountRange).trim();
        if (r.endsWith('+')) {
          const min = Number(r.slice(0, -1));
          if (!Number.isNaN(min)) params.set('min_discount', String(min));
        } else if (r.includes('-')) {
          const [minStr, maxStr] = r.split('-');
          const min = Number(minStr);
          const max = Number(maxStr);
          if (!Number.isNaN(min)) params.set('min_discount', String(min));
          if (!Number.isNaN(max)) params.set('max_discount', String(max));
        } else if (/^\d+$/.test(r)) {
          const exact = Number(r);
          params.set('min_discount', String(exact));
          params.set('max_discount', String(exact));
        }
      }
      // Coupon filters
      if (f.couponCode) params.set('coupon_code', String(f.couponCode));
      if (f.hasCoupon) params.set('has_coupon', f.hasCoupon === 'yes' ? 'true' : 'false');
      // Item count range: server may or may not support; pass min/max for backend
      if (f.itemCountRange) {
        const r = String(f.itemCountRange).trim();
        if (r.endsWith('+')) {
          const min = Number(r.slice(0, -1));
          if (!Number.isNaN(min)) params.set('min_items', String(min));
        } else if (r.includes('-')) {
          const [minStr, maxStr] = r.split('-');
          const min = Number(minStr);
          const max = Number(maxStr);
          if (!Number.isNaN(min)) params.set('min_items', String(min));
          if (!Number.isNaN(max)) params.set('max_items', String(max));
        } else if (/^\d+$/.test(r)) {
          const exact = Number(r);
          params.set('min_items', String(exact));
          params.set('max_items', String(exact));
        }
      }

      const requestUrl = `/api/sales?${params.toString()}`;

      // Caché breve: devolver inmediatamente datos recientes si no han expirado
      const cached = responseCacheRef.current.get(requestUrl);
      const now = Date.now();
      if (cached && cached.expiresAt > now) {
        return cached.result;
      }

      // Si ya hay una solicitud en curso para la misma URL, reutilizarla
      const inflight = inflightRequestsRef.current.get(requestUrl);
      if (inflight) {
        return await inflight;
      }

      // Cancelar la petición anterior solo si es para una URL diferente
      if (fetchAbortControllerRef.current && currentRequestKeyRef.current && currentRequestKeyRef.current !== requestUrl) {
        try { fetchAbortControllerRef.current.abort(); } catch { /* no-op */ }
      }
      const controller = new AbortController();
      fetchAbortControllerRef.current = controller;
      currentRequestKeyRef.current = requestUrl;

      const fetchPromise = (async (): Promise<{ sales: Sale[]; pagination: ServerPagination | null }> => {
        const response = await fetch(requestUrl , {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        });

        if (!response.ok) {
          // Si es un error 429 (rate limit), implementar exponential backoff mejorado
          if (response.status === 429) {
            retryCountRef.current += 1;
          
          if (retryCountRef.current <= maxRetries) {
            // Calcular delay con exponential backoff y jitter
            const exponentialDelay = baseDelay * Math.pow(2, retryCountRef.current - 1);
            const jitter = Math.random() * 1000; // Jitter de 0-1 segundo
            const delay = Math.min(exponentialDelay + jitter, maxDelay);
            
            console.warn(`Rate limit hit, retrying in ${Math.round(delay)}ms (attempt ${retryCountRef.current}/${maxRetries})`);
            
            // Registrar el tiempo del último error
            lastErrorTimeRef.current = Date.now();
            
            await new Promise(resolve => setTimeout(resolve, delay));
            // Reintento: eliminar entrada inflight previa para esta URL
            inflightRequestsRef.current.delete(requestUrl);
            return fetchSales(); // Retry recursively
          } else {
            // Si se agotaron los reintentos, esperar más tiempo antes de resetear
            const timeSinceLastError = Date.now() - lastErrorTimeRef.current;
            const cooldownPeriod = 5 * 60 * 1000; // 5 minutos de cooldown
            
            if (timeSinceLastError < cooldownPeriod) {
              console.warn(`Rate limit exceeded. Entering cooldown period.`);
              throw new Error(`Rate limit exceeded. Please wait ${Math.round((cooldownPeriod - timeSinceLastError) / 1000)} seconds before retrying.`);
            }
            
            retryCountRef.current = 0; // Reset counter después del cooldown
            throw new Error(`Rate limit exceeded after ${maxRetries} retries`);
          }
        }

        // Dev-only fallback: treat 5xx/404/401/403 as empty to keep UI stable
        const isDev = typeof process !== 'undefined' && process.env.NODE_ENV !== 'production';
        if (isDev && (response.status >= 500 || response.status === 404 || response.status === 401 || response.status === 403)) {
          console.warn(`Dev fallback: treating ${response.status} as empty sales`);
          return { sales: lastSalesRef.current, pagination: serverPagination };
        }
        
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Reset retry counter on successful request
      retryCountRef.current = 0;
      
      const src = (response.headers.get('X-Data-Source') || 'unknown') as 'supabase'|'backend'|'mock'|'unknown';
      setDataSource(src);
      const data = await response.json();
      const sales: Sale[] = data.sales || [];
      const pagination: ServerPagination | null = data.pagination || null;
      const result = { sales, pagination };
      // Guardar en caché con TTL
      responseCacheRef.current.set(requestUrl, { result, expiresAt: now + cacheTTLRef.current });
      return result;
    })();

      inflightRequestsRef.current.set(requestUrl, fetchPromise);
      try {
        const res = await fetchPromise;
        return res;
      } catch (error) {
        throw error;
      } finally {
        // Limpiar la entrada inflight al finalizar
        inflightRequestsRef.current.delete(requestUrl);
      }
    } catch (error) {
      // Evitar ruido de consola para abortos/transitorios; reportar solo errores reales
      const err = error as any;
      const msg = (err?.message || '').toString();
      const isAbortError = err?.name === 'AbortError' || msg.includes('AbortError') || msg.includes('ERR_ABORTED');
      const isNetworkFetchError = msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('ERR_NETWORK') || err instanceof TypeError;
      if (!isAbortError && !isNetworkFetchError) {
        console.error('Error fetching sales:', error);
      }

      // Manejo más graceful de errores
      if (error instanceof Error) {
        // Si la petición fue abortada por el navegador/React Strict Mode, manejarlo silenciosamente
        const isAbort = (error as any).name === 'AbortError' || (error as any).message?.includes('AbortError') || (error as any).message?.includes('ERR_ABORTED');
        const isNetErr = (error as any).message?.includes('Failed to fetch') || (error as any).message?.includes('NetworkError') || (error as any).message?.includes('ERR_NETWORK') || error instanceof TypeError;

        if (isAbort || isNetErr) {
          // Devolver las últimas ventas conocidas sin propagar el error para evitar toasts
          console.warn('Fetch de ventas abortado/transitorio; usando datos anteriores');
          return { sales: lastSalesRef.current, pagination: serverPagination };
        }

        // Si es un error de rate limit, no resetear el contador inmediatamente
        if (error.message.includes('Rate limit')) {
          // El contador se mantendrá para el próximo intento
          throw error;
        }

        // Para otros errores, resetear el contador después de un tiempo
        setTimeout(() => {
          retryCountRef.current = 0;
        }, 30000); // Reset después de 30 segundos
      }

      // Propagar errores no transitorios para que updateSales maneje adecuadamente
      throw error;
    }
  }, [serverPagination]);

  // Función para detectar nuevas ventas
  const detectNewSales = useCallback((newSales: Sale[], previousSales: Sale[]) => {
    const previousIds = new Set(previousSales.map(sale => sale.id));
    return newSales.filter(sale => !previousIds.has(sale.id));
  }, []);

  // Función para detectar ventas actualizadas
  const detectUpdatedSales = useCallback((newSales: Sale[], previousSales: Sale[]) => {
    const previousSalesMap = new Map(previousSales.map(sale => [sale.id, sale]));
    
    return newSales.filter(sale => {
      const previousSale = previousSalesMap.get(sale.id);
      if (!previousSale) return false;
      
      // Comparar campos relevantes para detectar cambios
      return (
        previousSale.status !== sale.status ||
        previousSale.total_amount !== sale.total_amount ||
        previousSale.payment_method !== sale.payment_method
      );
    });
  }, []);

  // Función principal para actualizar las ventas
  const updateSales = useCallback(async () => {
    if (!enabled) return;

    // Gate de concurrencia: evitar iniciar una nueva si hay una en curso
    if (isFetchingRef.current) {
      if (!refreshTimerRef.current) {
        refreshTimerRef.current = setTimeout(() => {
          if (enabled) updateSales();
          refreshTimerRef.current = null;
        }, 500);
      }
      return;
    }

    isFetchingRef.current = true;

    try {
      setIsConnected(true);
      const result = await fetchSales();
      const newSales = result.sales;
      const previousSales = lastSalesRef.current;

      // Detectar nuevas ventas
      const newSalesDetected = detectNewSales(newSales, previousSales);
      if (newSalesDetected.length > 0) {
        setNewSalesCount(prev => prev + newSalesDetected.length);

        newSalesDetected.forEach(sale => {
          onNewSaleRef.current?.(sale);
        });

        const count = newSalesDetected.length;
        const total = newSalesDetected.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
        const pm = String(newSalesDetected[0]?.payment_method || '').toUpperCase();
        toast({
          title: count === 1 ? "Nueva venta registrada" : "Nuevas ventas",
          description: count === 1
            ? `Venta #${newSalesDetected[0]?.id} por ${formatCurrency(total)} — ${pm}`
            : `${count} nuevas ventas — total ${formatCurrency(total)}`,
        });
      }

      // Detectar ventas actualizadas
      const updatedSales = detectUpdatedSales(newSales, previousSales);
      updatedSales.forEach(sale => {
        onSaleUpdateRef.current?.(sale);
      });

      setSales(newSales);
      lastSalesRef.current = newSales;
      setLastUpdate(new Date());
      setServerPagination(result.pagination || null);

    } catch (error) {
      // Evitar toasts y logs destructivos en abortos/transitorios
      const err = error as any;
      const msg = (err?.message || '').toString();
      const isAbortError = err?.name === 'AbortError' || msg.includes('AbortError') || msg.includes('ERR_ABORTED');
      const isNetworkError = msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('ERR_NETWORK') || err instanceof TypeError;
      if (!isAbortError && !isNetworkError) {
        console.error('Error updating sales:', error);
      } else {
        console.warn('Actualización de ventas abortada/transitoria; manteniendo datos anteriores');
      }
      setIsConnected(false);
      
      // Manejo más específico de errores
      const isRateLimit = error instanceof Error && error.message.includes('Rate limit');
      
      // Solo mostrar toast si no es un error de rate limit durante cooldown
      // No mostrar toast para abortos/transitorios
      if (!isAbortError && (!isRateLimit || !error.message.includes('Please wait'))) {
        toast({
          title: isRateLimit ? "Límite de solicitudes alcanzado" : 
                 isNetworkError ? "Error de red" : "Error de conexión",
          description: isRateLimit 
            ? "Demasiadas solicitudes. La actualización se reanudará automáticamente."
            : isNetworkError
            ? "Problema de conectividad. Verificando conexión..."
            : "No se pudo actualizar la información de ventas",
          variant: "destructive",
          duration: isRateLimit ? 8000 : 3000,
        });
      }
      
      // Si es un error de rate limit, pausar las actualizaciones temporalmente
      if (isRateLimit && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        
        // Reanudar después de un tiempo
        setTimeout(() => {
          if (enabled) {
            const jitter = Math.random() * 5000;
            const adjustedInterval = interval + jitter;
            intervalRef.current = setInterval(() => updateSales(), adjustedInterval);
          }
        }, 60000); // Reanudar después de 1 minuto
      }
    } finally {
      isFetchingRef.current = false;
    }
  }, [enabled, interval, fetchSales, detectNewSales, detectUpdatedSales]);

  // Debounce para refrescar por eventos realtime
  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    refreshTimerRef.current = setTimeout(() => {
      if (enabled) updateSales();
      refreshTimerRef.current = null;
    }, 3000);
  }, [enabled, updateSales]);

  // Suscripción a Supabase Realtime (fallback a polling si no activo)
  useEffect(() => {
    if (!enabled) return;
    if (!isSupabaseActive()) return;

    let subscription: any = null;
    try {
      subscription = realtimeService.subscribeToSales(() => {
        setLastUpdate(new Date());
        setIsConnected(true);
        scheduleRefresh();
      });
    } catch (err) {
      console.warn('Failed to establish realtime subscription for sales:', err);
    }

    return () => {
      try {
        realtimeService.unsubscribe('sales');
      } catch { /* no-op */ }
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [enabled, scheduleRefresh]);

  // Función para refrescar manualmente
  const refreshSales = useCallback(async () => {
    setIsLoading(true);
    try {
      await updateSales();
    } finally {
      setIsLoading(false);
    }
  }, [updateSales]);

  // Función para marcar las nuevas ventas como vistas
  const markAsViewed = useCallback(() => {
    setNewSalesCount(0);
  }, []);

  // Configurar el intervalo de actualización
  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Cargar datos iniciales
    updateSales();

    // Configurar intervalo con jitter para evitar thundering herd
    const jitter = Math.random() * 5000; // 0-5 segundos de jitter
    const adjustedInterval = interval + jitter;
    
    intervalRef.current = setInterval(updateSales, adjustedInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, interval, updateSales]);

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      if (fetchAbortControllerRef.current) {
        try { fetchAbortControllerRef.current.abort(); } catch { /* no-op */ }
        fetchAbortControllerRef.current = null;
      }
    };
  }, []);

  return {
    sales,
    isConnected,
    lastUpdate,
    newSalesCount,
    refreshSales,
    markAsViewed,
    isLoading,
    dataSource,
    serverPagination,
  };
};

// Hook adicional para notificaciones de escritorio
export const useDesktopNotifications = (p0: { onPermissionChange: (permission: any) => void; }) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    }
    return permission;
  }, [permission]);

  const showNotification = useCallback((title: string, options?: NotificationOptions) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      return new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options
      });
    }
    return null;
  }, []);

  return {
    permission,
    requestPermission,
    showNotification,
    isSupported: 'Notification' in window
  };
};
