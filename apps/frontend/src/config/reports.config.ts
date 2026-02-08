/**
 * Configuración centralizada para el módulo de reportes (Frontend)
 * Sincronizado con backend config
 */

export const REPORT_LIMITS = {
    TOP_PRODUCTS: 10,
    TOP_CUSTOMERS: 20,
    STOCK_LEVELS: 200,
    MOVEMENTS_HISTORY: 100,
    SALES_BY_CUSTOMER: 50,
} as const;

export const CACHE_CONFIG = {
    sales: {
        staleTime: 2 * 60 * 1000, // 2 minutos
        gcTime: 5 * 60 * 1000, // 5 minutos
        ttl: 60,
        refetchInterval: 10 * 60 * 1000, // 10 minutos
    },
    inventory: {
        staleTime: 5 * 60 * 1000, // 5 minutos
        gcTime: 10 * 60 * 1000, // 10 minutos
        ttl: 120,
        refetchInterval: 15 * 60 * 1000, // 15 minutos
    },
    customers: {
        staleTime: 3 * 60 * 1000, // 3 minutos
        gcTime: 8 * 60 * 1000, // 8 minutos
        ttl: 120,
        refetchInterval: 12 * 60 * 1000, // 12 minutos
    },
    financial: {
        staleTime: 3 * 60 * 1000, // 3 minutos
        gcTime: 8 * 60 * 1000, // 8 minutos
        ttl: 180,
        refetchInterval: 12 * 60 * 1000, // 12 minutos
    },
} as const;

export const MAX_DATE_RANGE_DAYS = 365;

export const REPORT_TYPES = ['sales', 'inventory', 'customers', 'financial'] as const;
export type ReportType = typeof REPORT_TYPES[number];
