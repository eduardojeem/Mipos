import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

/**
 * Discount limits structure
 */
export interface DiscountLimits {
  maxDiscountAmount: number;
  maxDiscountPercent: number;
  requireApproval: boolean;
}

/**
 * Hook to fetch discount limits for the current user's role
 * 
 * @returns Query result with discount limits
 * 
 * @example
 * ```typescript
 * const { limits, isLoading } = useDiscountLimits();
 * 
 * if (discount > limits.maxDiscountPercent) {
 *   // Show error or request approval
 * }
 * ```
 */
export function useDiscountLimits() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['discountLimits'],
    queryFn: async () => {
      const response = await api.get('/discount-limits');
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    role: data?.role as string | undefined,
    limits: data?.limits as DiscountLimits | undefined,
    isLoading,
    error,
  };
}
