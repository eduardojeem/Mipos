/**
 * useCarousel Hook
 * 
 * Custom React hook for managing carousel state and operations.
 * Provides state management, validation, error handling, and API integration.
 * 
 * Requirements: 1.1, 2.2, 2.4, 3.3, 3.4
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';

/**
 * Maximum number of items allowed in carousel
 */
export const MAX_CAROUSEL_ITEMS = 10;

/**
 * Error types for carousel operations
 */
export enum CarouselErrorType {
  NETWORK_ERROR = 'network',
  VALIDATION_ERROR = 'validation',
  SERVER_ERROR = 'server',
  CONFLICT_ERROR = 'conflict',
  TIMEOUT_ERROR = 'timeout',
  PERMISSION_ERROR = 'permission',
}

/**
 * Carousel error structure
 */
export interface CarouselError {
  type: CarouselErrorType;
  message: string;
  details?: any;
  timestamp: Date;
  retryable: boolean;
}

/**
 * Hook return type
 */
export interface UseCarouselReturn {
  // State
  carouselIds: string[];
  loading: boolean;
  saving: boolean;
  error: CarouselError | null;
  hasChanges: boolean;
  
  // Validation
  canAddMore: boolean;
  isValid: boolean;
  validationErrors: string[];
  
  // Actions
  togglePromotion: (id: string) => void;
  movePromotion: (id: string, direction: 'up' | 'down') => void;
  removePromotion: (id: string) => void;
  saveCarousel: () => Promise<void>;
  revertChanges: () => void;
  refreshCarousel: () => Promise<void>;
}

/**
 * useCarousel Hook
 * 
 * @param initialIds - Initial carousel IDs (optional)
 * @returns UseCarouselReturn - Hook state and actions
 */
export function useCarousel(initialIds: string[] = []): UseCarouselReturn {
  const [carouselIds, setCarouselIds] = useState<string[]>(initialIds);
  const [originalIds, setOriginalIds] = useState<string[]>(initialIds);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<CarouselError | null>(null);
  const { toast } = useToast();

  /**
   * Check if there are unsaved changes
   */
  const hasChanges = useMemo(
    () => JSON.stringify(carouselIds) !== JSON.stringify(originalIds),
    [carouselIds, originalIds]
  );

  /**
   * Check if more items can be added
   */
  const canAddMore = useMemo(
    () => carouselIds.length < MAX_CAROUSEL_ITEMS,
    [carouselIds.length]
  );

  /**
   * Validate current carousel state
   */
  const validationErrors = useMemo(() => {
    const errors: string[] = [];

    // Check maximum limit
    if (carouselIds.length > MAX_CAROUSEL_ITEMS) {
      errors.push(`Máximo ${MAX_CAROUSEL_ITEMS} elementos permitidos`);
    }

    // Check for duplicates
    const duplicates = carouselIds.filter(
      (id, idx) => carouselIds.indexOf(id) !== idx
    );
    if (duplicates.length > 0) {
      errors.push('Se detectaron IDs duplicados');
    }

    // Check for empty strings
    const emptyIds = carouselIds.filter((id) => !id || id.trim() === '');
    if (emptyIds.length > 0) {
      errors.push('Se detectaron IDs vacíos');
    }

    return errors;
  }, [carouselIds]);

  /**
   * Check if current state is valid
   */
  const isValid = useMemo(
    () => validationErrors.length === 0,
    [validationErrors.length]
  );

  /**
   * Toggle a promotion in/out of the carousel
   */
  const togglePromotion = useCallback((id: string) => {
    setCarouselIds((prev) => {
      if (prev.includes(id)) {
        // Remove from carousel
        return prev.filter((x) => x !== id);
      } else if (prev.length < MAX_CAROUSEL_ITEMS) {
        // Add to carousel
        return [...prev, id];
      } else {
        // At maximum capacity
        setError({
          type: CarouselErrorType.VALIDATION_ERROR,
          message: `Máximo ${MAX_CAROUSEL_ITEMS} elementos permitidos`,
          timestamp: new Date(),
          retryable: false,
        });
        
        toast({
          title: 'Límite alcanzado',
          description: `Máximo ${MAX_CAROUSEL_ITEMS} elementos en el carrusel.`,
          variant: 'destructive',
        });
        
        return prev;
      }
    });
  }, [toast]);

  /**
   * Move a promotion up or down in the carousel
   */
  const movePromotion = useCallback((id: string, direction: 'up' | 'down') => {
    setCarouselIds((prev) => {
      const idx = prev.indexOf(id);
      if (idx === -1) return prev;

      const newIds = [...prev];
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;

      // Check bounds
      if (swapIdx < 0 || swapIdx >= newIds.length) return prev;

      // Swap elements
      [newIds[idx], newIds[swapIdx]] = [newIds[swapIdx], newIds[idx]];
      
      return newIds;
    });
  }, []);

  /**
   * Remove a promotion from the carousel
   */
  const removePromotion = useCallback((id: string) => {
    setCarouselIds((prev) => prev.filter((x) => x !== id));
  }, []);

  /**
   * Save carousel to server
   */
  const saveCarousel = useCallback(async () => {
    // Check if there are changes
    if (!hasChanges) {
      return;
    }

    // Validate before saving
    if (!isValid) {
      setError({
        type: CarouselErrorType.VALIDATION_ERROR,
        message: 'Corrige los errores de validación antes de guardar',
        details: validationErrors,
        timestamp: new Date(),
        retryable: false,
      });
      
      toast({
        title: 'Error de validación',
        description: validationErrors.join(', '),
        variant: 'destructive',
      });
      
      return;
    }

    setSaving(true);
    setError(null);

    try {
      console.log('[useCarousel] Saving carousel with IDs:', carouselIds);
      
      // Use fetch directly to call Next.js API Route
      const response = await fetch('/api/promotions/carousel', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: carouselIds }),
      });

      console.log('[useCarousel] Response status:', response.status);
      console.log('[useCarousel] Response ok:', response.ok);
      console.log('[useCarousel] Response statusText:', response.statusText);

      if (!response.ok) {
        // Try to get error details
        const responseText = await response.text();
        console.log('[useCarousel] Error response text:', responseText);
        
        let errorData: any = {};
        try {
          errorData = JSON.parse(responseText);
          console.log('[useCarousel] Parsed error data:', errorData);
        } catch (parseErr) {
          console.error('[useCarousel] Could not parse error response as JSON:', parseErr);
        }
        
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data?.success) {
        // Update original state to match saved state
        const savedIds = data.ids || carouselIds;
        setOriginalIds(savedIds);
        setCarouselIds(savedIds);

        toast({
          title: 'Éxito',
          description: 'Carrusel actualizado correctamente',
        });
      } else {
        throw new Error(data?.message || 'Error desconocido');
      }
    } catch (err: any) {
      console.error('[useCarousel] Save error:', err);

      // Revert to original state on error
      setCarouselIds(originalIds);

      // Determine error type
      let errorType = CarouselErrorType.SERVER_ERROR;
      let retryable = true;

      if (err.message?.includes('409')) {
        errorType = CarouselErrorType.CONFLICT_ERROR;
        retryable = false;
      } else if (err.message?.includes('timeout')) {
        errorType = CarouselErrorType.TIMEOUT_ERROR;
      } else if (err.message?.includes('403')) {
        errorType = CarouselErrorType.PERMISSION_ERROR;
        retryable = false;
      } else if (err.message?.includes('400')) {
        errorType = CarouselErrorType.VALIDATION_ERROR;
        retryable = false;
      } else if (err.message?.includes('fetch')) {
        errorType = CarouselErrorType.NETWORK_ERROR;
      }

      const carouselError: CarouselError = {
        type: errorType,
        message: err.message || 'Error al guardar',
        details: err,
        timestamp: new Date(),
        retryable,
      };

      setError(carouselError);

      toast({
        title: 'Error',
        description: carouselError.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }, [carouselIds, originalIds, hasChanges, isValid, validationErrors, toast]);

  /**
   * Revert changes to original state
   */
  const revertChanges = useCallback(() => {
    setCarouselIds(originalIds);
    setError(null);
    
    toast({
      title: 'Cambios revertidos',
      description: 'Se restauró el estado anterior del carrusel',
    });
  }, [originalIds, toast]);

  /**
   * Refresh carousel from server
   */
  const refreshCarousel = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Use fetch directly to call Next.js API Route
      const response = await fetch('/api/promotions/carousel', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[useCarousel] Refresh error response:', errorData);
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data?.success) {
        const ids = data.ids || [];
        setCarouselIds(ids);
        setOriginalIds(ids);
      } else {
        throw new Error(data?.message || 'Error desconocido');
      }
    } catch (err: any) {
      console.error('[useCarousel] Refresh error:', err);

      const carouselError: CarouselError = {
        type: err.message?.includes('fetch') ? CarouselErrorType.NETWORK_ERROR : CarouselErrorType.SERVER_ERROR,
        message: err.message || 'Error al cargar',
        details: err,
        timestamp: new Date(),
        retryable: true,
      };

      setError(carouselError);

      toast({
        title: 'Error',
        description: carouselError.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Load carousel on mount if no initial IDs provided
  useEffect(() => {
    if (initialIds.length === 0) {
      refreshCarousel();
    }
  }, [initialIds.length, refreshCarousel]);

  return {
    // State
    carouselIds,
    loading,
    saving,
    error,
    hasChanges,

    // Validation
    canAddMore,
    isValid,
    validationErrors,

    // Actions
    togglePromotion,
    movePromotion,
    removePromotion,
    saveCarousel,
    revertChanges,
    refreshCarousel,
  };
}
