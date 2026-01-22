'use client';

import { useQuery } from '@tanstack/react-query';

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
}

interface UseReportDataOptions {
  enabled?: boolean;
  refetchInterval?: number;
}

// Optimized Sales Report Hook
export function useOptimizedSalesReport(filters: ReportFilters, options: UseReportDataOptions = {}) {
  const { enabled = true, refetchInterval } = options;

  return useQuery({
    queryKey: ['sales-report', filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: filters.startDate.toISOString().split('T')[0],
        endDate: filters.endDate.toISOString().split('T')[0],
      });

      // Add optional filters
      if (filters.status) params.append('status', filters.status);
      if (filters.customerId) params.append('customerId', filters.customerId);
      if (filters.branchId) params.append('branchId', filters.branchId);
      if (filters.posId) params.append('posId', filters.posId);
      if (filters.paymentMethod) params.append('paymentMethod', filters.paymentMethod);

      const response = await fetch(`/api/reports/sales?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch sales report');
      return response.json();
    },
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: refetchInterval || (enabled ? 10 * 60 * 1000 : undefined), // 10 minutes default
    retry: 1,
  });
}

// Optimized Inventory Report Hook
export function useOptimizedInventoryReport(filters: ReportFilters, options: UseReportDataOptions = {}) {
  const { enabled = true, refetchInterval } = options;

  return useQuery({
    queryKey: ['inventory-report', filters],
    queryFn: async () => {
      const params = new URLSearchParams();

      // Add optional filters
      if (filters.category) params.append('category', filters.category);
      if (filters.productId) params.append('productId', filters.productId);
      if (filters.branchId) params.append('branchId', filters.branchId);

      const response = await fetch(`/api/reports/inventory?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch inventory report');
      return response.json();
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes (inventory changes less frequently)
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: refetchInterval || (enabled ? 15 * 60 * 1000 : undefined), // 15 minutes default
    retry: 1,
  });
}

// Optimized Customer Report Hook
export function useOptimizedCustomerReport(filters: ReportFilters, options: UseReportDataOptions = {}) {
  const { enabled = true, refetchInterval } = options;

  return useQuery({
    queryKey: ['customer-report', filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: filters.startDate.toISOString().split('T')[0],
        endDate: filters.endDate.toISOString().split('T')[0],
      });

      // Add optional filters
      if (filters.customerId) params.append('customerId', filters.customerId);
      if (filters.branchId) params.append('branchId', filters.branchId);
      if (filters.posId) params.append('posId', filters.posId);

      const response = await fetch(`/api/reports/customers?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch customer report');
      return response.json();
    },
    enabled,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 8 * 60 * 1000, // 8 minutes
    refetchInterval: refetchInterval || (enabled ? 12 * 60 * 1000 : undefined), // 12 minutes default
    retry: 1,
  });
}

// Optimized Financial Report Hook
export function useOptimizedFinancialReport(filters: ReportFilters, options: UseReportDataOptions = {}) {
  const { enabled = true, refetchInterval } = options;

  return useQuery({
    queryKey: ['financial-report', filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: filters.startDate.toISOString().split('T')[0],
        endDate: filters.endDate.toISOString().split('T')[0],
      });

      // Add optional filters
      if (filters.branchId) params.append('branchId', filters.branchId);
      if (filters.posId) params.append('posId', filters.posId);

      const response = await fetch(`/api/reports/financial?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch financial report');
      return response.json();
    },
    enabled,
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