import { useState, useEffect, useCallback, useRef } from 'react';
// import { createClient } from '@/lib/supabase/client'; // Removed unused import
import { ErrorState, classifyError } from '@/types/error-state';
import { 
  loadAdminDataCache, 
  saveAdminDataCache, 
  type CachedData 
} from '@/lib/admin-data-cache';

/**
 * Hook optimizado para gestionar datos de SuperAdmin
 * Versión simplificada sin React Query para mayor estabilidad
 * @version 2.0.1
 */

export interface Organization {
  id: string;
  name: string;
  slug: string;
  subscription_plan: string;
  subscription_status: string;
  created_at: string;
  updated_at?: string;
  settings?: Record<string, unknown>;
  organization_members?: { count: number }[];
  members?: { count: number }[];
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

export interface PartialFailureState {
  statsFailure: ErrorState | null;
  organizationsFailure: ErrorState | null;
}

interface UseAdminDataOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  onError?: (error: string) => void;
  onSuccess?: () => void;
  initialOrganizations?: Organization[];
  initialStats?: AdminStats;
}

export function useAdminData(options: UseAdminDataOptions = {}) {
  const {
    autoRefresh = false,
    refreshInterval = 5 * 60 * 1000, // 5 minutos por defecto
    onError,
    onSuccess,
    initialOrganizations,
    initialStats,
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
  const [error, setError] = useState<ErrorState | null>(null);
  const [partialFailures, setPartialFailures] = useState<PartialFailureState>({
    statsFailure: null,
    organizationsFailure: null
  });
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [cachedData, setCachedData] = useState<CachedData | null>(null);
  
  // Refs for stable access in callbacks
  const onErrorRef = useRef(onError);
  const onSuccessRef = useRef(onSuccess);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    onErrorRef.current = onError;
    onSuccessRef.current = onSuccess;
  }, [onError, onSuccess]);

  // Load cached data on initialization
  useEffect(() => {
    const cached = loadAdminDataCache();
    if (cached) {
      console.log('💾 [useAdminData] Loading cached data');
      setCachedData(cached);
      setOrganizations(cached.organizations);
      setStats(cached.stats);
    }
  }, []);

  // Fetch function
  const fetchData = useCallback(async (isRefresh = false) => {
    if (isFetchingRef.current) {
      console.log('⏸️ [useAdminData] Already fetching, skipping...');
      return;
    }

    isFetchingRef.current = true;
    console.log('🔄 [useAdminData] Starting fetch...');

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      setPartialFailures({ statsFailure: null, organizationsFailure: null });

      let statsError: ErrorState | null = null;
      let orgsError: ErrorState | null = null;
      let statsData: AdminStats | null = null;
      let orgsData: Organization[] | null = null;

      const controller = new AbortController();
      const signal = controller.signal;
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const [statsRes, orgsRes] = await Promise.allSettled([
        fetch('/api/superadmin/stats', { headers: { 'Content-Type': 'application/json' }, cache: 'no-store', signal }),
        fetch('/api/superadmin/organizations?pageSize=100', { headers: { 'Content-Type': 'application/json' }, cache: 'no-store', signal }),
      ]);

      if (statsRes.status === 'fulfilled') {
        const r = statsRes.value;
        if (r.ok) {
          statsData = await r.json();
        } else {
          statsError = classifyError(new Error(`Error ${r.status}`), { url: '/api/superadmin/stats', method: 'GET' });
        }
      } else {
        statsError = classifyError(statsRes.reason, { url: '/api/superadmin/stats', method: 'GET' });
      }

      if (orgsRes.status === 'fulfilled') {
        const r = orgsRes.value;
        if (r.ok) {
          const json = await r.json();
          if (json.error) {
            orgsError = classifyError(new Error(json.error), { url: '/api/superadmin/organizations', method: 'GET' });
          } else {
            orgsData = json.organizations || [];
          }
        } else {
          orgsError = classifyError(new Error(`Error ${r.status}`), { url: '/api/superadmin/organizations', method: 'GET' });
        }
      } else {
        orgsError = classifyError(orgsRes.reason, { url: '/api/superadmin/organizations', method: 'GET' });
      }

      // Check if both fetches failed
      if (statsError && orgsError) {
        console.error('❌ [useAdminData] Both fetches failed');
        setError(statsError);
        setPartialFailures({ statsFailure: statsError, organizationsFailure: orgsError });
        
        // Use cached data if available
        if (cachedData) {
          console.log('💾 [useAdminData] Using cached data');
          setOrganizations(cachedData.organizations);
          setStats(cachedData.stats);
        }
        
        onErrorRef.current?.(statsError.message);
        return;
      }

      // Set partial failure indicators
      if (statsError || orgsError) {
        setPartialFailures({
          statsFailure: statsError,
          organizationsFailure: orgsError
        });
      }

      // Update state with fetched data
      if (statsData) {
        const newStats = {
          totalOrganizations: statsData.totalOrganizations || 0,
          totalUsers: statsData.totalUsers || 0,
          activeSubscriptions: statsData.activeOrganizations || 0,
          totalRevenue: statsData.totalRevenue || 0,
          monthlyRevenue: statsData.monthlyRevenue || 0,
          activeOrganizations: statsData.activeOrganizations || 0,
          activeUsers: statsData.activeUsers || 0,
        };
        setStats(newStats);
      }

      if (orgsData) {
        setOrganizations(orgsData);
      }

      setLastFetch(new Date());

      // Save to cache
      if (statsData || orgsData) {
        const dataToCache = {
          organizations: orgsData || organizations,
          stats: statsData ? {
            totalOrganizations: statsData.totalOrganizations || 0,
            totalUsers: statsData.totalUsers || 0,
            activeSubscriptions: statsData.activeOrganizations || 0,
            totalRevenue: statsData.totalRevenue || 0,
            monthlyRevenue: statsData.monthlyRevenue || 0,
            activeOrganizations: statsData.activeOrganizations || 0,
            activeUsers: statsData.activeUsers || 0,
          } : stats
        };

        const cacheSaved = saveAdminDataCache(dataToCache.organizations, dataToCache.stats);
        if (cacheSaved) {
          setCachedData({
            organizations: dataToCache.organizations,
            stats: dataToCache.stats,
            timestamp: new Date(),
            isStale: false,
            version: '1.0.0'
          });
        }
      }

      console.log('✅ [useAdminData] Fetch completed successfully');
      onSuccessRef.current?.();

    } catch (err: unknown) {
      console.error('❌ [useAdminData] Fatal error:', err);
      const errorState = classifyError(err, {
        url: '/api/superadmin/stats',
        method: 'GET',
      });
      setError(errorState);
      onErrorRef.current?.(errorState.message);
    } finally {
      try { clearTimeout(timeoutId); } catch {}
      setLoading(false);
      setRefreshing(false);
      isFetchingRef.current = false;
      console.log('🏁 [useAdminData] Fetch process completed');
    }
  }, [organizations, stats, cachedData]);

  const refresh = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Initial fetch
  useEffect(() => {
    // Only fetch if no initial data was provided
    if (!initialOrganizations) {
      fetchData();
    }
  }, [fetchData, initialOrganizations]);

  // Auto-refresh interval
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

  return {
    organizations,
    stats,
    loading,
    refreshing,
    error,
    partialFailures,
    lastFetch,
    cachedData,
    refresh,
    clearError
  };
}
