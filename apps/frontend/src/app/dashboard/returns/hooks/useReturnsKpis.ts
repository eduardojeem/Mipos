'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export interface ReturnsKpis {
  period_days: number;
  since: string;
  total_count: number;
  total_amount: number;
  by_status: {
    pending: number;
    approved: number;
    completed: number;
    rejected: number;
  };
  /** Promedio de segundos entre created_at y processed_at de las
   *  devoluciones procesadas en el período. 0 si no hay datos. */
  avg_seconds_to_process: number;
  sales_count_period: number;
  /** Devoluciones / ventas en el período, en porcentaje. */
  return_rate_pct: number;
  top_products: Array<{
    product_id: string;
    product_name: string;
    qty: number;
    return_count: number;
  }>;
  top_reasons: Array<{ reason: string; cnt: number }>;
  top_cashiers: Array<{
    user_id: string;
    user_name: string;
    cnt: number;
    amount: number;
  }>;
  fraud_signals: {
    /** Returns donde el cajero creador es el mismo que vendió la venta
     *  original. Legítimo en negocios de un solo dueño, pero alto número
     *  en multi-cajero merece auditoría. */
    self_return_count: number;
    self_return_amount: number;
  };
}

interface UseReturnsKpisOptions {
  /** Días hacia atrás. Clamped 1..365 server-side. */
  periodDays?: number;
  /** Si false, el query no corre. Útil para gates de permiso. */
  enabled?: boolean;
}

/**
 * Métricas server-side del módulo de devoluciones. Reemplaza el cómputo
 * client-side anterior (que solo veía la página actual). Usa el RPC
 * get_returns_kpis() vía /api/returns/kpis.
 */
export function useReturnsKpis(options: UseReturnsKpisOptions = {}) {
  const periodDays = options.periodDays ?? 30;
  const enabled = options.enabled ?? true;

  return useQuery<{ kpis: ReturnsKpis; period_days: number }>({
    queryKey: ['returns', 'kpis', periodDays],
    enabled,
    queryFn: async () => {
      const res = await api.get('/returns/kpis', { params: { period: periodDays } });
      return res.data;
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}
