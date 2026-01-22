import { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { PERFORMANCE_CONFIG, QUERY_OPTIMIZATIONS } from '@/config/performance';

// Hook personalizado para optimizaciones del dashboard de clientes
export const useCustomerOptimizations = () => {
  const cacheRef = useRef<Map<string, { data: any; timestamp: number }>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);

  // Función para limpiar caché expirado
  const cleanExpiredCache = useCallback(() => {
    const now = Date.now();
    const entries = Array.from(cacheRef.current.entries());
    
    entries.forEach(([key, value]) => {
      const isExpired = now - value.timestamp > PERFORMANCE_CONFIG.CACHE.CUSTOMERS_TTL;
      if (isExpired) {
        cacheRef.current.delete(key);
      }
    });
  }, []);

  // Función para obtener datos del caché
  const getCachedData = useCallback((key: string) => {
    cleanExpiredCache();
    const cached = cacheRef.current.get(key);
    
    if (cached) {
      const isExpired = Date.now() - cached.timestamp > PERFORMANCE_CONFIG.CACHE.CUSTOMERS_TTL;
      if (!isExpired) {
        return cached.data;
      }
      cacheRef.current.delete(key);
    }
    return null;
  }, [cleanExpiredCache]);

  // Función para guardar datos en caché
  const setCachedData = useCallback((key: string, data: any) => {
    cacheRef.current.set(key, {
      data,
      timestamp: Date.now()
    });
  }, []);

  // Debounce para búsquedas
  const useDebounce = (value: string, delay: number) => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);

      return () => {
        clearTimeout(handler);
      };
    }, [value, delay]);

    return debouncedValue;
  };

  // Función para cancelar requests anteriores
  const cancelPreviousRequests = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    return abortControllerRef.current.signal;
  }, []);

  // Optimización de consultas con campos específicos
  const optimizeQuery = useCallback((baseQuery: any, type: 'customers' | 'stats') => {
    const fields = type === 'customers' 
      ? QUERY_OPTIMIZATIONS.CUSTOMERS_FIELDS
      : QUERY_OPTIMIZATIONS.CUSTOMER_STATS_FIELDS;
    
    return baseQuery.select(fields);
  }, []);

  // Función para crear clave de caché
  const createCacheKey = useCallback((prefix: string, params: Record<string, any>) => {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {} as Record<string, any>);
    
    return `${prefix}_${JSON.stringify(sortedParams)}`;
  }, []);

  // Intersection Observer para lazy loading
  const useIntersectionObserver = (callback: () => void) => {
    const targetRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const target = targetRef.current;
      if (!target) return;

      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            callback();
          }
        },
        { threshold: PERFORMANCE_CONFIG.LAZY_LOADING.INTERSECTION_THRESHOLD }
      );

      observer.observe(target);

      return () => {
        observer.unobserve(target);
      };
    }, [callback]);

    return targetRef;
  };

  // Función para batch de operaciones
  const batchOperations = useCallback(async (operations: Promise<any>[]) => {
    const maxConcurrent = PERFORMANCE_CONFIG.PAGINATION.MAX_CONCURRENT_QUERIES;
    const results = [];
    
    for (let i = 0; i < operations.length; i += maxConcurrent) {
      const batch = operations.slice(i, i + maxConcurrent);
      const batchResults = await Promise.allSettled(batch);
      results.push(...batchResults);
    }
    
    return results;
  }, []);

  // Limpiar caché al desmontar
  useEffect(() => {
    const cacheMap = cacheRef.current;
    const controller = abortControllerRef.current;
    return () => {
      cacheMap.clear();
      if (controller) {
        controller.abort();
      }
    };
  }, []);

  return {
    getCachedData,
    setCachedData,
    useDebounce,
    cancelPreviousRequests,
    optimizeQuery,
    createCacheKey,
    useIntersectionObserver,
    batchOperations,
    cleanExpiredCache
  };
};

// Hook para métricas de rendimiento
export const usePerformanceMetrics = () => {
  const metricsRef = useRef<Map<string, number>>(new Map());

  const startTimer = useCallback((operation: string) => {
    metricsRef.current.set(operation, performance.now());
  }, []);

  const endTimer = useCallback((operation: string) => {
    const startTime = metricsRef.current.get(operation);
    if (startTime) {
      const duration = performance.now() - startTime;
      metricsRef.current.delete(operation);
      
      // Log si excede el objetivo de rendimiento
      const target = PERFORMANCE_CONFIG.PERFORMANCE_TARGETS[operation as keyof typeof PERFORMANCE_CONFIG.PERFORMANCE_TARGETS];
      if (target && duration > target) {
        console.warn(`Performance warning: ${operation} took ${duration.toFixed(2)}ms (target: ${target}ms)`);
      }
      
      return duration;
    }
    return 0;
  }, []);

  const getMetrics = useCallback(() => {
    return Object.fromEntries(metricsRef.current);
  }, []);

  return {
    startTimer,
    endTimer,
    getMetrics
  };
};
