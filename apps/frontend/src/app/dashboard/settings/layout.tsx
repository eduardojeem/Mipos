'use client';

import { ReactNode } from 'react';
import { PlanSyncProvider } from '@/contexts/plan-sync-context';

interface SettingsLayoutProps {
  children: ReactNode;
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  return <PlanSyncProvider>{children}</PlanSyncProvider>;
}
