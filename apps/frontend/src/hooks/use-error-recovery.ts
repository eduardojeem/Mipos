'use client';

import { useState, useCallback, useRef } from 'react';

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryCondition?: (error: any) => boolean;
}

export interface RecoveryStrategy {
  name: string;
  description: string;
  action: () => Promise<void>;
  priority: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryCondition: (error) => {
    // Reintentar para errores de red y errores del servidor 5xx
    if (error?.code === 'NETWORK_ERROR') return true;
    if (error?.status >= 500 && error?.status < 600) return true;
    if (error?.message?.includes('fetch')) return true;
    return false;
  }
};

export function useErrorRecovery() {
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryAttempts, setRecoveryAttempts] = useState(0);
  const [lastError, setLastError] = useState<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const calculateDelay = (attempt: number, config: RetryConfig): number => {
    const delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt);
    return Math.min(delay, config.maxDelay);
  };

  const executeWithRetry = useCallback(async <T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {}
  ): Promise<T> => {
    const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
    let lastError: any;

    for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
      try {
        // Cancelar si hay una operación de recuperación en curso
        if (abortControllerRef.current?.signal.aborted) {
          throw new Error('Operation cancelled');
        }

        const result = await operation();
        
        // Resetear contadores en caso de éxito
        if (attempt > 0) {
          setRecoveryAttempts(0);
          setLastError(null);
        }
        
        return result;
      } catch (error) {
        lastError = error;
        setLastError(error);

        // No reintentar si es el último intento
        if (attempt === finalConfig.maxRetries) {
          break;
        }

        // Verificar si debemos reintentar
        if (finalConfig.retryCondition && !finalConfig.retryCondition(error)) {
          break;
        }

        // Calcular delay y esperar
        const delay = calculateDelay(attempt, finalConfig);
        setRecoveryAttempts(attempt + 1);
        
        console.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error);
        await sleep(delay);
      }
    }

    throw lastError;
  }, []);

  const executeRecoveryStrategy = useCallback(async (
    strategies: RecoveryStrategy[]
  ): Promise<boolean> => {
    if (isRecovering) return false;

    setIsRecovering(true);
    abortControllerRef.current = new AbortController();

    try {
      // Ordenar estrategias por prioridad
      const sortedStrategies = [...strategies].sort((a, b) => b.priority - a.priority);

      for (const strategy of sortedStrategies) {
        if (abortControllerRef.current.signal.aborted) {
          return false;
        }

        try {
          console.log(`Executing recovery strategy: ${strategy.name}`);
          await strategy.action();
          
          // Si la estrategia fue exitosa, resetear estado
          setRecoveryAttempts(0);
          setLastError(null);
          return true;
        } catch (error) {
          console.warn(`Recovery strategy "${strategy.name}" failed:`, error);
          continue;
        }
      }

      return false;
    } finally {
      setIsRecovering(false);
      abortControllerRef.current = null;
    }
  }, [isRecovering]);

  const cancelRecovery = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsRecovering(false);
  }, []);

  const createNetworkRecoveryStrategies = useCallback((
    refreshData: () => Promise<void>,
    fallbackData?: () => Promise<void>
  ): RecoveryStrategy[] => {
    return [
      {
        name: 'refresh-data',
        description: 'Refrescar datos desde el servidor',
        priority: 100,
        action: refreshData
      },
      ...(fallbackData ? [{
        name: 'fallback-data',
        description: 'Cargar datos de respaldo',
        priority: 50,
        action: fallbackData
      }] : []),
      {
        name: 'clear-cache',
        description: 'Limpiar caché del navegador',
        priority: 25,
        action: async () => {
          if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(
              cacheNames.map(cacheName => caches.delete(cacheName))
            );
          }
        }
      }
    ];
  }, []);

  const createValidationRecoveryStrategies = useCallback((
    resetForm: () => void,
    loadDefaults: () => Promise<void>
  ): RecoveryStrategy[] => {
    return [
      {
        name: 'reset-form',
        description: 'Resetear formulario a valores por defecto',
        priority: 100,
        action: async () => resetForm()
      },
      {
        name: 'load-defaults',
        description: 'Cargar valores por defecto desde el servidor',
        priority: 75,
        action: loadDefaults
      }
    ];
  }, []);

  const createServerRecoveryStrategies = useCallback((
    retryOperation: () => Promise<void>,
    switchToOfflineMode?: () => Promise<void>
  ): RecoveryStrategy[] => {
    return [
      {
        name: 'retry-operation',
        description: 'Reintentar operación',
        priority: 100,
        action: retryOperation
      },
      ...(switchToOfflineMode ? [{
        name: 'offline-mode',
        description: 'Cambiar a modo offline',
        priority: 50,
        action: switchToOfflineMode
      }] : []),
      {
        name: 'reload-page',
        description: 'Recargar página completa',
        priority: 25,
        action: async () => {
          window.location.reload();
        }
      }
    ];
  }, []);

  return {
    isRecovering,
    recoveryAttempts,
    lastError,
    executeWithRetry,
    executeRecoveryStrategy,
    cancelRecovery,
    createNetworkRecoveryStrategies,
    createValidationRecoveryStrategies,
    createServerRecoveryStrategies
  };
}