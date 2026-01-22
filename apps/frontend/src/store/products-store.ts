import { useMemo } from 'react';
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { Product, Category } from '@/types';

interface ProductFilters {
    search: string;
    categoryId: string | null;
    stockStatus: 'all' | 'low' | 'out' | 'normal';
    imageFilter: 'all' | 'with' | 'without';
    priceRange: { min: number | null; max: number | null };
    sortBy: string;
    sortOrder: 'asc' | 'desc';
}

interface ProductsState {
    // Data
    products: Product[];
    categories: Category[];
    selectedProducts: Set<string>;

    // UI State
    filters: ProductFilters;
    currentView: 'grid' | 'table' | 'compact';
    showFilters: boolean;
    isVirtualized: boolean;

    // Pagination
    currentPage: number;
    itemsPerPage: number;
    totalItems: number;

    // Loading states
    isLoading: boolean;
    error: string | null;

    // Actions
    setProducts: (products: Product[]) => void;
    setCategories: (categories: Category[]) => void;
    updateFilter: (key: keyof ProductFilters, value: any) => void;
    resetFilters: () => void;
    toggleProductSelection: (id: string) => void;
    selectAllProducts: (ids: string[]) => void;
    clearSelection: () => void;
    setCurrentView: (view: 'grid' | 'table' | 'compact') => void;
    setPage: (page: number) => void;
    setItemsPerPage: (count: number) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    toggleFilters: () => void;
    toggleVirtualization: () => void;
}

const defaultFilters: ProductFilters = {
    search: '',
    categoryId: null,
    stockStatus: 'all',
    imageFilter: 'all',
    priceRange: { min: null, max: null },
    sortBy: 'name',
    sortOrder: 'asc'
};

export const useProductsStore = create<ProductsState>()(
    devtools(
        persist(
            (set) => ({
                // Initial state
                products: [],
                categories: [],
                selectedProducts: new Set(),
                filters: defaultFilters,
                currentView: 'table',
                showFilters: false,
                isVirtualized: true,
                currentPage: 1,
                itemsPerPage: 25,
                totalItems: 0,
                isLoading: false,
                error: null,

                // Actions
                setProducts: (products) => set({ products }),
                setCategories: (categories) => set({ categories }),

                updateFilter: (key, value) =>
                    set((state) => ({
                        filters: { ...state.filters, [key]: value },
                        currentPage: 1 // Reset to first page on filter change
                    })),

                resetFilters: () =>
                    set({
                        filters: defaultFilters,
                        currentPage: 1
                    }),

                toggleProductSelection: (id) =>
                    set((state) => {
                        const newSelection = new Set(state.selectedProducts);
                        if (newSelection.has(id)) {
                            newSelection.delete(id);
                        } else {
                            newSelection.add(id);
                        }
                        return { selectedProducts: newSelection };
                    }),

                selectAllProducts: (ids) =>
                    set({ selectedProducts: new Set(ids) }),

                clearSelection: () =>
                    set({ selectedProducts: new Set() }),

                setCurrentView: (view) => set({ currentView: view }),

                setPage: (page) => set({ currentPage: page }),

                setItemsPerPage: (count) =>
                    set({ itemsPerPage: count, currentPage: 1 }),

                setLoading: (loading) => set({ isLoading: loading }),

                setError: (error) => set({ error }),

                toggleFilters: () =>
                    set((state) => ({ showFilters: !state.showFilters })),

                toggleVirtualization: () =>
                    set((state) => ({ isVirtualized: !state.isVirtualized }))
            }),
            {
                name: 'products-store',
                partialize: (state) => ({
                    currentView: state.currentView,
                    itemsPerPage: state.itemsPerPage,
                    isVirtualized: state.isVirtualized,
                    showFilters: state.showFilters
                })
            }
        ),
        { name: 'ProductsStore' }
    )
);

// Selectors with memoization
export const useProductsFiltered = () => {
    const products = useProductsStore((state) => state.products);
    const filters = useProductsStore((state) => state.filters);

    return useMemo(() => {
        let filtered = [...products];

        // Search filter
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            filtered = filtered.filter(
                (p) =>
                    p.name?.toLowerCase().includes(searchLower) ||
                    p.sku?.toLowerCase().includes(searchLower)
            );
        }

        // Category filter
        if (filters.categoryId) {
            filtered = filtered.filter((p) => p.category_id === filters.categoryId);
        }

        // Stock status filter
        if (filters.stockStatus !== 'all') {
            filtered = filtered.filter((p) => {
                const stock = p.stock_quantity || 0;
                const minStock = p.min_stock || 0;

                switch (filters.stockStatus) {
                    case 'out':
                        return stock === 0;
                    case 'low':
                        return stock > 0 && stock <= minStock;
                    case 'normal':
                        return stock > minStock;
                    default:
                        return true;
                }
            });
        }

        // Image filter
        if (filters.imageFilter !== 'all') {
            filtered = filtered.filter((p) => {
                const hasImage = !!p.image_url;
                return filters.imageFilter === 'with' ? hasImage : !hasImage;
            });
        }

        // Price range filter
        if (filters.priceRange.min !== null) {
            filtered = filtered.filter((p) => (p.sale_price || 0) >= filters.priceRange.min!);
        }
        if (filters.priceRange.max !== null) {
            filtered = filtered.filter((p) => (p.sale_price || 0) <= filters.priceRange.max!);
        }

        // Sorting
        filtered.sort((a, b) => {
            let aVal: any = a[filters.sortBy as keyof Product];
            let bVal: any = b[filters.sortBy as keyof Product];

            if (typeof aVal === 'string') aVal = aVal.toLowerCase();
            if (typeof bVal === 'string') bVal = bVal.toLowerCase();

            if (aVal < bVal) return filters.sortOrder === 'asc' ? -1 : 1;
            if (aVal > bVal) return filters.sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        return filtered;
    }, [products, filters]);
};
