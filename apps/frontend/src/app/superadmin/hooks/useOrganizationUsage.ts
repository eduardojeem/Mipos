'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Organization } from './useAdminData';

interface OrgUsage {
  db_size_mb: number | null;
  storage_size_mb: number | null;
  bandwidth_mb: number | null;
  counts: {
    products: number;
    customers: number;
    suppliers: number;
    sales: number;
    sale_items: number;
  };
}

interface UseOrganizationUsageOptions {
  organizations: Organization[];
}

// Eliminado: no estimar tamaños por heurística

interface UsageSettings {
  db_size_mb?: number;
  storage_size_mb?: number;
  bandwidth_mb?: number;
}

export function useOrganizationUsage({ organizations }: UseOrganizationUsageOptions) {
  const supabase = useMemo(() => createClient(), []);
  const [usageByOrg, setUsageByOrg] = useState<Record<string, OrgUsage>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const orgsRef = useRef(organizations);

  useEffect(() => {
    orgsRef.current = organizations;
  }, [organizations]);

  const fetchCountsForOrg = useCallback(async (orgId: string) => {
    const tables = ['products', 'customers', 'suppliers', 'sales', 'sale_items'] as const;
    const counts: Record<typeof tables[number], number> = {
      products: 0,
      customers: 0,
      suppliers: 0,
      sales: 0,
      sale_items: 0,
    };

    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId);

      if (error) {
        // Si falla, continuamos y dejamos 0 para ese conteo
        console.warn(`[useOrganizationUsage] Error contando ${table} para org ${orgId}:`, error.message);
        continue;
      }
      counts[table] = count || 0;
    }

    return counts;
  }, [supabase]);

  // Sin estimación: solo devolver null cuando no haya dato real

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const orgs = orgsRef.current;
      const results: Record<string, OrgUsage> = {};

      for (const org of orgs) {
        const counts = await fetchCountsForOrg(org.id);

        // Usar 'settings.usage' como fallback si existe
        const settings = (org.settings ?? {}) as { usage?: UsageSettings };
        const usageSettings: UsageSettings = settings.usage ?? {};

        const db_size_mb = usageSettings.db_size_mb ?? null;
        // No hay prefijo por organización en Storage: retornar null si no existe
        const storage_size_mb = usageSettings.storage_size_mb ?? null;
        const bandwidth_mb = usageSettings.bandwidth_mb ?? null;

        results[org.id] = {
          db_size_mb,
          storage_size_mb,
          bandwidth_mb,
          counts,
        };
      }

      setUsageByOrg(results);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Error al calcular uso por organización';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [fetchCountsForOrg]);

  useEffect(() => {
    if (organizations.length > 0) {
      refresh();
    }
  }, [organizations, refresh]);

  return {
    usageByOrg,
    loading,
    error,
    refresh,
  };
}
