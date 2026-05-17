import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { SalesFilters } from '../components/SalesFilters';
import { Sale } from '../components/SalesDataTable';
import { createLogger } from '@/lib/logger';
import { formatStatus, formatPaymentMethod, formatSaleType } from '@/lib/sales-formatters';
import { CACHE_CONFIG, SALES_CONFIG } from '@/config/sales.config';
import api from '@/lib/api';

interface SalesResponse {
  success: boolean;
  sales: Sale[];
  data: Sale[];
  count: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export type SortField = 'date' | 'total' | 'status';
export type SortOrder = 'asc' | 'desc';

interface UseSalesOptions {
  filters: SalesFilters;
  page: number;
  limit: number;
  sortBy?: SortField;
  sortOrder?: SortOrder;
}

const logger = createLogger('SalesHook');

export function useSales({ filters, page, limit, sortBy = 'date', sortOrder = 'desc' }: UseSalesOptions) {
  const [isExporting, setIsExporting] = useState(false);

  const buildParams = useCallback(
    (overrides: Record<string, any> = {}): Record<string, string> => {
      const params: Record<string, string> = {
        page: String(overrides.page ?? page),
        limit: String(overrides.limit ?? limit),
        sortBy: overrides.sortBy ?? sortBy,
        sortOrder: overrides.sortOrder ?? sortOrder,
      };

      if (filters.search) params.search = filters.search;
      // date_from/date_to were wrong — backend expects startDate/endDate
      if (filters.dateFrom) params.startDate = format(filters.dateFrom, 'yyyy-MM-dd');
      if (filters.dateTo) params.endDate = format(filters.dateTo, 'yyyy-MM-dd');
      if (filters.customerId) params.customerId = filters.customerId;
      if (filters.paymentMethod) params.paymentMethod = filters.paymentMethod;
      if (filters.status) params.status = filters.status;
      if (filters.saleType) params.saleType = filters.saleType;
      if (filters.minAmount !== undefined) params.minAmount = String(filters.minAmount);
      if (filters.maxAmount !== undefined) params.maxAmount = String(filters.maxAmount);

      return { ...params, ...overrides };
    },
    [filters, page, limit, sortBy, sortOrder],
  );

  const { data, isLoading, error, refetch } = useQuery<SalesResponse>({
    queryKey: ['sales', 'all', buildParams()],
    queryFn: async () => {
      const response = await api.get<SalesResponse>('/sales', { params: buildParams() });
      return response.data;
    },
    staleTime: CACHE_CONFIG.LIST_STALE_TIME,
    refetchOnWindowFocus: false,
  });

  // Paginate through all pages to build a complete export.
  // Backend cap is MAX_LIMIT (100) per request, so we fetch page by page.
  const exportSales = useCallback(async () => {
    setIsExporting(true);
    try {
      const pageSize = SALES_CONFIG.MAX_LIMIT;
      let currentPage = 1;
      let allSales: Sale[] = [];
      let totalPages = 1;

      do {
        const response = await api.get<SalesResponse>('/sales', {
          params: buildParams({ page: currentPage, limit: pageSize }),
        });
        const batch: Sale[] = response.data?.sales || response.data?.data || [];
        allSales = allSales.concat(batch);
        totalPages = response.data?.pagination?.pages ?? 1;
        currentPage++;
      } while (currentPage <= totalPages);

      const headers = [
        'ID Venta', 'Fecha', 'Cliente', 'Email Cliente', 'Teléfono',
        'Total', 'Método de Pago', 'Estado', 'Tipo de Venta', 'Notas',
      ];
      const rows = allSales.map((sale) => [
        sale.id,
        format(new Date(sale.created_at), 'yyyy-MM-dd HH:mm:ss'),
        sale.customer?.name || 'Cliente no registrado',
        sale.customer?.email || '',
        sale.customer?.phone || '',
        sale.total_amount.toFixed(2),
        formatPaymentMethod(sale.payment_method),
        formatStatus(sale.status),
        formatSaleType(sale.sale_type),
        sale.notes || '',
      ]);

      const csvContent =
        '﻿' +
        [headers, ...rows]
          .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
          .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ventas_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      logger.error('Error exporting sales:', err);
      throw err;
    } finally {
      setIsExporting(false);
    }
  }, [buildParams]);

  return {
    sales: data?.sales || data?.data || [],
    pagination: data?.pagination || { page: 1, limit, total: 0, pages: 0 },
    isLoading,
    isExporting,
    error,
    refetch,
    exportSales,
  };
}
