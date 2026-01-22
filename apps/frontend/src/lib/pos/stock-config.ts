import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface StockConfig {
  preventNegativeStock: boolean;
  warningThreshold: number;
  autoBlockLowStock: boolean;
  notificationEnabled: boolean;
}

interface StockConfigStore {
  config: StockConfig;
  updateConfig: (config: Partial<StockConfig>) => void;
  resetConfig: () => void;
}

const defaultConfig: StockConfig = {
  preventNegativeStock: true,
  warningThreshold: 5,
  autoBlockLowStock: false,
  notificationEnabled: true,
};

export const useStockConfig = create<StockConfigStore>()(
  persist(
    (set) => ({
      config: defaultConfig,
      updateConfig: (newConfig) => 
        set((state) => ({
          config: { ...state.config, ...newConfig }
        })),
      resetConfig: () => 
        set({ config: defaultConfig }),
    }),
    {
      name: 'pos-stock-config',
    }
  )
);

export function validateStockAvailability(
  currentStock: number,
  requestedQuantity: number,
  config: StockConfig
): { valid: boolean; message?: string } {
  if (config.preventNegativeStock) {
    const resultingStock = currentStock - requestedQuantity;
    if (resultingStock < 0) {
      return {
        valid: false,
        message: `No hay suficiente stock. Disponible: ${currentStock}, Solicitado: ${requestedQuantity}`
      };
    }
  }
  
  if (config.autoBlockLowStock && currentStock <= config.warningThreshold) {
    return {
      valid: false,
      message: `Stock bajo. Solo quedan ${currentStock} unidades`
    };
  }
  
  return { valid: true };
}