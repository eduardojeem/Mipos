"use client";
import dynamic from 'next/dynamic';
import { UnifiedPermissionGuard } from '@/components/auth/UnifiedPermissionGuard';

const OptimizedPOSLayout = dynamic(() => import('@/components/pos/OptimizedPOSLayout'), {
  ssr: false,
  loading: () => (
    <div className="p-6">
      <div className="mb-4 h-8 w-48 rounded-lg bg-muted animate-pulse" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-64 rounded-2xl bg-muted animate-pulse" />
        <div className="h-64 rounded-2xl bg-muted animate-pulse" />
        <div className="h-64 rounded-2xl bg-muted animate-pulse" />
      </div>
    </div>
  ),
});

export default function POSPage() {
  return (
    <UnifiedPermissionGuard resource="pos" action="access">
      <OptimizedPOSLayout />
    </UnifiedPermissionGuard>
  );
}
