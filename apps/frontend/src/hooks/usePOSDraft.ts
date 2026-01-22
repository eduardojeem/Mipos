import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/lib/toast';
import type { CartItem, Customer } from '@/types';

interface POSDraft {
  cart: CartItem[];
  discount: number;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  notes: string;
  isWholesaleMode: boolean;
  selectedCustomerId: string | null;
}

const DRAFT_KEY = 'pos_cart_draft_v1';

export function usePOSDraft() {
  const [hasDraft, setHasDraft] = useState(false);

  // Check for existing draft on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      setHasDraft(!!raw);
    } catch (error) {
      console.warn('Error checking draft:', error);
    }
  }, []);

  const saveDraft = useCallback((
    cart: CartItem[],
    discount: number,
    discountType: 'PERCENTAGE' | 'FIXED_AMOUNT',
    notes: string,
    isWholesaleMode: boolean,
    selectedCustomer: Customer | null
  ) => {
    try {
      const payload: POSDraft = {
        cart,
        discount,
        discountType,
        notes,
        isWholesaleMode,
        selectedCustomerId: selectedCustomer?.id ?? null,
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
      setHasDraft(true);
      toast.show({
        title: 'Borrador guardado',
        description: 'Puedes restaurarlo desde el carrito',
      });
    } catch (error) {
      toast.show({
        title: 'Error guardando borrador',
        description: 'No se pudo guardar el borrador',
        variant: 'destructive',
      });
    }
  }, []);

  const restoreDraft = useCallback((
    onRestore: (draft: POSDraft) => void
  ) => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) {
        toast.show({
          title: 'Sin borrador',
          description: 'No hay borrador guardado'
        });
        return false;
      }

      const draft: POSDraft = JSON.parse(raw);
      onRestore(draft);

      toast.show({
        title: 'Borrador restaurado',
        description: 'Carrito y estados recuperados'
      });

      return true;
    } catch (error) {
      toast.show({
        title: 'Error restaurando',
        description: 'No se pudo restaurar el borrador',
        variant: 'destructive',
      });
      return false;
    }
  }, []);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_KEY);
      setHasDraft(false);
    } catch (error) {
      console.warn('Error clearing draft:', error);
    }
  }, []);

  return {
    hasDraft,
    saveDraft,
    restoreDraft,
    clearDraft,
  };
}