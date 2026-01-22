import { useCallback } from 'react';
import { supabaseRealtimeService } from '@/lib/supabase-realtime';

export interface UseRealtimeServiceReturn {
  subscribeToInventoryMovementsGlobal: (
    callback: (movement: any) => void,
    errorCallback?: (error: any) => void
  ) => Promise<() => Promise<void>>;
  subscribeToInventoryMovementsByProduct: (
    productId: string,
    callback: (movement: any) => void,
    errorCallback?: (error: any) => void
  ) => Promise<() => Promise<void>>;
}

export const useRealtimeService = (): UseRealtimeServiceReturn => {
  const subscribeToInventoryMovementsGlobal = useCallback(async (
    callback: (movement: any) => void,
    errorCallback?: (error: any) => void
  ) => {
    return supabaseRealtimeService.subscribeToInventoryMovementsGlobal(
      (payload) => {
        // Transform payload to match expected format
        const movement = {
          id: payload.new?.id || '',
          product_id: payload.new?.product_id || '',
          product_name: payload.new?.product?.name || '',
          type: payload.new?.movement_type || 'ADJUSTMENT',
          quantity: payload.new?.quantity || 0,
          previous_stock: 0, // Not available in current schema
          new_stock: 0, // Not available in current schema
          reason: payload.new?.notes || '',
          created_at: payload.new?.created_at || new Date().toISOString(),
          user_id: payload.new?.user_id || '',
          sale_id: payload.new?.reference_id || '' // Use reference_id instead
        };
        callback(movement);
      }
    );
  }, []);

  const subscribeToInventoryMovementsByProduct = useCallback(async (
    productId: string,
    callback: (movement: any) => void,
    errorCallback?: (error: any) => void
  ) => {
    try {
      return await supabaseRealtimeService.subscribeToInventoryMovementsByProduct(
        productId,
        (payload) => {
          // Transform payload to match expected format
          const movement = {
            id: payload.new?.id || '',
            product_id: payload.new?.product_id || '',
            product_name: payload.new?.product?.name || '',
            type: payload.new?.movement_type || 'ADJUSTMENT',
            quantity: payload.new?.quantity || 0,
            previous_stock: 0, // Not available in current schema
            new_stock: 0, // Not available in current schema
            reason: payload.new?.notes || '',
            created_at: payload.new?.created_at || new Date().toISOString(),
            user_id: payload.new?.user_id || '',
            sale_id: payload.new?.reference_id || '' // Use reference_id instead
          };
          callback(movement);
        }
      );
    } catch (error) {
      if (errorCallback) {
        errorCallback(error);
      } else {
        console.error('Error subscribing to inventory movements by product:', error);
      }
      // Return a no-op unsubscribe function in case of error
      return async () => {};
    }
  }, []);

  return {
    subscribeToInventoryMovementsGlobal,
    subscribeToInventoryMovementsByProduct
  };
};