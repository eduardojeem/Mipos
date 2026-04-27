'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import {
  buildTenantAwarePath,
  extractTenantPathPrefix,
  extractTenantPathSegment,
} from '@/lib/domain/tenant-public-paths';

export function useTenantPublicRouting() {
  const pathname = usePathname();

  return useMemo(() => {
    const tenantPathPrefix = extractTenantPathPrefix(pathname);
    const tenantPathSegment = extractTenantPathSegment(pathname);

    return {
      pathname,
      tenantPathPrefix,
      tenantPathSegment,
      isPathTenantRouting: Boolean(tenantPathPrefix),
      tenantHref: (target: string) => buildTenantAwarePath(target, tenantPathPrefix),
      tenantApiPath: (target: string) => buildTenantAwarePath(target, tenantPathPrefix),
      tenantStorageScope: tenantPathSegment || 'default',
    };
  }, [pathname]);
}

export default useTenantPublicRouting;
