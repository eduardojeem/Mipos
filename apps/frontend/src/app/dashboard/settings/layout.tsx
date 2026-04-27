'use client';

import { ReactNode } from 'react';
import { PlanSyncProvider } from '@/contexts/plan-sync-context';
import { PermissionProvider } from '@/components/ui/permission-guard';

interface SettingsLayoutProps {
  children: ReactNode;
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  return (
    <PlanSyncProvider>
      <PermissionProvider>
        <div className="min-h-screen bg-slate-50 dark:bg-zinc-950">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            {children}
          </div>
        </div>
      </PermissionProvider>
    </PlanSyncProvider>
  );
}
