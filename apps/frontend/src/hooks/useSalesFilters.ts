import { useMemo, useState, useCallback } from 'react';
import type { Sale } from '@/types';

export interface SalesFilters {
    searchQuery: string;
    selectedCustomer: string;
    selectedPaymentMethod: string;
    selectedStatus: string;
    selectedSaleType: string;
    dateFrom: string;
    dateTo: string;
    amountRange: string;
    discountRange: string;
    itemCountRange: string;
    couponCode: string;
    hasCoupon: 'all' | 'yes' | 'no';
    quickFilter: string;
}

const initialFilters: SalesFilters = {
    searchQuery: '',
    selectedCustomer: '',
    selectedPaymentMethod: '',
    selectedStatus: '',
    selectedSaleType: '',
    dateFrom: '',
    dateTo: '',
    amountRange: '',
    discountRange: '',
    itemCountRange: '',
    couponCode: '',
    hasCoupon: 'all',
    quickFilter: '',
};

interface UseSalesFiltersOptions {
    sales: Sale[];
    onFilterChange?: () => void;
}

export function useSalesFilters({ sales, onFilterChange }: UseSalesFiltersOptions) {
    const [filters, setFilters] = useState<SalesFilters>(initialFilters);

    // Optimized filter function
    const filteredSales = useMemo(() => {
        if (!sales || !Array.isArray(sales)) return [];

        let result = sales;

        // Text search
        if (filters.searchQuery) {
            const query = filters.searchQuery.toLowerCase();
            result = result.filter(sale =>
                sale.id.toString().includes(query) ||
                sale.customer?.name?.toLowerCase().includes(query) ||
                sale.customer?.email?.toLowerCase().includes(query) ||
                sale.notes?.toLowerCase().includes(query)
            );
        }

        // Quick filters
        if (filters.quickFilter) {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const thisWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
            const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

            switch (filters.quickFilter) {
                case 'today':
                    result = result.filter(sale => new Date(sale.created_at) >= today);
                    break;
                case 'week':
                    result = result.filter(sale => new Date(sale.created_at) >= thisWeek);
                    break;
                case 'month':
                    result = result.filter(sale => new Date(sale.created_at) >= thisMonth);
                    break;
                case 'high-value':
                    result = result.filter(sale => sale.total_amount >= 100000); // Configurable threshold
                    break;
            }
        }

        // Customer filter
        if (filters.selectedCustomer && filters.selectedCustomer !== '__all__') {
            result = result.filter(sale =>
                String(sale.customer_id || sale.customer?.id || '') === String(filters.selectedCustomer)
            );
        }

        // Payment method filter
        if (filters.selectedPaymentMethod && filters.selectedPaymentMethod !== '__all__') {
            const pm = filters.selectedPaymentMethod.toUpperCase();
            result = result.filter(sale => String(sale.payment_method || '').toUpperCase() === pm);
        }

        // Status filter
        if (filters.selectedStatus && filters.selectedStatus !== '__all__') {
            const st = filters.selectedStatus.toUpperCase();
            result = result.filter(sale => String(sale.status || '').toUpperCase() === st);
        }

        // Sale type filter
        if (filters.selectedSaleType && filters.selectedSaleType !== '__all__') {
            const tp = filters.selectedSaleType.toUpperCase();
            result = result.filter(sale => String(sale.sale_type || '').toUpperCase() === tp);
        }

        // Date range filters
        if (filters.dateFrom) {
            const df = new Date(`${filters.dateFrom}T00:00:00`).getTime();
            result = result.filter(sale => new Date(sale.created_at).getTime() >= df);
        }

        if (filters.dateTo) {
            const dt = new Date(`${filters.dateTo}T23:59:59`).getTime();
            result = result.filter(sale => new Date(sale.created_at).getTime() <= dt);
        }

        // Amount range filter
        if (filters.amountRange) {
            const r = filters.amountRange.trim();
            if (r.endsWith('+')) {
                const min = Number(r.slice(0, -1));
                if (!isNaN(min)) {
                    result = result.filter(sale => Number(sale.total_amount || 0) >= min);
                }
            } else if (r.includes('-')) {
                const [minStr, maxStr] = r.split('-');
                const min = Number(minStr);
                const max = Number(maxStr);
                if (!isNaN(min)) {
                    result = result.filter(sale => Number(sale.total_amount || 0) >= min);
                }
                if (!isNaN(max)) {
                    result = result.filter(sale => Number(sale.total_amount || 0) <= max);
                }
            }
        }

        // Discount range filter
        if (filters.discountRange) {
            const r = filters.discountRange.trim();
            if (r.endsWith('+')) {
                const min = Number(r.slice(0, -1));
                if (!isNaN(min)) {
                    result = result.filter(sale => Number(sale.discount_amount || 0) >= min);
                }
            } else if (r.includes('-')) {
                const [minStr, maxStr] = r.split('-');
                const min = Number(minStr);
                const max = Number(maxStr);
                if (!isNaN(min)) {
                    result = result.filter(sale => Number(sale.discount_amount || 0) >= min);
                }
                if (!isNaN(max)) {
                    result = result.filter(sale => Number(sale.discount_amount || 0) <= max);
                }
            } else if (/^\d+$/.test(r)) {
                const exact = Number(r);
                result = result.filter(sale => Number(sale.discount_amount || 0) === exact);
            }
        }

        // Item count range filter
        if (filters.itemCountRange) {
            const r = filters.itemCountRange.trim();
            const count = (s: Sale) => Number(Array.isArray(s.items) ? s.items.length : 0);

            if (r.endsWith('+')) {
                const min = Number(r.slice(0, -1));
                if (!isNaN(min)) {
                    result = result.filter(sale => count(sale) >= min);
                }
            } else if (r.includes('-')) {
                const [minStr, maxStr] = r.split('-');
                const min = Number(minStr);
                const max = Number(maxStr);
                result = result.filter(sale => {
                    const c = count(sale);
                    const okMin = isNaN(min) ? true : c >= min;
                    const okMax = isNaN(max) ? true : c <= max;
                    return okMin && okMax;
                });
            } else if (/^\d+$/.test(r)) {
                const exact = Number(r);
                result = result.filter(sale => count(sale) === exact);
            }
        }

        // Coupon filters
        if (filters.hasCoupon && filters.hasCoupon !== 'all') {
            const want = filters.hasCoupon === 'yes';
            result = result.filter(sale => (sale.coupon_code ? true : false) === want);
        }

        if (filters.couponCode) {
            const cc = filters.couponCode.trim().toLowerCase();
            result = result.filter(sale => String(sale.coupon_code || '').toLowerCase().includes(cc));
        }

        return result;
    }, [sales, filters]);

    // Update individual filter
    const updateFilter = useCallback(<K extends keyof SalesFilters>(
        key: K,
        value: SalesFilters[K]
    ) => {
        // Normalize __all__ to empty string for consistency
        const normalizedValue = value === '__all__' ? '' as SalesFilters[K] : value;
        setFilters(prev => ({ ...prev, [key]: normalizedValue }));
        onFilterChange?.();
    }, [onFilterChange]);

    // Update multiple filters
    const updateFilters = useCallback((updates: Partial<SalesFilters>) => {
        setFilters(prev => ({ ...prev, ...updates }));
        onFilterChange?.();
    }, [onFilterChange]);

    // Clear all filters
    const clearFilters = useCallback(() => {
        setFilters(initialFilters);
        onFilterChange?.();
    }, [onFilterChange]);

    // Check if any filter is active
    const hasActiveFilters = useMemo(() => {
        return Object.entries(filters).some(([key, value]) => {
            if (key === 'hasCoupon') return value !== 'all';
            return value !== '' && value !== initialFilters[key as keyof SalesFilters];
        });
    }, [filters]);

    return {
        filters,
        filteredSales,
        updateFilter,
        updateFilters,
        clearFilters,
        hasActiveFilters,
    };
}
