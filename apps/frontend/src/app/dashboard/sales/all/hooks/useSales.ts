import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { SalesFilters } from '../components/SalesFilters';
import { Sale } from '../components/SalesDataTable';

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
  includeItems?: boolean;
}

export function useSales({ filters, page, limit, includeItems = true }: UseSalesOptions) {
  const [isExporting, setIsExporting] = useState(false);

  // Build query parameters
  const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams();
    
    // Pagination
    params.set('page', String(page));
    params.set('limit', String(limit));
    
    // Include items
    if (includeItems) {
      params.set('include', 'items');
    }

    // Search (ID or customer)
    if (filters.search) {
      // Try to parse as sale ID first
      const saleIdMatch = filters.search.match(/^#?(\d+)$/);
      if (saleIdMatch) {
        params.set('id', saleIdMatch[1]);
      } else {
        // Otherwise treat as customer search
        params.set('customer_id', filters.search);
      }
    }

    // Date filters
    if (filters.dateFrom) {
      params.set('date_from', filters.dateFrom.toISOString().split('T')[0]);
    }
    if (filters.dateTo) {
      params.set('date_to', filters.dateTo.toISOString().split('T')[0]);
    }

    // Other filters
    if (filters.customerId) {
      params.set('customer_id', filters.customerId);
    }
    if (filters.paymentMethod) {
      params.set('payment_method', filters.paymentMethod);
    }
    if (filters.status) {
      params.set('status', filters.status);
    }
    if (filters.saleType) {
      params.set('sale_type', filters.saleType);
    }
    if (filters.minAmount !== undefined) {
      params.set('min_amount', String(filters.minAmount));
    }
    if (filters.maxAmount !== undefined) {
      params.set('max_amount', String(filters.maxAmount));
    }
    if (filters.hasCoupon !== undefined) {
      params.set('has_coupon', String(filters.hasCoupon));
    }

    return params.toString();
  }, [filters, page, limit, includeItems]);

  // Fetch sales data
  const { data, isLoading, error, refetch } = useQuery<SalesResponse>({
    queryKey: ['sales', 'all', buildQueryParams()],
    queryFn: async () => {
      const response = await fetch(`/api/sales?${buildQueryParams()}`);
      if (!response.ok) {
        throw new Error('Error al cargar las ventas');
      }
      return response.json();
    },
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });

  // Export function
  const exportSales = useCallback(async (exportFormat: 'csv' | 'excel' = 'csv') => {
    setIsExporting(true);
    try {
      // Build export params (same as query but with larger limit)
      const exportParams = buildQueryParams();
      const exportUrl = `/api/sales?${exportParams}&limit=1000`;
      
      const response = await fetch(exportUrl);
      if (!response.ok) {
        throw new Error('Error al exportar las ventas');
      }
      
      const data = await response.json();
      const sales = data.sales || data.data || [];

      if (exportFormat === 'csv') {
        // Convert to CSV
        const headers = [
          'ID Venta',
          'Fecha',
          'Cliente',
          'Email Cliente',
          'Teléfono Cliente',
          'Total',
          'Método de Pago',
          'Estado',
          'Tipo de Venta',
          'Notas'
        ];

        const rows = sales.map((sale: Sale) => [
          sale.id,
          format(new Date(sale.created_at), 'yyyy-MM-dd HH:mm:ss'),
          sale.customer?.name || 'Cliente no registrado',
          sale.customer?.email || '',
          sale.customer?.phone || '',
          sale.total_amount.toFixed(2),
          getPaymentMethodLabel(sale.payment_method),
          getStatusLabel(sale.status),
          getSaleTypeLabel(sale.sale_type),
          sale.notes || ''
        ]);

        const csvContent = [
          headers.join(','),
          ...rows.map((row: (string | number)[]) => row.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        // Download CSV
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `ventas_${format(new Date(), 'yyyy-MM-dd')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // For Excel, we'll create a more structured format
        // This is a simplified version - in a real app you might use a library like xlsx
        const excelData = sales.map((sale: Sale) => ({
          'ID Venta': sale.id,
          'Fecha': format(new Date(sale.created_at), 'yyyy-MM-dd HH:mm:ss'),
          'Cliente': sale.customer?.name || 'Cliente no registrado',
          'Email': sale.customer?.email || '',
          'Teléfono': sale.customer?.phone || '',
          'Total': sale.total_amount,
          'Método de Pago': getPaymentMethodLabel(sale.payment_method),
          'Estado': getStatusLabel(sale.status),
          'Tipo': getSaleTypeLabel(sale.sale_type),
          'Notas': sale.notes || '',
          'Cantidad de Productos': sale.items?.length || 0,
          'Subtotal': (sale.total_amount - (sale.tax_amount || 0) + (sale.discount_amount || 0)),
          'Descuento': sale.discount_amount || 0,
          'Impuesto': sale.tax_amount || 0
        }));

        // Convert to CSV for now (Excel would require additional library)
        const headers = Object.keys(excelData[0]);
        const rows = excelData.map((row: any) => headers.map(header => row[header]));
        
        const csvContent = [
          headers.join(','),
          ...rows.map((row: any[]) => row.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `ventas_${format(new Date(), 'yyyy-MM-dd')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Error exporting sales:', error);
      throw error;
    } finally {
      setIsExporting(false);
    }
  }, [buildQueryParams]);

  return {
    sales: data?.sales || data?.data || [],
    pagination: data?.pagination || { page: 1, limit: 20, total: 0, pages: 0 },
    isLoading,
    isExporting,
    error,
    refetch,
    exportSales,
  };
}

// Helper functions
function getStatusLabel(status: string): string {
  switch (status) {
    case 'COMPLETED':
      return 'Completada';
    case 'PENDING':
      return 'Pendiente';
    case 'CANCELLED':
      return 'Cancelada';
    case 'REFUNDED':
      return 'Reembolsada';
    default:
      return status;
  }
}

function getPaymentMethodLabel(method: string): string {
  switch (method) {
    case 'CASH':
      return 'Efectivo';
    case 'CARD':
      return 'Tarjeta';
    case 'TRANSFER':
      return 'Transferencia';
    case 'DIGITAL_WALLET':
      return 'Billetera Digital';
    case 'OTHER':
      return 'Otro';
    default:
      return method;
  }
}

function getSaleTypeLabel(type: string): string {
  switch (type) {
    case 'RETAIL':
      return 'Minorista';
    case 'WHOLESALE':
      return 'Mayorista';
    default:
      return type;
  }
}