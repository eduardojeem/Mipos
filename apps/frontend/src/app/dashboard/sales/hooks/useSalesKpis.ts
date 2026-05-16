'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export type SalesKpisRange =
  | 'today'
  | 'yesterday'
  | '7d'
  | '30d'
  | '90d'
  | 'mtd'
  | 'ytd';

export interface TopProduct {
  product_id: string;
  product_name: string;
  sku: string | null;
  qty: number;
  revenue: number;
}

export interface PaymentBreakdown {
  cash?: number;
  card?: number;
  transfer?: number;
  other?: number;
}

export interface SalesKpisPayload {
  window: { from: string; to: string; seconds: number };
  revenue: number;
  transactions: number;
  avg_ticket: number;
  gross_margin: number;
  gross_margin_pct: number;
  payment_breakdown: PaymentBreakdown;
  top_products_by_qty: TopProduct[];
  top_products_by_revenue: TopProduct[];
  previous_window: {
    from: string;
    to: string;
    revenue: number;
    transactions: number;
  };
  revenue_delta_pct: number | null;
  transactions_delta_pct: number | null;
}

interface UseSalesKpisOptions {
  range?: SalesKpisRange;
  from?: string;
  to?: string;
  /** Defaults to 60s — KPIs are aggregates, do not poll harder than this. */
  staleTime?: number;
  enabled?: boolean;
}

/**
 * Single round-trip KPI bundle for the sales dashboard.
 * Calls GET /api/sales/kpis which delegates to the get_sales_kpis Postgres RPC.
 * Returned data is already computed in SQL (revenue, txns, avg ticket, gross
 * margin, payment breakdown, top products, vs previous-window deltas).
 */
export function useSalesKpis(opts: UseSalesKpisOptions = {}) {
  const { range = 'today', from, to, staleTime = 60_000, enabled = true } = opts;
  const params = from && to ? { from, to } : { range };

  return useQuery<SalesKpisPayload | null>({
    queryKey: ['sales-kpis', params],
    queryFn: async () => {
      const response = await api.get('/sales/kpis', { params });
      const payload = (response.data as { data?: SalesKpisPayload }).data;
      return payload ?? null;
    },
    staleTime,
    refetchOnWindowFocus: false,
    retry: 1,
    enabled,
  });
}
