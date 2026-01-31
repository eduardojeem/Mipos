import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  subscription_plan: 'FREE' | 'PRO' | 'ENTERPRISE';
  subscription_status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'TRIAL';
  created_at: string;
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

export function useUserOrganizations(userId?: string) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = createClient();

  // Load selected organization from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('selected_organization');
      if (stored) {
        const org = JSON.parse(stored) as Organization;
        setSelectedOrganization(org);
      }
    } catch (e) {
      console.error('Error loading selected organization:', e);
    }
  }, []);

  const selectOrganization = useCallback((org: Organization) => {
    setSelectedOrganization(org);
    try {
      localStorage.setItem('selected_organization', JSON.stringify(org));
    } catch (e) {
      console.error('Error saving selected organization:', e);
    }
  }, []);

  const fetchOrganizations = useCallback(async (currentUserId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch organization memberships - FIXED: Changed 'role' to 'role_id'
      const { data: memberData, error: memberError } = await supabase
        .from('organization_members')
        .select('organization_id, role_id')
        .eq('user_id', currentUserId);

      if (memberError) {
        throw memberError;
      }

      if (!memberData || memberData.length === 0) {
        setOrganizations([]);
        setLoading(false);
        return;
      }

      const orgIds = memberData.map((m: OrganizationMember) => m.organization_id);

      // Fetch organization details
      const { data: orgsData, error: orgsError } = await supabase
        .from('organizations')
        .select('*')
        .in('id', orgIds)
        .order('name');

      if (orgsError) {
        throw orgsError;
      }

      setOrganizations(orgsData || []);

      // Auto-select if only one organization
      if (orgsData && orgsData.length === 1 && !selectedOrganization) {
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
  }, [supabase, selectedOrganization, selectOrganization]);

  const clearSelectedOrganization = useCallback(() => {
    setSelectedOrganization(null);
    try {
      localStorage.removeItem('selected_organization');
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
    refetch: () => userId && fetchOrganizations(userId),
  };
}
