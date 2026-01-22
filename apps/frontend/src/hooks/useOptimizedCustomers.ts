import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';

/**
 * Optimized Customer Management Hooks - Phase 5 Optimization
 * 
 * React Query hooks for customer management with optimized caching,
 * background updates, and intelligent cache invalidation.
 */

// Types
interface CustomerSummary {
  total: number;
  active: number;
  inactive: number;
  vip: number;
  wholesale: number;
  regular: number;
  newThisMonth: number;
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  highValue: number;
  frequent: number;
  growthRate: number;
  activeRate: number;
  generatedAt: string;
}

interface CustomerListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'all' | 'active' | 'inactive';
  type?: 'all' | 'regular' | 'vip' | 'wholesale';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface CustomerAnalytics {
  overview: any;
  segmentation?: any;
  trends?: any;
  riskAnalysis: any;
  valueAnalysis: any;
  generatedAt: string;
}

interface CustomerSearchParams {
  q: string;
  limit?: number;
  suggestions?: boolean;
  stats?: boolean;
}

// Query Keys
export const customerKeys = {
  all: ['customers'] as const,
  summary: () => [...customerKeys.all, 'summary'] as const,
  lists: () => [...customerKeys.all, 'list'] as const,
  list: (params: CustomerListParams) => [...customerKeys.lists(), params] as const,
  analytics: (period?: string) => [...customerKeys.all, 'analytics', period] as const,
  search: (params: CustomerSearchParams) => [...customerKeys.all, 'search', params] as const,
  detail: (id: string) => [...customerKeys.all, 'detail', id] as const,
};

// Customer Summary Hook
export function useCustomerSummary() {
  return useQuery({
    queryKey: customerKeys.summary(),
    queryFn: async (): Promise<CustomerSummary> => {
      const response = await fetch('/api/customers/summary');
      if (!response.ok) {
        throw new Error('Failed to fetch customer summary');
      }
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch customer summary');
      }
      return data.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
}

// Customer List Hook
export function useCustomerList(params: CustomerListParams = {}) {
  return useQuery({
    queryKey: customerKeys.list(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      
      if (params.page) searchParams.set('page', params.page.toString());
      if (params.limit) searchParams.set('limit', params.limit.toString());
      if (params.search) searchParams.set('search', params.search);
      if (params.status) searchParams.set('status', params.status);
      if (params.type) searchParams.set('type', params.type);
      if (params.sortBy) searchParams.set('sortBy', params.sortBy);
      if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);

      const response = await fetch(`/api/customers/list?${searchParams}`);
      if (!response.ok) {
        throw new Error('Failed to fetch customer list');
      }
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch customer list');
      }
      return data.data;
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 3 * 60 * 1000, // 3 minutes
    refetchOnWindowFocus: false,
    // Enable background refetch for active queries
    refetchInterval: params.search ? undefined : 3 * 60 * 1000, // 3 minutes for non-search queries
  });
}

// Customer Analytics Hook
export function useCustomerAnalytics(period: string = '30', options: { segmentation?: boolean; trends?: boolean } = {}) {
  return useQuery({
    queryKey: customerKeys.analytics(period),
    queryFn: async (): Promise<CustomerAnalytics> => {
      const searchParams = new URLSearchParams({
        period,
        segmentation: options.segmentation ? 'true' : 'false',
        trends: options.trends ? 'true' : 'false'
      });

      const response = await fetch(`/api/customers/analytics?${searchParams}`);
      if (!response.ok) {
        throw new Error('Failed to fetch customer analytics');
      }
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch customer analytics');
      }
      return data.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
  });
}

// Customer Search Hook
export function useCustomerSearch(params: CustomerSearchParams) {
  return useQuery({
    queryKey: customerKeys.search(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        q: params.q,
        limit: (params.limit || 10).toString(),
        suggestions: params.suggestions ? 'true' : 'false',
        stats: params.stats ? 'true' : 'false'
      });

      const response = await fetch(`/api/customers/search?${searchParams}`);
      if (!response.ok) {
        throw new Error('Failed to search customers');
      }
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to search customers');
      }
      return data.data;
    },
    enabled: !!params.q && params.q.trim().length > 0,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
  });
}

// Customer Detail Hook
export function useCustomerDetail(id: string) {
  return useQuery({
    queryKey: customerKeys.detail(id),
    queryFn: async () => {
      const response = await fetch(`/api/customers/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch customer details');
      }
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch customer details');
      }
      return data.data;
    },
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

// Customer Creation Mutation
export function useCreateCustomer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (customerData: any) => {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create customer');
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to create customer');
      }
      
      return data.data;
    },
    onSuccess: (newCustomer) => {
      // Invalidate and refetch customer queries
      queryClient.invalidateQueries({ queryKey: customerKeys.summary() });
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
      queryClient.invalidateQueries({ queryKey: customerKeys.analytics() });
      
      // Optimistically add to cache if we have list data
      queryClient.setQueriesData(
        { queryKey: customerKeys.lists() },
        (oldData: any) => {
          if (oldData?.customers) {
            return {
              ...oldData,
              customers: [newCustomer, ...oldData.customers.slice(0, -1)],
              pagination: {
                ...oldData.pagination,
                total: oldData.pagination.total + 1
              }
            };
          }
          return oldData;
        }
      );

      toast({
        title: 'Customer Created',
        description: `${newCustomer.name} has been created successfully.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Customer Update Mutation
export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`/api/customers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update customer');
      }
      
      const responseData = await response.json();
      if (!responseData.success) {
        throw new Error(responseData.error || 'Failed to update customer');
      }
      
      return responseData.data;
    },
    onSuccess: (updatedCustomer) => {
      // Update specific customer in cache
      queryClient.setQueryData(
        customerKeys.detail(updatedCustomer.id),
        updatedCustomer
      );

      // Update customer in list caches
      queryClient.setQueriesData(
        { queryKey: customerKeys.lists() },
        (oldData: any) => {
          if (oldData?.customers) {
            return {
              ...oldData,
              customers: oldData.customers.map((customer: any) =>
                customer.id === updatedCustomer.id ? updatedCustomer : customer
              )
            };
          }
          return oldData;
        }
      );

      // Invalidate summary and analytics
      queryClient.invalidateQueries({ queryKey: customerKeys.summary() });
      queryClient.invalidateQueries({ queryKey: customerKeys.analytics() });

      toast({
        title: 'Customer Updated',
        description: `${updatedCustomer.name} has been updated successfully.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Customer Delete Mutation
export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/customers/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete customer');
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to delete customer');
      }
      
      return { id, ...data };
    },
    onSuccess: (result) => {
      // Remove from detail cache
      queryClient.removeQueries({ queryKey: customerKeys.detail(result.id) });

      // Remove from list caches
      queryClient.setQueriesData(
        { queryKey: customerKeys.lists() },
        (oldData: any) => {
          if (oldData?.customers) {
            return {
              ...oldData,
              customers: oldData.customers.filter((customer: any) => customer.id !== result.id),
              pagination: {
                ...oldData.pagination,
                total: Math.max(0, oldData.pagination.total - 1)
              }
            };
          }
          return oldData;
        }
      );

      // Invalidate summary and analytics
      queryClient.invalidateQueries({ queryKey: customerKeys.summary() });
      queryClient.invalidateQueries({ queryKey: customerKeys.analytics() });

      toast({
        title: 'Customer Removed',
        description: result.message || 'Customer has been removed successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Bulk Operations Mutation
export function useBulkCustomerOperation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ action, customerIds }: { action: string; customerIds: string[] }) => {
      const response = await fetch('/api/customers/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, customerIds }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to perform bulk operation');
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to perform bulk operation');
      }
      
      return data;
    },
    onSuccess: (result) => {
      // Invalidate all customer queries for bulk operations
      queryClient.invalidateQueries({ queryKey: customerKeys.all });

      toast({
        title: 'Bulk Operation Complete',
        description: result.message || 'Bulk operation completed successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}