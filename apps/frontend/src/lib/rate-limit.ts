/**
 * Rate Limiting Middleware
 * Protege endpoints contra ataques de fuerza bruta
 */

import { NextRequest, NextResponse } from 'next/server';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory store (usar Redis en producción)
const store: RateLimitStore = {};

// Limpiar entradas expiradas cada 5 minutos
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach(key => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  /**
   * Número máximo de peticiones permitidas
   */
  maxRequests: number;
  
  /**
   * Ventana de tiempo en milisegundos
   */
  windowMs: number;
  
  /**
   * Mensaje de error personalizado
   */
  message?: string;
  
  /**
   * Función para generar la clave de identificación
   */
  keyGenerator?: (request: NextRequest) => string;
}

/**
 * Genera una clave única para el rate limiting
 */
function defaultKeyGenerator(request: NextRequest): string {
  // Usar IP del cliente
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 
             request.headers.get('x-real-ip') || 
             'unknown';
  
  // Incluir ruta para límites por endpoint
  const pathname = new URL(request.url).pathname;
  
  return `${ip}:${pathname}`;
}

/**
 * Middleware de rate limiting
 */
export function rateLimit(config: RateLimitConfig) {
  const {
    maxRequests,
    windowMs,
    message = 'Demasiadas peticiones. Por favor, intenta más tarde.',
    keyGenerator = defaultKeyGenerator,
  } = config;

  return async (request: NextRequest): Promise<NextResponse | null> => {
    const key = keyGenerator(request);
    const now = Date.now();

    // Obtener o crear entrada
    if (!store[key]) {
      store[key] = {
        count: 0,
        resetTime: now + windowMs,
      };
    }

    const entry = store[key];

    // Resetear si la ventana expiró
    if (entry.resetTime < now) {
      entry.count = 0;
      entry.resetTime = now + windowMs;
    }

    // Incrementar contador
    entry.count++;

    // Verificar límite
    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message,
          retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': entry.resetTime.toString(),
          },
        }
      );
    }

    // Agregar headers informativos
    const remaining = maxRequests - entry.count;
    
    // Retornar null para continuar con la petición
    // Los headers se agregarán en el response final
    return null;
  };
}

/**
 * Configuraciones predefinidas
 */
export const RateLimitPresets = {
  /**
   * Límite estricto para endpoints de autenticación
   */
  auth: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutos
    message: 'Demasiados intentos de inicio de sesión. Intenta en 15 minutos.',
  },
  
  /**
   * Límite para endpoints de super admin
   */
  superAdmin: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minuto
    message: 'Límite de peticiones excedido. Intenta en 1 minuto.',
  },
  
  /**
   * Límite para endpoints de API general
   */
  api: {
    maxRequests: 60,
    windowMs: 60 * 1000, // 1 minuto
    message: 'Límite de peticiones excedido. Intenta en 1 minuto.',
  },
  
  /**
   * Límite para operaciones de escritura
   */
  write: {
    maxRequests: 30,
    windowMs: 60 * 1000, // 1 minuto
    message: 'Demasiadas operaciones de escritura. Intenta en 1 minuto.',
  },
};

/**
 * Helper para aplicar rate limiting en route handlers
 */
export async function applyRateLimit(
  request: NextRequest,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  const limiter = rateLimit(config);
  return limiter(request);
}
