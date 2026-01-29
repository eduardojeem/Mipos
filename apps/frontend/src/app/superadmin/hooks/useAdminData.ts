import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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

  // Memoize the Supabase client to avoid creating new instances on every render
  const supabase = useMemo(() => {
    console.log('🔧 [useAdminData] Creating Supabase client instance');
    return createClient();
  }, []);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    console.log(`🔄 [useAdminData] Starting data fetch (isRefresh: ${isRefresh})...`);

    if (abortControllerRef.current) {
      console.log('⏹️ [useAdminData] Aborting previous request');
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
      console.log('📊 [useAdminData] Fetching stats from /api/superadmin/stats...');
      const statsResponse = await fetch('/api/superadmin/stats', {
        signal: abortControllerRef.current.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('📊 [useAdminData] Stats API response status:', statsResponse.status);

      if (!statsResponse.ok) {
        const errorText = await statsResponse.text();
        console.error('❌ [useAdminData] Stats API error:', {
          status: statsResponse.status,
          statusText: statsResponse.statusText,
          body: errorText
        });
        throw new Error(`Error al cargar estadísticas (${statsResponse.status}): ${statsResponse.statusText}`);
      }

      const statsData = await statsResponse.json();
      console.log('✅ [useAdminData] Stats data received:', statsData);

      // Fetch organizations directly from Supabase
      console.log('🏢 [useAdminData] Fetching organizations from Supabase...');
      const { data: orgsData, error: orgsError } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (orgsError) {
        console.error('❌ [useAdminData] Error fetching organizations:', {
          code: orgsError.code,
          message: orgsError.message,
          details: orgsError.details,
          hint: orgsError.hint
        });
        console.warn('⚠️ [useAdminData] Setting organizations to empty array due to error');
        setOrganizations([]);
      } else {
        console.log('✅ [useAdminData] Organizations fetched:', orgsData?.length || 0);
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
      console.log('✅ [useAdminData] Data fetch completed successfully');
      onSuccess?.();

    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('⏹️ [useAdminData] Request was aborted');
        return;
      }

      console.error('❌ [useAdminData] Fatal error fetching admin data:', {
        name: err.name,
        message: err.message,
        stack: err.stack
      });

      const errorMessage = err.message || 'Error desconocido al cargar datos';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
      abortControllerRef.current = null;
      console.log('🏁 [useAdminData] Data fetch process completed');
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
