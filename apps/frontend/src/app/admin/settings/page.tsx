'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { SettingsContent } from '@/app/dashboard/settings/components/SettingsContent';
import { SettingsLoadingSkeleton } from '@/app/dashboard/settings/components/SettingsLoadingSkeleton';
import { normalizeSettingsTab } from '@/app/dashboard/settings/components/settings-navigation';

const MOVED_SETTINGS_TABS: Record<string, string> = {
  company: '/admin/business-config',
  business: '/admin/business-config',
  empresa: '/admin/business-config',
  billing: '/admin/subscriptions',
  branches: '/admin/sucursal',
  plan: '/admin/subscriptions',
  sucursal: '/admin/sucursal',
  sucursales: '/admin/sucursal',
  subscription: '/admin/subscriptions',
  suscripcion: '/admin/subscriptions',
  users: '/admin/users-roles',
  roles: '/admin/users-roles',
  team: '/admin/users-roles',
  'users-roles': '/admin/users-roles',
  appearance: '/admin/appearance',
  apariencia: '/admin/appearance',
};

const REMOVED_SETTINGS_TABS = new Set(['integration', 'integrations', 'system']);

function AdminSettingsWrapper() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams?.get('tab')?.trim().toLowerCase() || '';
  const movedTarget = MOVED_SETTINGS_TABS[rawTab];
  const shouldResetTab = REMOVED_SETTINGS_TABS.has(rawTab);

  useEffect(() => {
    if (movedTarget) {
      router.replace(movedTarget);
      return;
    }

    if (shouldResetTab) {
      router.replace('/admin/settings?tab=general');
    }
  }, [movedTarget, router, shouldResetTab]);

  if (movedTarget || shouldResetTab) {
    return <SettingsLoadingSkeleton />;
  }

  const activeTab = normalizeSettingsTab(rawTab);
  return <SettingsContent activeTab={activeTab} />;
}

export default function AdminSettingsPage() {
  return (
    <Suspense fallback={<SettingsLoadingSkeleton />}>
      <AdminSettingsWrapper />
    </Suspense>
  );
}
