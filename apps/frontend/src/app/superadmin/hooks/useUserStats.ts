import { useQuery } from '@tanstack/react-query';

export interface UserStats {
  total: number;
  withOrgs: number;
  withoutOrgs: number;
  byRole: Record<string, number>;
  activeUsers: number;
  inactiveUsers: number;
}

/**
 * Hook para obtener estadísticas de usuarios
 */
export function useUserStats() {
  

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'user-stats'],
    queryFn: async (): Promise<UserStats> => {
      const res = await fetch('/api/superadmin/user-stats');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Error obteniendo estadísticas');
      const s = json.stats || {};
      return {
        total: s.total || 0,
        withOrgs: s.withOrgs || 0,
        withoutOrgs: s.withoutOrgs || 0,
        byRole: s.byRole || {},
        activeUsers: s.activeUsers || 0,
        inactiveUsers: s.inactiveUsers || 0,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  return {
    stats: data || {
      total: 0,
      withOrgs: 0,
      withoutOrgs: 0,
      byRole: {},
      activeUsers: 0,
      inactiveUsers: 0,
    },
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    refresh: refetch,
  };
}
