'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { 
  UnifiedState, 
  UnifiedError, 
  LoadingConfig,
  createNetworkError,
  createValidationError,
  createServerError,
  createPermissionError
} from '@/components/ui/unified-error-loading';

export interface RetryConfig {
  maxRetries?: number;
  retryDelay?: number;
  backoffMultiplier?: number;
  retryCondition?: (error: any, attempt: number) => boolean;
}

export interface CacheConfig {
  key?: string;
  ttl?: number; // Time to live in milliseconds
  staleWhileRevalidate?: boolean;
}

export interface UnifiedErrorLoadingOptions {
  retry?: RetryConfig;
  cache?: CacheConfig;
  onStateChange?: (state: UnifiedState) => void;
  onError?: (error: UnifiedError) => void;
  onSuccess?: (data: any) => void;
}

const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  retryDelay: 1000,
  backoffMultiplier: 2,
  retryCondition: (error, attempt) => {
    // Retry on network errors and 5xx server errors
    return (
      error?.code === 'NETWORK_ERROR' ||
      error?.status >= 500 ||
      error?.message?.includes('fetch') ||
      error?.message?.includes('timeout')
    ) && attempt < 3;
  }
};

const DEFAULT_CACHE_CONFIG: Required<CacheConfig> = {
  key: '',
  ttl: 5 * 60 * 1000, // 5 minutes
  staleWhileRevalidate: true
};

// Cache simple en memoria
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

export function useUnifiedErrorLoading<T = any>(options: UnifiedErrorLoadingOptions = {}) {
  const [state, setState] = useState<UnifiedState>('idle');
  const [error, setError] = useState<UnifiedError | null>(null);
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<LoadingConfig>({});
  
  const retryCountRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { retry: retryOpt, cache: cacheOpt, onStateChange, onError, onSuccess } = options;
  const retryConfig = useMemo(() => ({ ...DEFAULT_RETRY_CONFIG, ...retryOpt }), [retryOpt]);
  const cacheConfig = useMemo(() => ({ ...DEFAULT_CACHE_CONFIG, ...cacheOpt }), [cacheOpt]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // State change callback
  useEffect(() => {
    if (onStateChange) {
      onStateChange(state);
    }
  }, [state, onStateChange]);

  const getCachedData = useCallback((key: string) => {
    if (!key) return null;
    
    const cached = cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    const isExpired = now - cached.timestamp > cached.ttl;
    
    if (isExpired && !cacheConfig.staleWhileRevalidate) {
      cache.delete(key);
      return null;
    }

    return {
      data: cached.data,
      isStale: isExpired
    };
  }, [cacheConfig.staleWhileRevalidate]);

  const setCachedData = useCallback((key: string, data: any) => {
    if (!key) return;
    
    cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: cacheConfig.ttl
    });
  }, [cacheConfig.ttl]);

  const setLoadingState = useCallback((config?: LoadingConfig) => {
    setState('loading');
    setError(null);
    setLoading(config || {});
  }, []);

  const setErrorState = useCallback((errorInfo: Omit<UnifiedError, 'id' | 'timestamp'>) => {
    const errorObj: UnifiedError = {
      ...errorInfo,
      id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };
    
    setState('error');
    setError(errorObj);
    setLoading({});
    
    if (onError) {
      onError(errorObj);
    }
  }, [onError]);

  const setSuccessState = useCallback((result?: any) => {
    setState('success');
    setError(null);
    setLoading({});
    
    if (result !== undefined) {
      setData(result as unknown as T);
      if (onSuccess) {
        onSuccess(result);
      }
    }
  }, [onSuccess]);

  const setIdleState = useCallback(() => {
    setState('idle');
    setError(null);
    setLoading({});
  }, []);

  const executeWithRetry = useCallback(async <R = any>(
    operation: (signal?: AbortSignal) => Promise<R>,
    loadingConfig?: LoadingConfig
  ): Promise<R> => {
    // Cancel previous operation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    let lastError: any;
    retryCountRef.current = 0;

    const attemptOperation = async (): Promise<R> => {
      try {
        if (retryCountRef.current === 0) {
          setLoadingState(loadingConfig);
        } else {
          setState('retrying');
          setLoading({ ...loadingConfig, message: `Reintentando... (${retryCountRef.current}/${retryConfig.maxRetries})` });
        }

        const result = await operation(signal);
        
        if (signal.aborted) {
          throw new Error('Operation was cancelled');
        }

        return result;
      } catch (err: any) {
        if (signal.aborted) {
          throw new Error('Operation was cancelled');
        }

        lastError = err;
        retryCountRef.current++;

        const shouldRetry = retryConfig.retryCondition(err, retryCountRef.current) && 
                           retryCountRef.current <= retryConfig.maxRetries;

        if (shouldRetry) {
          const delay = retryConfig.retryDelay * Math.pow(retryConfig.backoffMultiplier, retryCountRef.current - 1);
          
          await new Promise((resolve) => {
            timeoutRef.current = setTimeout(resolve, delay);
          });

          if (signal.aborted) {
            throw new Error('Operation was cancelled');
          }

          return attemptOperation();
        }

        throw err;
      }
    };

    try {
      const result = await attemptOperation();
      setSuccessState(result);
      return result;
    } catch (err: any) {
      if (err.message === 'Operation was cancelled') {
        setIdleState();
        throw err;
      }

      // Determine error type and create appropriate error
      let errorInfo: Omit<UnifiedError, 'id' | 'timestamp'>;

      if (err.code === 'NETWORK_ERROR' || err.message?.includes('fetch') || err.message?.includes('timeout')) {
        errorInfo = createNetworkError(
          err.message || 'Error de conexión',
          `Intentos realizados: ${retryCountRef.current}/${retryConfig.maxRetries}`,
          async () => { await executeWithRetry(operation, loadingConfig); }
        );
      } else if (err.status >= 400 && err.status < 500) {
        if (err.status === 403 || err.status === 401) {
          errorInfo = createPermissionError(err.message || 'No tienes permisos para realizar esta acción');
        } else if (err.status === 422 || err.status === 400) {
          errorInfo = createValidationError(err.message || 'Datos inválidos', err.context);
        } else {
          errorInfo = createNetworkError(err.message || 'Error del cliente');
        }
      } else if (err.status >= 500) {
        errorInfo = createServerError(
          err.message || 'Error del servidor',
          `Código: ${err.status}`,
          async () => { await executeWithRetry(operation, loadingConfig); }
        );
      } else {
        errorInfo = {
          type: 'unknown',
          severity: 'medium',
          message: err.message || 'Ha ocurrido un error inesperado',
          details: err.stack,
          context: { error: err },
          retryable: true,
          onRetry: async () => { await executeWithRetry(operation, loadingConfig); }
        };
      }

      setErrorState(errorInfo);
      throw err;
    }
  }, [retryConfig, setLoadingState, setSuccessState, setErrorState, setIdleState]);

  const executeWithCache = useCallback(async <R = any>(
    operation: (signal?: AbortSignal) => Promise<R>,
    loadingConfig?: LoadingConfig
  ): Promise<R> => {
    const cacheKey = cacheConfig.key;
    
    if (cacheKey) {
      const cached = getCachedData(cacheKey);
      
      if (cached && !cached.isStale) {
        // Return fresh cached data immediately
        setSuccessState(cached.data);
        return cached.data;
      }
      
      if (cached && cached.isStale && cacheConfig.staleWhileRevalidate) {
        // Return stale data immediately, but revalidate in background
        setSuccessState(cached.data);
        
        // Revalidate in background
        executeWithRetry(operation, { ...loadingConfig, variant: 'spinner', size: 'sm' })
          .then((result) => {
            setCachedData(cacheKey, result);
            setData(result as unknown as T);
          })
          .catch(() => {
            // Keep stale data on revalidation error
          });
        
        return cached.data;
      }
    }

    // No cache or cache miss - execute normally
    const result = await executeWithRetry(operation, loadingConfig);
    
    if (cacheKey) {
      setCachedData(cacheKey, result);
    }
    
    return result;
  }, [cacheConfig, getCachedData, setCachedData, executeWithRetry, setSuccessState]);

  const execute = useCallback(async <R>(
    operation: (signal?: AbortSignal) => Promise<R>,
    loadingConfig?: LoadingConfig
  ): Promise<R> => {
    if (cacheConfig.key) {
      return executeWithCache(operation, loadingConfig);
    } else {
      return executeWithRetry(operation, loadingConfig);
    }
  }, [cacheConfig.key, executeWithCache, executeWithRetry]);

  const retry = useCallback(() => {
    if (error?.onRetry) {
      return error.onRetry();
    }
  }, [error]);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIdleState();
  }, [setIdleState]);

  const clearCache = useCallback((key?: string) => {
    if (key) {
      cache.delete(key);
    } else if (cacheConfig.key) {
      cache.delete(cacheConfig.key);
    }
  }, [cacheConfig.key]);

  const clearAllCache = useCallback(() => {
    cache.clear();
  }, []);

  return {
    // State
    state,
    error,
    data,
    loading,
    
    // State checks
    isLoading: state === 'loading' || state === 'retrying',
    isError: state === 'error',
    isSuccess: state === 'success',
    isIdle: state === 'idle',
    isRetrying: state === 'retrying',
    
    // Actions
    execute,
    retry,
    cancel,
    
    // Manual state setters
    setLoadingState,
    setErrorState,
    setSuccessState,
    setIdleState,
    
    // Cache management
    clearCache,
    clearAllCache,
    
    // Utilities
    retryCount: retryCountRef.current,
    hasData: data !== null
  };
}

// Hook especializado para operaciones CRUD
export function useCrudOperations<T = any>(baseUrl: string, options: UnifiedErrorLoadingOptions = {}) {
  const {
    execute,
    state,
    error,
    data,
    isLoading,
    isError,
    isSuccess,
    retry,
    cancel
  } = useUnifiedErrorLoading<T[]>({
    ...options,
    cache: {
      key: `crud-${baseUrl}`,
      ttl: 2 * 60 * 1000, // 2 minutes
      ...options.cache
    }
  });

  const fetchAll = useCallback(async (params?: Record<string, any>) => {
    const url = new URL(baseUrl);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return execute(async (signal) => {
      const response = await fetch(url.toString(), { signal });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    }, {
      message: 'Cargando datos...',
      variant: 'spinner'
    });
  }, [baseUrl, execute]);

  const create = useCallback(async (item: Partial<T>) => {
    return execute(async (signal) => {
      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
        signal
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    }, {
      message: 'Creando...',
      variant: 'spinner'
    });
  }, [baseUrl, execute]);

  const update = useCallback(async (id: string | number, item: Partial<T>) => {
    return execute(async (signal) => {
      const response = await fetch(`${baseUrl}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
        signal
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    }, {
      message: 'Actualizando...',
      variant: 'spinner'
    });
  }, [baseUrl, execute]);

  const remove = useCallback(async (id: string | number) => {
    return execute(async (signal) => {
      const response = await fetch(`${baseUrl}/${id}`, {
        method: 'DELETE',
        signal
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response.ok;
    }, {
      message: 'Eliminando...',
      variant: 'spinner'
    });
  }, [baseUrl, execute]);

  return {
    // State
    state,
    error,
    data,
    isLoading,
    isError,
    isSuccess,
    
    // CRUD operations
    fetchAll,
    create,
    update,
    remove,
    
    // Actions
    retry,
    cancel
  };
}
