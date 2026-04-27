import { useState, useEffect, useCallback } from 'react';

// ── Global deduplication cache ──────────────────────────────────────
// Prevents 10+ component instances from firing parallel API calls
const _orgCache: {
  promise: Promise<Organization[]> | null;
  data: Organization[] | null;
  fetchedAt: number;
  userId: string | null;
} = { promise: null, data: null, fetchedAt: 0, userId: null };

const ORG_CACHE_TTL = 30_000; // 30 seconds

function getCachedOrFetch(userId: string): Promise<Organization[]> {
  const now = Date.now();
  // Reuse in-flight request or fresh cache for the same user
  if (
    _orgCache.userId === userId &&
    _orgCache.promise &&
    now - _orgCache.fetchedAt < ORG_CACHE_TTL
  ) {
    return _orgCache.promise;
  }

  _orgCache.userId = userId;
  _orgCache.fetchedAt = now;
  _orgCache.promise = fetch('/api/auth/organizations', {
    method: 'GET',
    cache: 'no-store',
    credentials: 'include',
  })
    .then(async (response) => {
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.error || 'Failed to fetch organizations');
      }
      const orgs = Array.isArray(result?.organizations)
        ? (result.organizations as Organization[])
        : [];
      _orgCache.data = orgs;
      return orgs;
    })
    .catch((err) => {
      // Clear promise so next caller retries
      _orgCache.promise = null;
      throw err;
    });

  return _orgCache.promise;
}

/** Invalidate the global org cache (e.g. after org switch) */
export function invalidateOrgCache() {
  _orgCache.promise = null;
  _orgCache.data = null;
  _orgCache.fetchedAt = 0;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  subscription_plan: 'FREE' | 'STARTER' | 'PRO' | 'PROFESSIONAL' | 'PREMIUM' | 'ENTERPRISE' | 'BASIC';
  subscription_status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'TRIAL';
  created_at: string;
  subdomain?: string | null;
  custom_domain?: string | null;
  domain_verified?: boolean;
  settings?: Record<string, unknown>;
  branding?: {
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
  };
}

export interface OrganizationMember {
  organization_id: string;
  user_id: string;
  role_id: string;
  created_at: string;
}

function readStoredOrganization(): Organization | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem('selected_organization');
    if (!stored) return null;
    return JSON.parse(stored) as Organization;
  } catch (e) {
    console.error('Error loading selected organization:', e);
    return null;
  }
}

function writeOrganizationCookies(org: Organization | null) {
  if (typeof document === 'undefined') return;

  const base = 'path=/; SameSite=Lax';
  const setCookie = (name: string, value: string) => {
    document.cookie = `${name}=${encodeURIComponent(value)}; ${base}`;
  };

  if (!org) {
    const expired = 'path=/; SameSite=Lax; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = `x-organization-id=; ${expired}`;
    document.cookie = `x-organization-name=; ${expired}`;
    document.cookie = `x-organization-slug=; ${expired}`;
    return;
  }

  setCookie('x-organization-id', org.id);
  setCookie('x-organization-name', org.name);
  setCookie('x-organization-slug', org.slug);
}

function isSameOrganization(a: Organization | null, b: Organization | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.id === b.id &&
    a.name === b.name &&
    a.slug === b.slug &&
    a.subscription_plan === b.subscription_plan &&
    a.subscription_status === b.subscription_status
  );
}

export function useUserOrganizations(userId?: string) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(() => readStoredOrganization());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncSelectedOrganization = () => {
      const nextOrganization = readStoredOrganization();
      setSelectedOrganization((prev) => (isSameOrganization(prev, nextOrganization) ? prev : nextOrganization));
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'selected_organization') {
        syncSelectedOrganization();
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('organization-changed', syncSelectedOrganization as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('organization-changed', syncSelectedOrganization as EventListener);
    };
  }, []);

  const selectOrganization = useCallback((org: Organization) => {
    let shouldBroadcast = true;
    setSelectedOrganization((prev) => {
      if (isSameOrganization(prev, org)) {
        shouldBroadcast = false;
        return prev;
      }
      return org;
    });
    try {
      const currentStored = readStoredOrganization();
      if (!isSameOrganization(currentStored, org)) {
        localStorage.setItem('selected_organization', JSON.stringify(org));
      }
      writeOrganizationCookies(org);
      if (shouldBroadcast) {
        window.dispatchEvent(new CustomEvent('organization-changed', {
          detail: { organizationId: org.id, organization: org }
        }));
      }
    } catch (e) {
      console.error('Error saving selected organization:', e);
    }
  }, []);

  const fetchOrganizations = useCallback(async (currentUserId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const orgsData = await getCachedOrFetch(currentUserId);

      setOrganizations(orgsData);

      // Auto-select first organization if none is currently selected
      if (orgsData.length > 0 && !readStoredOrganization()) {
        selectOrganization(orgsData[0]);
      }
    } catch (err) {
      const error = err as { name?: string; message?: string; code?: string; status?: number; details?: string; hint?: string };
      const name = error?.name ?? 'Unknown';
      const message = error?.message ?? (typeof err === 'string' ? err : '');
      const code = error?.code ?? error?.status;
      const details = error?.details ?? error?.hint ?? undefined;
      console.error('Error fetching organizations:', { name, message, code, details });
      const friendly =
        message?.toLowerCase().includes('row-level security')
          ? 'Sin permisos para ver organizaciones. Contacta al administrador.'
          : message || 'Failed to fetch organizations';
      setError(friendly);
    } finally {
      setLoading(false);
    }
  }, [selectOrganization]);
  const clearSelectedOrganization = useCallback(() => {
    setSelectedOrganization(null);
    try {
      localStorage.removeItem('selected_organization');
      writeOrganizationCookies(null);
      window.dispatchEvent(new CustomEvent('organization-changed', {
        detail: { organizationId: null, organization: null }
      }));
    } catch (e) {
      console.error('Error clearing selected organization:', e);
    }
  }, []);

  useEffect(() => {
    if (userId) {
      fetchOrganizations(userId);
    }
  }, [userId, fetchOrganizations]);

  return {
    organizations,
    selectedOrganization,
    loading,
    error,
    selectOrganization,
    clearSelectedOrganization,
    refetch: () => {
      if (userId) {
        invalidateOrgCache();
        fetchOrganizations(userId);
      }
    },
  };
}
