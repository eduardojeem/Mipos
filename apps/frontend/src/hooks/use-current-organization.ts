'use client';

import { useEffect, useState } from 'react';
import { getSelectedOrganizationId, getSelectedOrganizationName } from '@/lib/organization-context';

export function useCurrentOrganizationId() {
  const [organizationId, setOrganizationId] = useState<string | null>(() => getSelectedOrganizationId());

  useEffect(() => {
    const syncOrganizationId = () => {
      setOrganizationId(getSelectedOrganizationId());
    };

    window.addEventListener('organization-changed', syncOrganizationId as EventListener);
    window.addEventListener('storage', syncOrganizationId);

    return () => {
      window.removeEventListener('organization-changed', syncOrganizationId as EventListener);
      window.removeEventListener('storage', syncOrganizationId);
    };
  }, []);

  return organizationId;
}

export function useCurrentOrganizationName() {
  const [organizationName, setOrganizationName] = useState<string | null>(() => getSelectedOrganizationName());

  useEffect(() => {
    const syncOrganizationName = () => {
      setOrganizationName(getSelectedOrganizationName());
    };

    window.addEventListener('organization-changed', syncOrganizationName as EventListener);
    window.addEventListener('storage', syncOrganizationName);

    return () => {
      window.removeEventListener('organization-changed', syncOrganizationName as EventListener);
      window.removeEventListener('storage', syncOrganizationName);
    };
  }, []);

  return organizationName;
}
