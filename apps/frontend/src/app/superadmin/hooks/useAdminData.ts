import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  subscription_plan: string;
  subscription_status: string;
  created_at: string;
  updated_at?: string;
  settings?: any;
}

export interface AdminStats {
  totalOrganizations: number;
  totalUsers: number;
  activeSubscriptions: number;
  totalRevenue: number;
  monthlyRevenue?: number;
  activeOrganizations?: number;
  activeUsers?: number;
}

interface UseAdminDataOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  onError?: (error: string) => void;
  onSuccess?: () => void;
}

export function useAdminData(options: UseAdminDataOptions = {}) {
  const {
    autoRefresh = false,
    refreshInterval = 30000,
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
      
      // Fetch stats from API
      const statsResponse = await fetch('/api/superadmin/stats', {
        signal: abortControllerRef.current.signal,
      });

      if (!statsResponse.ok) {
        throw new Error(`Error al cargar estadísticas: ${statsResponse.statusText}`);
      }

      const statsData = await statsResponse.json();

      // Fetch organizations directly from Supabase
      const { data: orgsData, error: orgsError } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (orgsError) {
        console.error('Error fetching organizations:', orgsError);
        // Don't throw, just log and continue with empty array
        setOrganizations([]);
      } else {
        setOrganizations(orgsData || []);
      }

      // Set stats from API
      setStats({
        totalOrganizations: statsData.totalOrganizations || 0,
        totalUsers: statsData.totalUsers || 0,
        activeSubscriptions: statsData.activeOrganizations || 0,
        totalRevenue: statsData.totalRevenue || 0,
        monthlyRevenue: statsData.monthlyRevenue || 0,
        activeOrganizations: statsData.activeOrganizations || 0,
        activeUsers: statsData.activeUsers || 0,
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

  const refresh = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
