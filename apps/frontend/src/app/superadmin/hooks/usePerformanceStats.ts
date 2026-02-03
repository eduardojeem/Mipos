import { useQuery } from '@tanstack/react-query';

export interface SlowQuery {
  query: string;
  calls: number;
  totalTime: number;
  meanTime: number;
  maxTime: number;
}

export interface PerformanceStats {
  hasStatStatements: boolean;
  slowQueries: SlowQuery[];
  queriesAnalyzed: number;
}

interface UsePerformanceStatsOptions {
  enabled?: boolean;
  limit?: number;
}

/**
 * Hook para obtener estadísticas de rendimiento de la base de datos
 */
export function usePerformanceStats(options: UsePerformanceStatsOptions = {}) {
  const { enabled = true, limit = 10 } = options;

  const { data, isLoading, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['admin', 'performance-stats', { limit }],
    queryFn: async () => {
      const response = await fetch(`/api/superadmin/monitoring/performance-stats?limit=${limit}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al cargar estadísticas de rendimiento');
      }
      const result = await response.json();
      return result.data as PerformanceStats;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  return {
    stats: data,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    refresh: refetch,
    lastFetch: dataUpdatedAt ? new Date(dataUpdatedAt) : null,
  };
}
