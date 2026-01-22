import { useState, useCallback } from 'react';

interface UsePOSModalsOptions {
  onCustomerSelect?: (customer: any) => void;
  onSaleComplete?: () => void;
}

export function usePOSModals({ onCustomerSelect, onSaleComplete }: UsePOSModalsOptions = {}) {
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);

  const openCustomerModal = useCallback(() => {
    setShowCustomerModal(true);
  }, []);

  const closeCustomerModal = useCallback(() => {
    setShowCustomerModal(false);
  }, []);

  const openReceiptModal = useCallback((sale: any) => {
    setLastSale(sale);
    setShowReceiptModal(true);
  }, []);

  const closeReceiptModal = useCallback(() => {
    setShowReceiptModal(false);
    setLastSale(null);
  }, []);

  const toggleKeyboardShortcuts = useCallback(() => {
    setShowKeyboardShortcuts(prev => !prev);
  }, []);

  const handleCustomerSelect = useCallback((customer: any) => {
    onCustomerSelect?.(customer);
    closeCustomerModal();
  }, [onCustomerSelect, closeCustomerModal]);

  const handleSaleComplete = useCallback((sale: any) => {
    openReceiptModal(sale);
    onSaleComplete?.();
  }, [openReceiptModal, onSaleComplete]);

  return {
    // Modal states
    showCustomerModal,
    showReceiptModal,
    showKeyboardShortcuts,
    lastSale,

    // Modal actions
    openCustomerModal,
    closeCustomerModal,
    openReceiptModal,
    closeReceiptModal,
    toggleKeyboardShortcuts,

    // Event handlers
    handleCustomerSelect,
    handleSaleComplete,
  };
}