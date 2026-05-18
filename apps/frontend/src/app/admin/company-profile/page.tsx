'use client';

import { PlanSyncProvider } from '@/contexts/plan-sync-context';
import { CompanySettings } from '@/app/dashboard/settings/components/CompanySettings';

export default function AdminCompanyProfilePage() {
  return (
    <PlanSyncProvider>
      <CompanySettings />
    </PlanSyncProvider>
  );
}
