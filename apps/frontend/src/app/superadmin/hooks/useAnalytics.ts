import { useQuery } from '@tanstack/react-query';

export interface GrowthDataPoint {
  month: string;
  count: number;
}

export interface PlanDistribution {
  name: string;
  value: number;
}

export interface ActivityDataPoint {
  month: string;
  active: number;
  inactive: number;
}

export interface RevenueMetrics {
  mrr: number;
  arr: number;
  activeSubscriptions: number;
  averageRevenuePerSub: number;
}

export interface TopOrganization {
  name: string;
  user_count: number;
}

export interface AnalyticsData {
  growthData: GrowthDataPoint[];
  planDistribution: PlanDistribution[];
  activityData: ActivityDataPoint[];
  revenueData: RevenueMetrics;
  topOrganizations: TopOrganization[];
  generatedAt: string;
}

export function useAnalytics() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'analytics'],
    queryFn: async (): Promise<AnalyticsData> => {
      const response = await fetch('/api/superadmin/analytics');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al cargar analytics');
      }
      
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: false,
  });

  return {
    analytics: data || {
      growthData: [],
      planDistribution: [],
      activityData: [],
      revenueData: {
        mrr: 0,
        arr: 0,
        activeSubscriptions: 0,
        averageRevenuePerSub: 0,
      },
      topOrganizations: [],
      generatedAt: new Date().toISOString(),
    },
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    refresh: refetch,
  };
}
