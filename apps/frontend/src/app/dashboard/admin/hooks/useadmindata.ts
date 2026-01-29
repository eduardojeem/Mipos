import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  subscription_plan: string;
  subscription_status: string;
  created_at: string;
  member_count?: number;
}

export interface AdminStats {
  totalOrganizations: number;
  totalUsers: number;
  activeSubscriptions: number;
  totalRevenue: number;
}

export function useAdminData() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    totalOrganizations: 0,
    totalUsers: 0,
    activeSubscriptions: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const { data: orgsData, error: orgsError } = await (supabase as any)
          .from('organizations')
          .select('*')
          .order('created_at', { ascending: false });

        if (orgsError) throw orgsError;

        const { count: usersCount, error: usersError } = await (supabase as any)
          .from('users')
          .select('*', { count: 'exact', head: true });

        if (usersError) throw usersError;

        const orgs = orgsData || [];
        const activeSubs = orgs.filter((o: any) => o.subscription_status === 'ACTIVE').length;
        const revenue = orgs.reduce((acc: number, org: any) => {
          if (org.subscription_status !== 'ACTIVE') return acc;
          if (org.subscription_plan === 'PRO') return acc + 29;
          if (org.subscription_plan === 'ENTERPRISE') return acc + 99;
          return acc;
        }, 0);

        setOrganizations(orgs as Organization[]);
        setStats({
          totalOrganizations: orgs.length,
          totalUsers: usersCount || 0,
          activeSubscriptions: activeSubs,
          totalRevenue: revenue,
        });
      } catch (err: any) {
        setError(err?.message || 'Error cargando datos de administración');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return { organizations, stats, loading, error };
}
