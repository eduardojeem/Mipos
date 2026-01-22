import { useEffect, useCallback } from 'react';
import { toast } from '@/lib/toast';

interface UsePOSKeyboardOptions {
  onSearchFocus?: () => void;
  onProcessSale?: () => void;
  onClearCart?: () => void;
  onOpenCustomerModal?: () => void;
  onRefreshData?: () => void;
  onToggleViewMode?: () => void;
  onToggleBarcodeMode?: () => void;
  onToggleQuickAddMode?: () => void;
  onToggleCart?: () => void;
  onToggleShortcutsModal?: () => void;
  onCatalogFocus?: () => void;
  cartLength?: number;
  quickAddMode?: boolean;
}

export function usePOSKeyboard({
  onSearchFocus,
  onProcessSale,
  onClearCart,
  onOpenCustomerModal,
  onRefreshData,
  onToggleViewMode,
  onToggleBarcodeMode,
  onToggleQuickAddMode,
  onToggleCart,
  onToggleShortcutsModal,
  onCatalogFocus,
  cartLength = 0,
  quickAddMode = false,
}: UsePOSKeyboardOptions) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Evitar conflictos cuando se está escribiendo en inputs
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }

    // Atajos con Shift
    if (event.shiftKey) {
      const key = event.key.toLowerCase();
      switch (key) {
        case 'f':
          event.preventDefault();
          onSearchFocus?.();
          break;
        case 'c':
          event.preventDefault();
          onCatalogFocus?.();
          break;
      }
    }

    switch (event.key) {
      case 'F1':
        event.preventDefault();
        onSearchFocus?.();
        break;
      case 'F2':
        event.preventDefault();
        if (cartLength > 0) {
          onProcessSale?.();
        }
        break;
      case 'F3':
        event.preventDefault();
        onClearCart?.();
        break;
      case 'F4':
        event.preventDefault();
        onOpenCustomerModal?.();
        break;
      case 'F5':
        event.preventDefault();
        onToggleViewMode?.();
        break;
      case 'F6':
        event.preventDefault();
        onToggleBarcodeMode?.();
        break;
      case 'F9':
        event.preventDefault();
        onRefreshData?.();
        break;
      case 'F12':
        event.preventDefault();
        // Toggle help/shortcuts modal si está conectado desde el componente
        onToggleShortcutsModal?.();
        break;
      case 'Escape':
        event.preventDefault();
        // Close modals and reset states (si aplica)
        break;
    }

    // Atajos con Ctrl
    if (event.ctrlKey) {
      const key = event.key.toLowerCase();
      switch (key) {
        case '=':
        case '+':
          event.preventDefault();
          onToggleQuickAddMode?.();
          break;
        case 'enter':
          event.preventDefault();
          if (cartLength > 0) {
            onProcessSale?.();
          }
          break;
        case 'b':
          event.preventDefault();
          onToggleCart?.();
          break;
        case 'k':
          event.preventDefault();
          onSearchFocus?.();
          break;
      }
    }
  }, [
    onSearchFocus,
    onProcessSale,
    onClearCart,
    onOpenCustomerModal,
    onRefreshData,
    onToggleViewMode,
    onToggleBarcodeMode,
    onToggleQuickAddMode,
    onToggleCart,
    onToggleShortcutsModal,
    onCatalogFocus,
    cartLength,
  ]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    // Return any computed values if needed
  };
}
