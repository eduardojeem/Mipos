import { useState, useMemo, useCallback } from 'react';

export interface CustomerFiltersState {
    status: 'all' | 'active' | 'inactive';
    type: 'all' | 'regular' | 'vip' | 'wholesale';
    search: string;
}

export interface SortState {
    sortBy: 'name' | 'created_at' | 'totalSpent' | 'totalOrders';
    sortOrder: 'asc' | 'desc';
}

export interface UseCustomerFiltersReturn {
    filters: CustomerFiltersState;
    sortBy: SortState['sortBy'];
    sortOrder: SortState['sortOrder'];
    searchTerm: string;
    updateFilter: (key: keyof CustomerFiltersState, value: string) => void;
    toggleSort: (field: SortState['sortBy']) => void;
    clearAll: () => void;
    activeFiltersCount: number;
}

/**
 * Hook for managing customer filters and sorting.
 * 
 * Features:
 * - Filter management (status, type, search)
 * - Sorting with toggle
 * - Active filters count
 * - Clear all filters
 * 
 * @example
 * ```tsx
 * const filters = useCustomerFilters();
 * 
 * <Select
 *   value={filters.filters.status}
 *   onValueChange={(value) => filters.updateFilter('status', value)}
 * />
 * ```
 */
export function useCustomerFilters(): UseCustomerFiltersReturn {
    const [filters, setFilters] = useState<CustomerFiltersState>({
        status: 'all',
        type: 'all',
        search: ''
    });

    const [sortState, setSortState] = useState<SortState>({
        sortBy: 'created_at',
        sortOrder: 'desc'
    });

    const updateFilter = useCallback((key: keyof CustomerFiltersState, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    }, []);

    const toggleSort = useCallback((field: SortState['sortBy']) => {
        setSortState(prev => {
            if (prev.sortBy === field) {
                return {
                    ...prev,
                    sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc'
                };
            } else {
                return {
                    sortBy: field,
                    sortOrder: 'asc'
                };
            }
        });
    }, []);

    const clearAll = useCallback(() => {
        setFilters({
            status: 'all',
            type: 'all',
            search: ''
        });
        setSortState({
            sortBy: 'created_at',
            sortOrder: 'desc'
        });
    }, []);

    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (filters.status !== 'all') count++;
        if (filters.type !== 'all') count++;
        if (filters.search.trim()) count++;
        return count;
    }, [filters]);

    return useMemo(() => ({
        filters,
        sortBy: sortState.sortBy,
        sortOrder: sortState.sortOrder,
        searchTerm: filters.search,
        updateFilter,
        toggleSort,
        clearAll,
        activeFiltersCount
    }), [filters, sortState.sortBy, sortState.sortOrder, updateFilter, toggleSort, clearAll, activeFiltersCount]);
}
