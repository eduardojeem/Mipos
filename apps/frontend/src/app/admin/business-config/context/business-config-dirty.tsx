'use client';

import { createContext, useContext } from 'react';

/**
 * Tracking de cambios sin guardar en business-config.
 * Permite que el tab page advierta antes de cambiar de pestaña.
 */
export const BusinessConfigDirtyContext = createContext<{ setDirty: (dirty: boolean) => void } | null>(null);

export function useBusinessConfigDirty() {
  return useContext(BusinessConfigDirtyContext);
}
