'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { SalesKpisRange } from './useSalesKpis';

export type TrendRange = Extract<SalesKpisRange, '7d' | '30d' | '90d' | 'mtd' | 'ytd'>;

export interface TrendPoint {
  day: string;
  revenue: number;
  transactions: number;
}

interface UseSalesTrendOptions {
  range?: TrendRange;
  from?: string;
  to?: string;
  enabled?: boolean;
}

export function useSalesTrend(opts: UseSalesTrendOptions = {}) {
  const { range = '7d', from, to, enabled = true } = opts;
  const params = from && to ? { from, to } : { range };

  return useQuery<TrendPoint[]>({
    queryKey: ['sales-trend', params],
    queryFn: async () => {
      const response = await api.get('/sales/trend', { params });
      return (response.data as { data?: TrendPoint[] }).data ?? [];
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
    enabled,
  });
}
