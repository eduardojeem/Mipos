'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { usePlanSync, UsePlanSyncReturn } from '@/hooks/use-plan-sync';

const PlanSyncContext = createContext<UsePlanSyncReturn | undefined>(undefined);

interface PlanSyncProviderProps {
  children: ReactNode;
}

export function PlanSyncProvider({ children }: PlanSyncProviderProps) {
  const planSync = usePlanSync();

  return (
    <PlanSyncContext.Provider value={planSync}>
      {children}
    </PlanSyncContext.Provider>
  );
}

export function usePlanSyncContext() {
  const context = useContext(PlanSyncContext);
  if (context === undefined) {
    throw new Error('usePlanSyncContext must be used within a PlanSyncProvider');
  }
  return context;
}