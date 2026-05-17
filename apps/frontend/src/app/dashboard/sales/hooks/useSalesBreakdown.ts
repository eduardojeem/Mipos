'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { TrendRange } from './useSalesTrend';

export interface CategoryBreakdown {
  category: string;
  revenue: number;
  units: number;
}

interface UseSalesBreakdownOptions {
  range?: TrendRange;
  from?: string;
  to?: string;
  enabled?: boolean;
}

export function useSalesBreakdown(opts: UseSalesBreakdownOptions = {}) {
  const { range = '7d', from, to, enabled = true } = opts;
  const params = from && to ? { from, to } : { range };

  return useQuery<CategoryBreakdown[]>({
    queryKey: ['sales-breakdown', params],
    queryFn: async () => {
      const response = await api.get('/sales/breakdown', { params });
      return (response.data as { data?: CategoryBreakdown[] }).data ?? [];
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
    enabled,
  });
}
