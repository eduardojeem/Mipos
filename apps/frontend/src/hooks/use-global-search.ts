'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDebounce } from './useDebounce';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export type SearchResultType =
    | 'product'
    | 'category'
    | 'customer'
    | 'sale'
    | 'supplier'
    | 'page';

export interface SearchResult {
    id: string;
    type: SearchResultType;
    title: string;
    subtitle?: string;
    description?: string;
    href: string;
    icon?: string;
    badge?: string;
    metadata?: Record<string, any>;
}

export interface UseGlobalSearchOptions {
    debounceMs?: number;
    minSearchLength?: number;
    maxResults?: number;
    enabledTypes?: SearchResultType[];
}

const defaultOptions: UseGlobalSearchOptions = {
    debounceMs: 300,
    minSearchLength: 2,
    maxResults: 20,
    enabledTypes: ['product', 'category', 'customer', 'page']
};

// Páginas estáticas para búsqueda
const staticPages: SearchResult[] = [
    {
        id: 'dashboard',
        type: 'page',
        title: 'Dashboard',
        subtitle: 'Vista general',
        href: '/dashboard',
        icon: 'LayoutDashboard'
    },
    {
        id: 'pos',
        type: 'page',
        title: 'Punto de Venta',
        subtitle: 'Procesar ventas',
        href: '/dashboard/pos',
        icon: 'ShoppingCart'
    },
    {
        id: 'products',
        type: 'page',
        title: 'Productos',
        subtitle: 'Gestión de inventario',
        href: '/dashboard/products',
        icon: 'Package'
    },
    {
        id: 'customers',
        type: 'page',
        title: 'Clientes',
        subtitle: 'Base de clientes',
        href: '/dashboard/customers',
        icon: 'Users'
    },
    {
        id: 'sales',
        type: 'page',
        title: 'Ventas',
        subtitle: 'Historial de ventas',
        href: '/dashboard/sales',
        icon: 'FileText'
    },
    {
        id: 'reports',
        type: 'page',
        title: 'Reportes',
        subtitle: 'Análisis y estadísticas',
        href: '/dashboard/reports',
        icon: 'BarChart3'
    },
    {
        id: 'categories',
        type: 'page',
        title: 'Categorías',
        subtitle: 'Organizar productos',
        href: '/dashboard/categories',
        icon: 'Tag'
    },
    {
        id: 'suppliers',
        type: 'page',
        title: 'Proveedores',
        subtitle: 'Gestión de proveedores',
        href: '/dashboard/suppliers',
        icon: 'Truck'
    },
    {
        id: 'settings',
        type: 'page',
        title: 'Configuración',
        subtitle: 'Ajustes del sistema',
        href: '/dashboard/settings',
        icon: 'Settings'
    }
];

export function useGlobalSearch(query: string, options: UseGlobalSearchOptions = {}) {
    // ✅ FIX: Memoizar opts para evitar que cambie en cada render
    const opts = useMemo(() => ({ ...defaultOptions, ...options }), [options]);

    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);


    const debouncedQuery = useDebounce(query, opts.debounceMs || 300);


    // Buscar en páginas estáticas
    const searchStaticPages = useCallback((searchTerm: string): SearchResult[] => {
        if (!opts.enabledTypes?.includes('page')) return [];

        const lowerQuery = searchTerm.toLowerCase();
        return staticPages.filter(page =>
            page.title.toLowerCase().includes(lowerQuery) ||
            page.subtitle?.toLowerCase().includes(lowerQuery)
        );
    }, [opts.enabledTypes]);

    // Buscar productos
    const searchProducts = useCallback(async (searchTerm: string): Promise<SearchResult[]> => {
        if (!opts.enabledTypes?.includes('product')) return [];

        try {
            const { data, error } = await supabase
                .from('products')
                .select('id, name, sku, sale_price, stock_quantity')
                .or(`name.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%`)
                .limit(10);

            if (error) throw error;

            return (data || []).map((product: any) => ({
                id: product.id,
                type: 'product' as SearchResultType,
                title: product.name,
                subtitle: `SKU: ${product.sku}`,
                description: `Stock: ${product.stock_quantity}`,
                href: `/dashboard/products/${product.id}`,
                badge: new Intl.NumberFormat('es-ES', {
                    style: 'currency',
                    currency: 'EUR'
                }).format(product.sale_price),
                metadata: product
            }));
        } catch (err) {
            console.error('Error searching products:', err);
            return [];
        }
    }, [opts.enabledTypes]);

    // Buscar categorías
    const searchCategories = useCallback(async (searchTerm: string): Promise<SearchResult[]> => {
        if (!opts.enabledTypes?.includes('category')) return [];

        try {
            const { data, error } = await supabase
                .from('categories')
                .select('id, name, description')
                .ilike('name', `%${searchTerm}%`)
                .limit(5);

            if (error) throw error;

            return (data || []).map((category: any) => ({
                id: category.id,
                type: 'category' as SearchResultType,
                title: category.name,
                subtitle: 'Categoría',
                description: category.description,
                href: `/dashboard/categories/${category.id}`,
                metadata: category
            }));
        } catch (err) {
            console.error('Error searching categories:', err);
            return [];
        }
    }, [opts.enabledTypes]);

    // Buscar clientes
    const searchCustomers = useCallback(async (searchTerm: string): Promise<SearchResult[]> => {
        if (!opts.enabledTypes?.includes('customer')) return [];

        try {
            const { data, error } = await supabase
                .from('customers')
                .select('id, name, email, phone')
                .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
                .limit(5);

            if (error) throw error;

            return (data || []).map((customer: any) => ({
                id: customer.id,
                type: 'customer' as SearchResultType,
                title: customer.name,
                subtitle: customer.email || customer.phone,
                description: 'Cliente',
                href: `/dashboard/customers/${customer.id}`,
                metadata: customer
            }));
        } catch (err) {
            console.error('Error searching customers:', err);
            return [];
        }
    }, [opts.enabledTypes]);

    // Ejecutar búsqueda
    const performSearch = useCallback(async (searchTerm: string) => {
        if (!searchTerm || searchTerm.length < (opts.minSearchLength || 2)) {
            setResults([]);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const [
                pageResults,
                productResults,
                categoryResults,
                customerResults
            ] = await Promise.all([
                Promise.resolve(searchStaticPages(searchTerm)),
                searchProducts(searchTerm),
                searchCategories(searchTerm),
                searchCustomers(searchTerm)
            ]);

            const allResults = [
                ...pageResults,
                ...productResults,
                ...categoryResults,
                ...customerResults
            ].slice(0, opts.maxResults || 20);

            setResults(allResults);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error en la búsqueda');
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    }, [opts.minSearchLength, opts.maxResults, searchStaticPages, searchProducts, searchCategories, searchCustomers]);

    // Ejecutar búsqueda cuando cambie el query debounced
    useEffect(() => {
        performSearch(debouncedQuery);
    }, [debouncedQuery, performSearch]);

    // Agrupar resultados por tipo
    const groupedResults = useMemo(() => {
        return results.reduce((acc, result) => {
            if (!acc[result.type]) {
                acc[result.type] = [];
            }
            acc[result.type].push(result);
            return acc;
        }, {} as Record<SearchResultType, SearchResult[]>);
    }, [results]);

    return {
        results,
        groupedResults,
        isLoading,
        error,
        hasResults: results.length > 0,
        isEmpty: !isLoading && debouncedQuery.length >= (opts.minSearchLength || 2) && results.length === 0
    };
}
