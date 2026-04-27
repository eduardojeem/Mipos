/**
 * Constantes del módulo Cash
 * Centraliza todos los valores mágicos y configuraciones
 */

// Límites de montos (en unidades de moneda)
export const CASH_AMOUNT_LIMITS = {
  MIN_OPENING: 0,
  MAX_OPENING: 100_000_000, // $100M
  MIN_CLOSING: 0,
  MAX_CLOSING: 100_000_000, // $100M
  MIN_MOVEMENT: 0.01,
  MAX_MOVEMENT: 10_000_000, // $10M
} as const;

// Límites de paginación
export const CASH_PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  MIN_LIMIT: 1,
} as const;

// Límites de exportación
export const CASH_EXPORT = {
  MAX_RECORDS: 50_000,
  BATCH_SIZE: 1_000,
} as const;

// Límites de includes
export const CASH_INCLUDES = {
  MAX_MOVEMENTS_IN_SESSION: 10,
} as const;

// Timeouts (en milisegundos)
export const CASH_TIMEOUTS = {
  QUERY: 30_000,      // 30 segundos
  EXPORT: 120_000,    // 2 minutos
  TRANSACTION: 10_000, // 10 segundos
} as const;

// Rate limiting
export const CASH_RATE_LIMITS = {
  MUTATIONS: { max: 10, windowMs: 60_000 },   // 10 requests/minuto
  EXPORTS: { max: 3, windowMs: 60_000 },      // 3 requests/minuto
  READS: { max: 30, windowMs: 15_000 },       // 30 requests/15s
} as const;

// Estados de sesión
export const SESSION_STATUS = {
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED',
} as const;

// Tipos de movimiento
export const MOVEMENT_TYPES = {
  IN: 'IN',
  OUT: 'OUT',
  SALE: 'SALE',
  RETURN: 'RETURN',
  ADJUSTMENT: 'ADJUSTMENT',
} as const;

// Tipos de discrepancia
export const DISCREPANCY_TYPES = {
  SHORTAGE: 'SHORTAGE',
  OVERAGE: 'OVERAGE',
} as const;

// Performance metrics
export const PERFORMANCE = {
  REFRESH_INTERVAL: 30_000, // 30 segundos
  CACHE_TIME: 300_000,      // 5 minutos
  STALE_TIME: 60_000,       // 1 minuto
} as const;

// Tipos derivados
export type SessionStatus = typeof SESSION_STATUS[keyof typeof SESSION_STATUS];
export type MovementType = typeof MOVEMENT_TYPES[keyof typeof MOVEMENT_TYPES];
export type DiscrepancyType = typeof DISCREPANCY_TYPES[keyof typeof DISCREPANCY_TYPES];
