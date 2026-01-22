import { useState, useEffect, useCallback } from 'react';
import { useErrorRecovery } from '@/hooks/use-error-recovery';
import { customerService, type CustomerFilters, type CustomerStats } from '@/lib/customer-service';
import { useCustomerOptimizations } from '@/hooks/useCustomerOptimizations';
import { logger } from '@/lib/logger';
import { PERFORMANCE_CONFIG } from '@/config/performance';
import type { Customer } from '@/types';
import type { UICustomer } from '@/types/customer-page';

export interface UseCustomersDataConfig {
    filters: CustomerFilters;
    page: number;
    limit: number;
    enabled?: boolean;
}

export interface UseCustomersDataReturn {
    customers: UICustomer[];
    stats: CustomerStats;
    loading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
}

/**
 * Hook for managing customer data fetching, caching, and error recovery.
 * 
 * Features:
 * - Automatic caching with localStorage fallback
 * - Error recovery with retry logic
 * - Performance monitoring
 * - Debounced search support
 * 
 * @example
 * ```tsx
 * const { customers, stats, loading, refetch } = useCustomersData({
 *   filters: { status: 'all', type: 'all', search: '' },
 *   page: 1,
 *   limit: 30
 * });
 * ```
 */
export function useCustomersData(config: UseCustomersDataConfig): UseCustomersDataReturn {
    const { filters, page, limit, enabled = true } = config;

    const [state, setState] = useState<{
        customers: UICustomer[];
        stats: CustomerStats;
        loading: boolean;
        error: Error | null;
    }>({
        customers: [],
        stats: {
            total: 0,
            active: 0,
            inactive: 0,
            vip: 0,
            wholesale: 0,
            regular: 0
        },
        loading: false,
        error: null
    });

    const errorRecovery = useErrorRecovery();
    const { getCachedData, setCachedData, createCacheKey } = useCustomerOptimizations();

    const mapCustomerType = (type: string): 'regular' | 'vip' | 'wholesale' => {
        const normalized = type?.toUpperCase();
        if (normalized === 'WHOLESALE') return 'wholesale';
        if (normalized === 'VIP') return 'vip';
        return 'regular';
    };

    const mapToUICustomer = (customer: Customer): UICustomer => {
        return {
            ...customer,
            customerCode: customer.customer_code,
            customerType: mapCustomerType(customer.customer_type),
            totalSpent: customer.total_purchases || 0,
            totalOrders: 0, // This might need to be fetched or calculated if available
            lastPurchase: customer.last_purchase,
            birthDate: customer.birth_date,
            notes: customer.notes,
            created_at: customer.created_at,
            updated_at: customer.updated_at
        };
    };

    const { search, status, type } = filters || {} as CustomerFilters;
    const sortBy = (filters as any)?.sortBy;
    const sortOrder = (filters as any)?.sortOrder;

    const loadCustomers = useCallback(async () => {
        if (!enabled) return;

        const operation = async () => {
            setState(prev => ({ ...prev, loading: true, error: null }));

            // Create cache key based on filters
            const cacheKey = createCacheKey('customers', {
                search,
                status,
                type,
                sortBy,
                sortOrder,
                page,
                limit
            });

            // Try to load from cache first
            const cached = getCachedData(cacheKey);
            if (cached) {
                setState(prev => ({
                    ...prev,
                    customers: cached.customers || [],
                    stats: cached.stats || prev.stats,
                    loading: false
                }));
            }

            // Fetch from API
            const start = performance.now();
            const result = await customerService.getAll({
                search,
                status,
                type,
                ...(sortBy ? { sortBy } : {}),
                ...(sortOrder ? { sortOrder } : {}),
                page,
                limit
            } as any);
            const duration = performance.now() - start;

            // Log performance
            if (duration > PERFORMANCE_CONFIG.PERFORMANCE_TARGETS.CUSTOMER_LOAD_MS) {
                logger.warn('Slow customer load', { duration, filters });
            } else {
                logger.info('Customers loaded', { duration, count: result.customers.length });
            }

            if (result.error) {
                throw new Error(result.error);
            }

            // result.customers is already UICustomer[], no need to map again
            const uiCustomers = result.customers;

            setState(prev => ({
                ...prev,
                customers: uiCustomers,
                stats: result.stats,
                loading: false,
                error: null
            }));

            // Cache the results
            try {
                setCachedData(cacheKey, {
                    customers: result.customers, // Cache raw data
                    stats: result.stats
                });
                localStorage.setItem('customers-cache', JSON.stringify({
                    customers: result.customers,
                    stats: result.stats
                }));
            } catch (cacheError) {
                // Silently fail on cache errors
                logger.warn('Failed to cache customers', cacheError);
            }
        };

        try {
            await errorRecovery.executeWithRetry(operation, {
                maxRetries: 3,
                retryCondition: (error) => {
                    return error?.message?.includes('fetch') || error?.code === 'NETWORK_ERROR';
                }
            });
        } catch (error) {
            console.error('Error loading customers:', error);

            setState(prev => ({
                ...prev,
                error: error as Error,
                loading: false
            }));

            // Try to load from localStorage as fallback
            try {
                const cachedData = localStorage.getItem('customers-cache');
                if (cachedData) {
                    const parsed = JSON.parse(cachedData);
                    setState(prev => ({
                        ...prev,
                        customers: parsed.customers || [],
                        stats: parsed.stats || prev.stats
                    }));
                }
            } catch (fallbackError) {
                logger.error('Failed to load from cache fallback', fallbackError);
            }
        }
    }, [search, status, type, sortBy, sortOrder, page, limit, enabled, errorRecovery, getCachedData, setCachedData, createCacheKey]);

    useEffect(() => {
        loadCustomers();
    }, [search, status, type, sortBy, sortOrder, page, limit, enabled]);

    return {
        customers: state.customers,
        stats: state.stats,
        loading: state.loading,
        error: state.error,
        refetch: loadCustomers
    };
}
