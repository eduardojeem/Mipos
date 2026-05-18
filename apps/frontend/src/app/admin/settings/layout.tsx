'use client';

import { ReactNode } from 'react';
import { PlanSyncProvider } from '@/contexts/plan-sync-context';

export default function AdminSettingsLayout({ children }: { children: ReactNode }) {
  return <PlanSyncProvider>{children}</PlanSyncProvider>;
}
