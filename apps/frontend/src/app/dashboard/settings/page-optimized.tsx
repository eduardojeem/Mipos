'use client';

import { lazy, Suspense } from 'react';
import { PermissionProvider } from '@/components/ui/permission-guard';
import { SettingsLoadingSkeleton } from './components/SettingsLoadingSkeleton';

// Lazy load heavy components
const SettingsPageContent = lazy(() => import('./components/SettingsPageContent'));

export default function SettingsPage() {
  return (
    <PermissionProvider>
      <Suspense fallback={<SettingsLoadingSkeleton />}>
        <SettingsPageContent />
      </Suspense>
    </PermissionProvider>
  );
}