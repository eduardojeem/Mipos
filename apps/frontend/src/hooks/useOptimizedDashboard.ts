import { useQuery, keepPreviousData } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { api } from '@/lib/api';
import { useCurrentOrganizationId } from '@/hooks/use-current-organization';
import type { DashboardOverviewData, DashboardRecentSale } from '@/lib/dashboard/types';

export type DashboardStats = DashboardOverviewData;
export type RecentSale = DashboardRecentSale;
export type DashboardSummary = DashboardOverviewData;

type DashboardApiError = AxiosError<{ message?: string }>;

interface UseOptimizedDashboardOptions {
  initialData?: DashboardSummary | null;
}

export function useOptimizedDashboard(options: UseOptimizedDashboardOptions = {}) {
  const orgId = useCurrentOrganizationId();
  const { initialData } = options;

  return useQuery<DashboardSummary>({
    queryKey: ['dashboard-optimized-summary', orgId],
    queryFn: async () => {
      if (!orgId) throw new Error('No organization selected');

      // Nueva arquitectura: Consolidado desde el Backend API para evitar N+1
      try {
        const { data } = await api.get('/dashboard/overview', {
          headers: { 'x-organization-id': orgId },
        });
        
        if (!data || !data.data) {
          throw new Error('Formato de datos inválido desde el servidor');
        }

        return data.data as DashboardSummary;
      } catch (error) {
        // Fallback: usar fast-summary si overview no está disponible o devuelve 4xx/5xx
        const err = error as DashboardApiError;
        const status = err?.response?.status ?? 0;
        if (status === 400 || status === 401 || status === 404 || status >= 500) {
          try {
            const { data } = await api.get('/dashboard/fast-summary', {
              headers: { 'x-organization-id': orgId },
            });
            // fast-summary returns data directly (not wrapped in { data: ... })
            if (data) {
              return (data.data ?? data) as DashboardSummary;
            }
          } catch {}
        }
        console.error('Error fetching optimized dashboard from API:', error);
        throw error;
      }
    },
    enabled: !!orgId,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    refetchOnReconnect: true,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    retry: 2,
    initialData: initialData ?? undefined,
    initialDataUpdatedAt: initialData ? Date.now() : undefined,
  });
}
