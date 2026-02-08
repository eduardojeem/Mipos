/**
 * Configuración centralizada para el módulo de Sales (Backend)
 * Elimina magic numbers y centraliza constantes
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
     * TTLs en milisegundos
     */
    SUMMARY_TTL: 2 * 60 * 1000,      // 2 minutos
    RECENT_TTL: 1 * 60 * 1000,       // 1 minuto
    LIST_TTL: 30 * 1000,             // 30 segundos
    REFETCH_INTERVAL: 5 * 60 * 1000, // 5 minutos
} as const;

/**
 * Permisos especiales
 */
export const DISCOUNT_THRESHOLDS = {
    REQUIRES_REASON: 10,        // % descuento que requiere razón
    REQUIRES_APPROVAL: 20,      // % descuento que requiere permiso especial
} as const;
