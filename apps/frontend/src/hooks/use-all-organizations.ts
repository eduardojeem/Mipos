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

/**
 * Hook para obtener TODAS las organizaciones (solo para Super Admin)
 * 
 * Este hook es diferente de useUserOrganizations porque:
 * - useUserOrganizations: obtiene solo las orgs del usuario actual
 * - useAllOrganizations: obtiene TODAS las orgs (requiere permisos de super admin)
 */
export function useAllOrganizations() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = createClient();

  const fetchAllOrganizations = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch ALL organizations (requires super admin permissions)
      const { data: orgsData, error: orgsError } = await supabase
        .from('organizations')
        .select('*')
        .order('name');

      if (orgsError) {
        throw orgsError;
      }

      setOrganizations(orgsData || []);
    } catch (err) {
      const error = err as { name?: string; message?: string; code?: string; status?: number; details?: string; hint?: string };
      const name = error?.name ?? 'Unknown';
      const message = error?.message ?? (typeof err === 'string' ? err : '');
      const code = error?.code ?? error?.status;
      const details = error?.details ?? error?.hint ?? undefined;
      
      console.error('Error fetching all organizations:', { name, message, code, details });
      
      const friendly =
        message?.toLowerCase().includes('row-level security')
          ? 'Sin permisos para ver todas las organizaciones. Se requiere rol de Super Admin.'
          : message || 'Failed to fetch organizations';
      
      setError(friendly);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchAllOrganizations();
  }, [fetchAllOrganizations]);

  return {
    organizations,
    loading,
    error,
    refetch: fetchAllOrganizations,
  };
}
