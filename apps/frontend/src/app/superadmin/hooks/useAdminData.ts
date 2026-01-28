import { useState, useEffect, useCallback, useRef } from 'react';
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
  totalRevenue: number;
}

interface UseAdminDataOptions {
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
  onError?: (error: string) => void;
  onSuccess?: () => void;
}

export function useAdminData(options: UseAdminDataOptions = {}) {
  const {
    autoRefresh = false,
    refreshInterval = 30000, // 30 seconds default
    onError,
    onSuccess,
  } = options;

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    totalOrganizations: 0,
    totalUsers: 0,
    activeSubscriptions: 0,
    totalRevenue: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  
  const supabase = createClient();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      // Fetch Organizations and Users in parallel
      const [orgsResult, usersResult] = await Promise.all([
        supabase
          .from('organizations')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
      ]);

      if (orgsResult.error) throw orgsResult.error;
      if (usersResult.error) throw usersResult.error;

      // Process Data
      const orgs = orgsResult.data || [];
      
      // Calculate Stats
      const activeSubs = orgs.filter(o => o.subscription_status === 'ACTIVE').length;
      
      // Revenue Calculation based on plan
      const revenue = orgs.reduce((acc, org) => {
        if (org.subscription_status !== 'ACTIVE') return acc;
        if (org.subscription_plan === 'PRO') return acc + 29;
        if (org.subscription_plan === 'ENTERPRISE') return acc + 99;
        return acc;
      }, 0);

      setOrganizations(orgs);
      setStats({
        totalOrganizations: orgs.length,
        totalUsers: usersResult.count || 0,
        activeSubscriptions: activeSubs,
        totalRevenue: revenue
      });

      setLastFetch(new Date());
      onSuccess?.();

    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Request aborted');
        return;
      }
      
      console.error('Error fetching admin data:', err);
      const errorMessage = err.message || 'Error desconocido al cargar datos';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
      abortControllerRef.current = null;
    }
  }, [supabase, onError, onSuccess]);

  // Manual refresh function
  const refresh = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh) return;

    intervalRef.current = setInterval(() => {
      fetchData(true);
    }, refreshInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, fetchData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return { 
    organizations, 
    stats, 
    loading, 
    refreshing,
    error, 
    lastFetch,
    refresh 
  };
}
