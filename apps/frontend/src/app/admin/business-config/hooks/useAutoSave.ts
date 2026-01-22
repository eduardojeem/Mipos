'use client';

import { useEffect, useRef, useState } from 'react';
import { useDebouncedCallback } from './useDebounce';
import { BusinessConfig } from '@/types/business-config';

interface UseAutoSaveOptions {
  enabled: boolean;
  delay: number; // ms
  onSave: (config: BusinessConfig) => Promise<{ persisted: boolean }>;
  onError?: (error: Error) => void;
}

interface UseAutoSaveReturn {
  isSaving: boolean;
  lastSaved: Date | null;
  saveCount: number;
  forceSave: () => Promise<void>;
}

/**
 * Hook para guardado automático inteligente
 * - Debounce para evitar guardados excesivos
 * - Tracking de estado de guardado
 * - Manejo de errores
 */
export function useAutoSave(
  config: BusinessConfig,
  options: UseAutoSaveOptions
): UseAutoSaveReturn {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveCount, setSaveCount] = useState(0);
  const lastConfigRef = useRef<BusinessConfig>(config);
  const isInitialMount = useRef(true);

  const performSave = async (configToSave: BusinessConfig) => {
    if (isSaving) return;

    try {
      setIsSaving(true);
      const result = await options.onSave(configToSave);
      
      if (result.persisted) {
        setLastSaved(new Date());
        setSaveCount(prev => prev + 1);
        lastConfigRef.current = configToSave;
      }
    } catch (error) {
      console.error('Auto-save error:', error);
      options.onError?.(error as Error);
    } finally {
      setIsSaving(false);
    }
  };

  const debouncedSave = useDebouncedCallback(performSave, options.delay);

  // Detectar cambios y activar auto-guardado
  useEffect(() => {
    // Skip en el primer render
    if (isInitialMount.current) {
      isInitialMount.current = false;
      lastConfigRef.current = config;
      return;
    }

    // Solo guardar si está habilitado y hay cambios reales
    if (options.enabled && JSON.stringify(config) !== JSON.stringify(lastConfigRef.current)) {
      debouncedSave(config);
    }
  }, [config, options.enabled, debouncedSave]);

  const forceSave = async () => {
    await performSave(config);
  };

  return {
    isSaving,
    lastSaved,
    saveCount,
    forceSave
  };
}