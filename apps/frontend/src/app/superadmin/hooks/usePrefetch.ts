import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

/**
 * Hook para prefetch de datos comunes del SuperAdmin
 * Mejora la percepción de velocidad al cargar datos antes de que el usuario navegue
 */
export function useSuperAdminPrefetch() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Prefetch organizations (datos más consultados)
    queryClient.prefetchQuery({
      queryKey: ['admin', 'organizations', { 
        filters: {}, 
        sortBy: 'created_at', 
        sortOrder: 'desc', 
        pageSize: 100, 
        page: 1 
      }],
      queryFn: async () => {
        const response = await fetch('/api/superadmin/organizations?pageSize=100&sortBy=created_at&sortOrder=desc&page=1');
        if (!response.ok) throw new Error('Error al prefetch organizations');
        return await response.json();
      },
      staleTime: 10 * 60 * 1000, // 10 minutos
    });

    // Prefetch users (segunda página más visitada)
    queryClient.prefetchQuery({
      queryKey: ['admin', 'users', { 
        filters: {}, 
        sortBy: 'created_at', 
        sortOrder: 'desc', 
        pageSize: 50, 
        page: 1 
      }],
      queryFn: async () => {
        const response = await fetch('/api/superadmin/users?page=1&limit=50');
        if (!response.ok) throw new Error('Error al prefetch users');
        return await response.json();
      },
      staleTime: 5 * 60 * 1000, // 5 minutos
    });

    // Prefetch stats (dashboard)
    queryClient.prefetchQuery({
      queryKey: ['admin', 'stats'],
      queryFn: async () => {
        const response = await fetch('/api/superadmin/stats');
        if (!response.ok) throw new Error('Error al prefetch stats');
        return await response.json();
      },
      staleTime: 5 * 60 * 1000, // 5 minutos
    });
  }, [queryClient]);
}
