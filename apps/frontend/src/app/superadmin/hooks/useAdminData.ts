import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ErrorState, classifyError } from '@/types/error-state';
import { 
  loadAdminDataCache, 
  saveAdminDataCache, 
  type CachedData 
} from '@/lib/admin-data-cache';

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
  const [error, setError] = useState<ErrorState | null>(null);
  const [partialFailures, setPartialFailures] = useState<PartialFailureState>({
    statsFailure: null,
    organizationsFailure: null
  });
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [cachedData, setCachedData] = useState<CachedData | null>(null);

  // Memoize the Supabase client to avoid creating new instances on every render
  const supabase = useMemo(() => {
    console.log('🔧 [useAdminData] Creating Supabase client instance');
    return createClient();
  }, []);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isFetchingRef = useRef<boolean>(false);
  
  // Refs for stable access in callbacks
  const onErrorRef = useRef(onError);
  const onSuccessRef = useRef(onSuccess);
  const cachedDataRef = useRef(cachedData);

  useEffect(() => {
    onErrorRef.current = onError;
    onSuccessRef.current = onSuccess;
    cachedDataRef.current = cachedData;
  }, [onError, onSuccess, cachedData]);

  // Load cached data on initialization
  useEffect(() => {
    console.log('💾 [useAdminData] Loading cached data on initialization...');
    const cached = loadAdminDataCache();
    
    if (cached) {
      console.log('✅ [useAdminData] Cached data loaded:', {
        organizationCount: cached.organizations.length,
        isStale: cached.isStale,
        timestamp: cached.timestamp
      });
      setCachedData(cached);
      
      // Pre-populate state with cached data
      setOrganizations(cached.organizations);
      setStats(cached.stats);
    } else {
      console.log('ℹ️ [useAdminData] No cached data available');
    }
  }, []);

  const fetchData = useCallback(async (isRefresh = false) => {
    console.log(`🔄 [useAdminData] Starting data fetch (isRefresh: ${isRefresh})...`);

    if (abortControllerRef.current && isFetchingRef.current) {
      console.log('⏹️ [useAdminData] Aborting previous request');
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    isFetchingRef.current = true;

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      setPartialFailures({ statsFailure: null, organizationsFailure: null });

      // Track partial failures
      let statsError: ErrorState | null = null;
      let orgsError: ErrorState | null = null;
      let statsData: {
        totalOrganizations?: number;
        totalUsers?: number;
        activeOrganizations?: number;
        totalRevenue?: number;
        monthlyRevenue?: number;
        activeUsers?: number;
      } | null = null;
      let orgsData: Organization[] | null = null;

      // Fetch stats from API (independently)
      try {
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
          const apiError = new Error(`Error al cargar estadísticas (${statsResponse.status}): ${statsResponse.statusText}`) as Error & { statusCode: number };
          apiError.statusCode = statsResponse.status;
          throw apiError;
        }

        statsData = await statsResponse.json();
        console.log('✅ [useAdminData] Stats data received:', statsData);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          console.log('⏹️ [useAdminData] Stats request was aborted');
          // Do not re-throw abort errors; simply stop stats fetch gracefully
          return;
        }

        console.error('❌ [useAdminData] Error fetching stats:', {
          name: err instanceof Error ? err.name : 'Unknown',
          message: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined
        });

        // Classify the stats error
        statsError = classifyError(err, {
          url: '/api/superadmin/stats',
          method: 'GET',
        });

        console.warn('⚠️ [useAdminData] Stats fetch failed, will use cached or default values');
      }

      // Fetch organizations from Supabase (independently)
      try {
        console.log('🏢 [useAdminData] Fetching organizations from Supabase...');
        const { data, error: supabaseError } = await supabase
          .from('organizations')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (supabaseError) {
          console.error('❌ [useAdminData] Error fetching organizations:', {
            code: supabaseError.code,
            message: supabaseError.message,
            details: supabaseError.details,
            hint: supabaseError.hint
          });
          throw supabaseError;
        }

        orgsData = data || [];
        console.log('✅ [useAdminData] Organizations fetched:', orgsData.length);
      } catch (err: unknown) {
        console.error('❌ [useAdminData] Error fetching organizations:', {
          name: err instanceof Error ? err.name : 'Unknown',
          message: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined
        });

        // Gracefully handle aborts
        if (err instanceof Error && err.name === 'AbortError') {
          console.log('⏹️ [useAdminData] Organizations request was aborted');
          return;
        }

        // Classify the organizations error
        orgsError = classifyError(err, {
          url: 'supabase:organizations',
          method: 'SELECT',
        });

        console.warn('⚠️ [useAdminData] Organizations fetch failed, will use cached or empty array');
      }

      // Check if both fetches failed
      if (statsError && orgsError) {
        console.error('❌ [useAdminData] Both stats and organizations fetch failed');
        
        // Set the primary error to the stats error (as it's the main data source)
        setError(statsError);
        setPartialFailures({ statsFailure: statsError, organizationsFailure: orgsError });
        
        // Use cached data if available
        setCachedData(prevCached => {
          if (prevCached) {
            console.log('💾 [useAdminData] Using cached data due to complete fetch failure');
            setOrganizations(prevCached.organizations);
            setStats(prevCached.stats);
            
            // Mark cached data as stale
            return {
              ...prevCached,
              isStale: true
            };
          }
          return prevCached;
        });
        
        onErrorRef.current?.(statsError.message);
        return;
      }

      // Handle partial success - update what we got
      if (statsData) {
        console.log('✅ [useAdminData] Updating stats with fresh data');
        setStats({
          totalOrganizations: statsData.totalOrganizations || 0,
          totalUsers: statsData.totalUsers || 0,
          activeSubscriptions: statsData.activeOrganizations || 0,
          totalRevenue: statsData.totalRevenue || 0,
          monthlyRevenue: statsData.monthlyRevenue || 0,
          activeOrganizations: statsData.activeOrganizations || 0,
          activeUsers: statsData.activeUsers || 0,
        });
      } else if (cachedDataRef.current) {
        console.log('💾 [useAdminData] Using cached stats due to stats fetch failure');
        setStats(cachedDataRef.current.stats);
      }

      if (orgsData) {
        console.log('✅ [useAdminData] Updating organizations with fresh data');
        setOrganizations(orgsData);
      } else if (cachedDataRef.current) {
        console.log('💾 [useAdminData] Using cached organizations due to organizations fetch failure');
        setOrganizations(cachedDataRef.current.organizations);
      } else {
        console.log('⚠️ [useAdminData] No organizations data available, using empty array');
        setOrganizations([]);
      }

      // Set partial failure indicators
      if (statsError || orgsError) {
        console.warn('⚠️ [useAdminData] Partial failure detected:', {
          statsFailure: !!statsError,
          organizationsFailure: !!orgsError
        });
        setPartialFailures({
          statsFailure: statsError,
          organizationsFailure: orgsError
        });
      }

      setLastFetch(new Date());
      
      // Save successful data to cache (only save what we successfully fetched)
      if (statsData || orgsData) {
        console.log('💾 [useAdminData] Saving available data to cache...');
        const dataToCache = {
          organizations: orgsData || cachedDataRef.current?.organizations || [],
          stats: statsData ? {
            totalOrganizations: statsData.totalOrganizations || 0,
            totalUsers: statsData.totalUsers || 0,
            activeSubscriptions: statsData.activeOrganizations || 0,
            totalRevenue: statsData.totalRevenue || 0,
            monthlyRevenue: statsData.monthlyRevenue || 0,
            activeOrganizations: statsData.activeOrganizations || 0,
            activeUsers: statsData.activeUsers || 0,
          } : cachedDataRef.current?.stats || {
            totalOrganizations: 0,
            totalUsers: 0,
            activeSubscriptions: 0,
            totalRevenue: 0,
          }
        };

        const cacheSaved = saveAdminDataCache(dataToCache.organizations, dataToCache.stats);
        
        if (cacheSaved) {
          // Update cached data state with fresh data
          setCachedData({
            organizations: dataToCache.organizations,
            stats: dataToCache.stats,
            timestamp: new Date(),
            isStale: false,
            version: '1.0.0'
          });
        }
      }
      
      console.log('✅ [useAdminData] Data fetch completed (partial success allowed)');
      onSuccessRef.current?.();

    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('⏹️ [useAdminData] Request was aborted');
        return;
      }

      console.error('❌ [useAdminData] Fatal error fetching admin data:', {
        name: err instanceof Error ? err.name : 'Unknown',
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined
      });

      // Classify the error into a structured ErrorState
      const errorState = classifyError(err, {
        url: '/api/superadmin/stats',
        method: 'GET',
      });

      console.error('❌ [useAdminData] Classified error:', {
        type: errorState.type,
        message: errorState.message,
        statusCode: errorState.statusCode,
        retryable: errorState.retryable
      });

      setError(errorState);
      
      // Display cached data when fresh data fails
      // Use functional update to get the latest cached data
      setCachedData(prevCached => {
        if (prevCached) {
          console.log('💾 [useAdminData] Using cached data due to fetch failure');
          setOrganizations(prevCached.organizations);
          setStats(prevCached.stats);
          
          // Mark cached data as stale
          return {
            ...prevCached,
            isStale: true
          };
        }
        return prevCached;
      });
      
      onErrorRef.current?.(errorState.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
      isFetchingRef.current = false;
      abortControllerRef.current = null;
      console.log('🏁 [useAdminData] Data fetch process completed');
    }
  }, [supabase]);

  const refresh = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  const clearError = useCallback(() => {
    console.log('🧹 [useAdminData] Clearing error state');
    setError(null);
  }, []);

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
      // No abort en cleanup para evitar mensajes en consola; dejamos finalizar silenciosamente
      isFetchingRef.current = false;
      abortControllerRef.current = null;
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
    partialFailures,
    lastFetch,
    cachedData,
    refresh,
    clearError
  };
}
