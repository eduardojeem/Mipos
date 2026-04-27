/**
 * Configuración global del módulo Cash
 * Centraliza timeouts, límites y constantes
 */

export const CASH_CONFIG = {
  // Límites de paginación
  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
    maxSessionsLimit: 50,
  },

  // Límites de exportación
  export: {
    maxRecords: 50000,
    batchSize: 1000,
  },

  // Límites de operaciones
  limits: {
    maxOpeningAmount: 100000000,  // $100M
    maxClosingAmount: 100000000,  // $100M
    maxMovementAmount: 10000000,  // $10M
    maxMovementsPerSession: 10000, // Para includes
  },

  // Timeouts (en milisegundos)
  timeouts: {
    queryTimeout: 30000,      // 30 segundos para queries
    exportTimeout: 120000,    // 2 minutos para exports
    transactionTimeout: 10000 // 10 segundos para transacciones
  },

  // Rate limiting (requests por ventana de tiempo)
  rateLimits: {
    mutations: { max: 10, windowMs: 60000 },      // 10/min
    exports: { max: 3, windowMs: 60000 },         // 3/min
    reads: { max: 30, windowMs: 15000 }           // 30/15s
  },

  // Configuración de includes
  includes: {
    maxMovementsInSession: 10,  // Solo últimos 10 movements al listar sessions
  }
} as const;

// Tipos derivados
export type CashConfig = typeof CASH_CONFIG;
