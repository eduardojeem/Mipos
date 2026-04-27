'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useCurrentOrganizationId } from '@/hooks/use-current-organization';

export interface ReportFilters {
  startDate: Date;
  endDate: Date;
  category?: string;
  status?: string;
  customerId?: string;
  productId?: string;
  branchId?: string;
  posId?: string;
  paymentMethod?: string;
  inventoryOnlyLowStock?: boolean;
  inventoryStockLimit?: number;
}

interface UseReportDataOptions {
  enabled?: boolean;
  refetchInterval?: number;
}

export interface SalesReportPoint {
  date: string;
  sales: number;
}

export interface SalesCategoryPoint {
  category: string;
  sales: number;
}

export interface SalesTopProduct {
  name: string;
  sales: number;
  quantity: number;
}

export interface SalesData {
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
  salesByDate: SalesReportPoint[];
  salesByCategory: SalesCategoryPoint[];
  topProducts: SalesTopProduct[];
  trends?: {
    salesPct?: number;
    ordersPct?: number;
    aovPct?: number;
  };
  previousPeriod?: {
    totalSales: number;
    totalOrders: number;
    averageOrderValue: number;
  };
}

export interface InventoryCategoryPoint {
  category: string;
  count: number;
}

export interface InventoryStockLevel {
  name: string;
  stock: number;
  status: string;
}

export interface InventoryData {
  totalProducts: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalValue: number;
  categoryBreakdown: InventoryCategoryPoint[];
  stockLevels: InventoryStockLevel[];
}

export interface CustomerSegmentPoint {
  segment: string;
  count: number;
}

export interface TopCustomer {
  name: string;
  totalSpent: number;
  orders: number;
}

export interface CustomerData {
  totalCustomers: number;
  newCustomers: number;
  activeCustomers: number;
  customerLifetimeValue: number;
  customerSegments: CustomerSegmentPoint[];
  topCustomers: TopCustomer[];
  trends?: {
    newCustomersPct?: number;
  };
  previousPeriod?: {
    newCustomers: number;
  };
}

export interface RevenueByMonthPoint {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export interface ExpenseBreakdownPoint {
  category: string;
  amount: number;
}

export interface FinancialData {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  revenueByMonth: RevenueByMonthPoint[];
  expenseBreakdown: ExpenseBreakdownPoint[];
  trends?: {
    revenuePct?: number;
    expensesPct?: number;
    profitPct?: number;
    marginPct?: number;
  };
  previousPeriod?: {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    profitMargin: number;
  };
}

// Optimized Sales Report Hook
export function useOptimizedSalesReport(filters: ReportFilters, options: UseReportDataOptions = {}) {
  const { enabled = true, refetchInterval } = options;
  const organizationId = useCurrentOrganizationId();

  return useQuery<SalesData>({
    queryKey: ['sales-report', organizationId, filters],
    queryFn: async () => {
      const params: Record<string, string> = {
        startDate: filters.startDate.toISOString().split('T')[0],
        endDate: filters.endDate.toISOString().split('T')[0],
      };

      if (filters.status) params.status = filters.status;
      if (filters.customerId) params.customerId = filters.customerId;
      if (filters.branchId) params.branchId = filters.branchId;
      if (filters.posId) params.posId = filters.posId;
      if (filters.paymentMethod) params.paymentMethod = filters.paymentMethod;

      const response = await api.get('/reports/sales', { params });
      return response.data;
    },
    enabled: enabled && !!organizationId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: refetchInterval || (enabled ? 10 * 60 * 1000 : undefined), // 10 minutes default
    retry: 1,
  });
}

// Optimized Inventory Report Hook
export function useOptimizedInventoryReport(filters: ReportFilters, options: UseReportDataOptions = {}) {
  const { enabled = true, refetchInterval } = options;
  const organizationId = useCurrentOrganizationId();

  return useQuery<InventoryData>({
    queryKey: ['inventory-report', organizationId, filters],
    queryFn: async () => {
      const params: Record<string, string> = {};

      if (filters.category) params.category = filters.category;
      if (filters.productId) params.productId = filters.productId;
      if (filters.inventoryOnlyLowStock) params.onlyLowStock = 'true';
      if (typeof filters.inventoryStockLimit === 'number') params.stockLimit = String(filters.inventoryStockLimit);

      const response = await api.get('/reports/inventory', { params });
      return response.data;
    },
    enabled: enabled && !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: refetchInterval || (enabled ? 15 * 60 * 1000 : undefined), // 15 minutes default
    retry: 1,
  });
}

// Optimized Customer Report Hook
export function useOptimizedCustomerReport(filters: ReportFilters, options: UseReportDataOptions = {}) {
  const { enabled = true, refetchInterval } = options;
  const organizationId = useCurrentOrganizationId();

  return useQuery<CustomerData>({
    queryKey: ['customer-report', organizationId, filters],
    queryFn: async () => {
      const params: Record<string, string> = {
        startDate: filters.startDate.toISOString().split('T')[0],
        endDate: filters.endDate.toISOString().split('T')[0],
      };

      if (filters.customerId) params.customerId = filters.customerId;
      if (filters.branchId) params.branchId = filters.branchId;
      if (filters.posId) params.posId = filters.posId;

      const response = await api.get('/reports/customers', { params });
      return response.data;
    },
    enabled: enabled && !!organizationId,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 8 * 60 * 1000, // 8 minutes
    refetchInterval: refetchInterval || (enabled ? 12 * 60 * 1000 : undefined), // 12 minutes default
    retry: 1,
  });
}

// Optimized Financial Report Hook
export function useOptimizedFinancialReport(filters: ReportFilters, options: UseReportDataOptions = {}) {
  const { enabled = true, refetchInterval } = options;
  const organizationId = useCurrentOrganizationId();

  return useQuery<FinancialData>({
    queryKey: ['financial-report', organizationId, filters],
    queryFn: async () => {
      const params: Record<string, string> = {
        startDate: filters.startDate.toISOString().split('T')[0],
        endDate: filters.endDate.toISOString().split('T')[0],
      };

      if (filters.branchId) params.branchId = filters.branchId;
      if (filters.posId) params.posId = filters.posId;

      const response = await api.get('/reports/financial', { params });
      return response.data;
    },
    enabled: enabled && !!organizationId,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 8 * 60 * 1000, // 8 minutes
    refetchInterval: refetchInterval || (enabled ? 12 * 60 * 1000 : undefined), // 12 minutes default
    retry: 1,
  });
}

// Backward compatibility - map old hooks to new optimized ones
export const useSalesReport = useOptimizedSalesReport;
export const useInventoryReport = useOptimizedInventoryReport;
export const useCustomerReport = useOptimizedCustomerReport;
export const useFinancialReport = useOptimizedFinancialReport;
