import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

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
  totalRevenue: number; // Mocked for now or derived
}

export function useAdminData() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    totalOrganizations: 0,
    totalUsers: 0,
    activeSubscriptions: 0,
    totalRevenue: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // Fetch Organizations
        const { data: orgsData, error: orgsError } = await supabase
          .from('organizations')
          .select('*')
          .order('created_at', { ascending: false });

        if (orgsError) throw orgsError;

        // Fetch Users count (using the public users table which we enabled RLS for Super Admin)
        const { count: usersCount, error: usersError } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true });

        if (usersError) throw usersError;

        // Process Data
        const orgs = orgsData || [];
        
        // Calculate Stats
        const activeSubs = orgs.filter(o => o.subscription_status === 'ACTIVE').length;
        
        // Mock Revenue Calculation based on plan (e.g. PRO = $29, ENTERPRISE = $99)
        const revenue = orgs.reduce((acc, org) => {
          if (org.subscription_status !== 'ACTIVE') return acc;
          if (org.subscription_plan === 'PRO') return acc + 29;
          if (org.subscription_plan === 'ENTERPRISE') return acc + 99;
          return acc;
        }, 0);

        setOrganizations(orgs);
        setStats({
          totalOrganizations: orgs.length,
          totalUsers: usersCount || 0,
          activeSubscriptions: activeSubs,
          totalRevenue: revenue
        });

      } catch (err: any) {
        console.error('Error fetching admin data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [supabase]);

  return { organizations, stats, loading, error };
}
