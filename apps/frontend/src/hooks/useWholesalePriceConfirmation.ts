import { useState, useCallback } from 'react';
import type { Product } from '@/types';

interface PriceChangeData {
  productName: string;
  previousPrice: number;
  newPrice: number;
  quantity: number;
  savings: number;
  priceType: 'mayorista' | 'minorista';
}

interface UseWholesalePriceConfirmationOptions {
  onConfirm?: (product: Product, quantity: number, newPrice: number) => void;
  onCancel?: () => void;
  requireConfirmation?: boolean;
}

export function useWholesalePriceConfirmation({
  onConfirm,
  onCancel,
  requireConfirmation = true,
}: UseWholesalePriceConfirmationOptions = {}) {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingPriceChange, setPendingPriceChange] = useState<PriceChangeData | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    product: Product;
    quantity: number;
    newPrice: number;
  } | null>(null);

  const requestPriceConfirmation = useCallback((
    product: Product,
    quantity: number,
    previousPrice: number,
    newPrice: number
  ) => {
    if (!requireConfirmation || previousPrice === newPrice) {
      onConfirm?.(product, quantity, newPrice);
      return;
    }

    const savings = Math.max(0, previousPrice - newPrice);
    const priceChangeData: PriceChangeData = {
      productName: product.name,
      previousPrice,
      newPrice,
      quantity,
      savings,
      priceType: newPrice < previousPrice ? 'mayorista' : 'minorista',
    };

    setPendingPriceChange(priceChangeData);
    setPendingAction({ product, quantity, newPrice });
    setShowConfirmation(true);
  }, [requireConfirmation, onConfirm]);

  const handleConfirmPriceChange = useCallback(() => {
    if (pendingAction) {
      onConfirm?.(pendingAction.product, pendingAction.quantity, pendingAction.newPrice);
    }
    setShowConfirmation(false);
    setPendingPriceChange(null);
    setPendingAction(null);
  }, [pendingAction, onConfirm]);

  const handleCancelPriceChange = useCallback(() => {
    onCancel?.();
    setShowConfirmation(false);
    setPendingPriceChange(null);
    setPendingAction(null);
  }, [onCancel]);

  return {
    showConfirmation,
    pendingPriceChange,
    requestPriceConfirmation,
    handleConfirmPriceChange,
    handleCancelPriceChange,
  };
}