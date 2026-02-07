import OptimizedPOSLayout from '@/components/pos/OptimizedPOSLayout';
import { UnifiedPermissionGuard } from '@/components/auth/UnifiedPermissionGuard';

export default function POSPage() {
  return (
    <UnifiedPermissionGuard resource="pos" action="access">
      <OptimizedPOSLayout />
    </UnifiedPermissionGuard>
  );
}
