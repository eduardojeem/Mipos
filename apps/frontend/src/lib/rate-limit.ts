import { NextRequest, NextResponse } from 'next/server';

interface RateLimitConfig {
  windowMs: number; // Ventana de tiempo en milisegundos
  maxRequests: number; // Máximo de requests permitidos
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// Store en memoria (para producción usar Redis)
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

/**
 * Rate limiter middleware
 * @param config Configuración del rate limiter
 * @returns Función middleware para validar rate limit
 */
export function rateLimit(config: RateLimitConfig) {
  const { windowMs, maxRequests } = config;

  return async (request: NextRequest): Promise<NextResponse | null> => {
    // Obtener identificador único (IP + user agent)
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const identifier = `${ip}-${userAgent}`;

    const now = Date.now();
    const record = store[identifier];

    if (!record || record.resetTime < now) {
      // Primera request o ventana expirada
      store[identifier] = {
        count: 1,
        resetTime: now + windowMs
      };
      return null; // Permitir request
    }

    if (record.count >= maxRequests) {
      // Límite excedido
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      
      return NextResponse.json(
        {
          error: 'Demasiadas solicitudes',
          message: `Has excedido el límite de ${maxRequests} solicitudes. Intenta nuevamente en ${retryAfter} segundos.`,
          retryAfter
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(record.resetTime).toISOString()
          }
        }
      );
    }

    // Incrementar contador
    record.count++;
    return null; // Permitir request
  };
}
