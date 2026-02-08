/**
 * Configuración centralizada para el módulo de reportes
 * Incluye límites, TTLs de caché y constantes de agregación
 */

export const REPORT_LIMITS = {
    /** Número de productos a mostrar en top products */
    TOP_PRODUCTS: 10,
    /** Número de clientes a mostrar en top customers */
    TOP_CUSTOMERS: 20,
    /** Número máximo de niveles de stock a retornar */
    STOCK_LEVELS: 200,
    /** Número de movimientos de inventario en historial */
    MOVEMENTS_HISTORY: 100,
    /** Número máximo de ventas por cliente en agregación */
    SALES_BY_CUSTOMER: 50,
} as const;

export const CACHE_CONFIG = {
    sales: {
        /** Tiempo en ms antes de marcar datos como stale (React Query) */
        staleTime: 2 * 60 * 1000, // 2 minutos
        /** Tiempo en ms antes de limpiar caché (React Query) */
        gcTime: 5 * 60 * 1000, // 5 minutos
        /** TTL en segundos para caché del servidor */
        ttl: 60,
        /** Intervalo de auto-refresh en ms */
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

/**
 * TTL en ms para caché distribuido (backend)
 */
export const DISTRIBUTED_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Límite de días hacia atrás para queries de reportes
 * Previene queries muy pesadas en rangos de años
 */
export const MAX_DATE_RANGE_DAYS = 365;

/**
 * Tipos de reporte válidos
 */
export const REPORT_TYPES = ['sales', 'inventory', 'customers', 'financial'] as const;
export type ReportType = typeof REPORT_TYPES[number];
