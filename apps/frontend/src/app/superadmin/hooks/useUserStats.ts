import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

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
  const supabase = useMemo(() => createClient(), []);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'user-stats'],
    queryFn: async (): Promise<UserStats> => {
      // Obtener todos los usuarios para calcular stats
      const { data: allUsers, error: usersError } = await supabase
        .from('users')
        .select('id, organization_id, role, is_active');

      if (usersError) throw usersError;

      const users = allUsers || [];

      // Calcular estadísticas
      const total = users.length;
      const withOrgs = users.filter(u => u.organization_id !== null).length;
      const withoutOrgs = users.filter(u => u.organization_id === null).length;
      const activeUsers = users.filter(u => u.is_active).length;
      const inactiveUsers = users.filter(u => !u.is_active).length;

      // Contar por rol
      const byRole: Record<string, number> = {};
      users.forEach(u => {
        const role = u.role || 'UNKNOWN';
        byRole[role] = (byRole[role] || 0) + 1;
      });

      return {
        total,
        withOrgs,
        withoutOrgs,
        byRole,
        activeUsers,
        inactiveUsers,
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
