'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { SettingsContent } from '@/app/dashboard/settings/components/SettingsContent';
import { SettingsLoadingSkeleton } from '@/app/dashboard/settings/components/SettingsLoadingSkeleton';
import { normalizeSettingsTab } from '@/app/dashboard/settings/components/settings-navigation';

function AdminSettingsWrapper() {
  const searchParams = useSearchParams();
  const activeTab = normalizeSettingsTab(searchParams?.get('tab'));
  return <SettingsContent activeTab={activeTab} />;
}

export default function AdminSettingsPage() {
  return (
    <Suspense fallback={<SettingsLoadingSkeleton />}>
      <AdminSettingsWrapper />
    </Suspense>
  );
}
