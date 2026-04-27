'use client'

import { createContext, useContext, ReactNode } from 'react'
import { usePlanSync, type UsePlanSyncReturn } from '@/hooks/use-plan-sync'

const PlanSyncContext = createContext<UsePlanSyncReturn | null>(null)

export function PlanSyncProvider({ children }: { children: ReactNode }) {
  const planSync = usePlanSync()

  return (
    <PlanSyncContext.Provider value={planSync}>
      {children}
    </PlanSyncContext.Provider>
  )
}

export function usePlanSyncContext() {
  const context = useContext(PlanSyncContext)
  if (!context) {
    throw new Error('usePlanSyncContext must be used within a PlanSyncProvider')
  }
  return context
}
