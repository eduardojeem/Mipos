/**
 * Configuración centralizada para el módulo de Sales (Frontend)
 * Sincronizada con backend
 */

export const SALES_CONFIG = {
    /**
     * Límites de paginación
     */
    DEFAULT_LIMIT: 5,
    MAX_LIMIT: 100,

    /**
     * Analytics
     */
    TOP_PRODUCTS_COUNT: 5,

    /**
     * Validación de rangos de fecha
     */
    MAX_DATE_RANGE_DAYS: 365,
} as const;

export const CACHE_CONFIG = {
    /**
     * TTLs para React Query (en milisegundos)
     */
    SUMMARY_STALE_TIME: 2 * 60 * 1000,      // 2 minutos
    RECENT_STALE_TIME: 1 * 60 * 1000,       // 1 minuto
    LIST_STALE_TIME: 30 * 1000,             // 30 segundos
    REFETCH_INTERVAL: 5 * 60 * 1000,        // 5 minutos
    RECENT_REFETCH_INTERVAL: 2 * 60 * 1000, // 2 minutos
} as const;
