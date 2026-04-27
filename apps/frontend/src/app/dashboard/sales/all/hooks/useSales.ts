import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { SalesFilters } from '../components/SalesFilters';
import { Sale } from '../components/SalesDataTable';
import { createLogger } from '@/lib/logger';
import { formatStatus, formatPaymentMethod, formatSaleType } from '@/lib/sales-formatters';
import { CACHE_CONFIG } from '@/config/sales.config';
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

interface UseSalesOptions {
  filters: SalesFilters;
  page: number;
  limit: number;
}

const logger = createLogger('SalesHook');

export function useSales({ filters, page, limit }: UseSalesOptions) {
  const [isExporting, setIsExporting] = useState(false);

  const buildParams = useCallback(
    (overrides: Record<string, any> = {}): Record<string, string> => {
      const params: Record<string, string> = {
        page: String(overrides.page ?? page),
        limit: String(overrides.limit ?? limit),
      };

      if (filters.search) params.search = filters.search;
      if (filters.dateFrom) params.date_from = format(filters.dateFrom, 'yyyy-MM-dd');
      if (filters.dateTo) params.date_to = format(filters.dateTo, 'yyyy-MM-dd');
      if (filters.customerId) params.customer_id = filters.customerId;
      if (filters.paymentMethod) params.payment_method = filters.paymentMethod;
      if (filters.status) params.status = filters.status;
      if (filters.saleType) params.sale_type = filters.saleType;
      if (filters.minAmount !== undefined) params.min_amount = String(filters.minAmount);
      if (filters.maxAmount !== undefined) params.max_amount = String(filters.maxAmount);
      if (filters.hasCoupon !== undefined) params.has_coupon = String(filters.hasCoupon);

      return { ...params, ...overrides };
    },
    [filters, page, limit],
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

  const exportSales = useCallback(async () => {
    setIsExporting(true);
    try {
      const response = await api.get<SalesResponse>('/sales', {
        params: buildParams({ page: 1, limit: 1000 }),
      });
      const sales: Sale[] = response.data?.sales || response.data?.data || [];

      const headers = [
        'ID Venta', 'Fecha', 'Cliente', 'Email Cliente', 'Teléfono',
        'Total', 'Método de Pago', 'Estado', 'Tipo de Venta', 'Notas',
      ];
      const rows = sales.map((sale) => [
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
        '\ufeff' +
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
