/**
 * Rate Limiting para API Routes
 * 
 * Implementación simple basada en memoria para desarrollo.
 * Para producción, usar Upstash Redis, Vercel KV o similar.
 */

interface RateLimitConfig {
    max: number // Máximo de requests
    window: string // Ventana de tiempo (ej: '1m', '1h', '1d')
}

interface RateLimitEntry {
    count: number
    resetAt: number
}

// Store en memoria (solo para desarrollo)
// En producción, usar Redis/KV
const rateLimitStore = new Map<string, RateLimitEntry>()

/**
 * Parsea ventana de tiempo a milisegundos
 */
function parseWindow(window: string): number {
    const match = window.match(/^(\d+)([smhd])$/)
    if (!match) {
        throw new Error('Invalid window format. Use: 1s, 1m, 1h, 1d')
    }

    const [, num, unit] = match
    const value = parseInt(num)

    const multipliers = {
        s: 1000,           // segundos
        m: 60 * 1000,      // minutos
        h: 60 * 60 * 1000, // horas
        d: 24 * 60 * 60 * 1000, // días
    }

    return value * multipliers[unit as keyof typeof multipliers]
}

/**
 * Limpieza periódica del store (evitar memory leaks)
 */
function cleanupExpiredEntries() {
    const now = Date.now()
    for (const [key, entry] of rateLimitStore.entries()) {
        if (entry.resetAt < now) {
            rateLimitStore.delete(key)
        }
    }
}

// Ejecutar limpieza cada 5 minutos
if (typeof setInterval !== 'undefined') {
    setInterval(cleanupExpiredEntries, 5 * 60 * 1000)
}

/**
 * Verifica si un identificador ha excedido el rate limit
 * 
 * @param identifier - IP, user ID, o cualquier identificador único
 * @param action - Acción específica (ej: 'products-create', 'login')
 * @param config - Configuración del rate limit
 * @returns true si está limitado, false si puede continuar
 */
export async function checkRateLimit(
    identifier: string,
    action: string,
    config: RateLimitConfig
): Promise<boolean> {
    const key = `${action}:${identifier}`
    const now = Date.now()
    const windowMs = parseWindow(config.window)

    const entry = rateLimitStore.get(key)

    if (!entry || entry.resetAt < now) {
        // Primera request o ventana expirada
        rateLimitStore.set(key, {
            count: 1,
            resetAt: now + windowMs,
        })
        return false
    }

    if (entry.count >= config.max) {
        // Límite excedido
        return true
    }

    // Incrementar contador
    entry.count++
    rateLimitStore.set(key, entry)

    return false
}

/**
 * Obtiene información del rate limit para headers de respuesta
 */
export async function getRateLimitInfo(
    identifier: string,
    action: string,
    config: RateLimitConfig
) {
    const key = `${action}:${identifier}`
    const entry = rateLimitStore.get(key)
    const now = Date.now()

    if (!entry || entry.resetAt < now) {
        return {
            limit: config.max,
            remaining: config.max,
            reset: now + parseWindow(config.window),
        }
    }

    return {
        limit: config.max,
        remaining: Math.max(0, config.max - entry.count),
        reset: entry.resetAt,
    }
}

/**
 * Middleware helper para Next.js API routes
 */
export async function rateLimitMiddleware(
    req: Request,
    action: string,
    config: RateLimitConfig
): Promise<Response | null> {
    // Obtener identificador (IP o user ID)
    const identifier =
        req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
        req.headers.get('x-real-ip') ||
        'unknown'

    const isLimited = await checkRateLimit(identifier, action, config)
    const info = await getRateLimitInfo(identifier, action, config)

    if (isLimited) {
        const resetDate = new Date(info.reset).toISOString()

        return new Response(
            JSON.stringify({
                error: 'Too Many Requests',
                message: `Rate limit exceeded. Try again after ${resetDate}`,
                retryAfter: Math.ceil((info.reset - Date.now()) / 1000),
            }),
            {
                status: 429,
                headers: {
                    'Content-Type': 'application/json',
                    'X-RateLimit-Limit': info.limit.toString(),
                    'X-RateLimit-Remaining': '0',
                    'X-RateLimit-Reset': info.reset.toString(),
                    'Retry-After': Math.ceil((info.reset - Date.now()) / 1000).toString(),
                },
            }
        )
    }

    // No limitado, continuar
    return null
}

/**
 * Configuraciones predefinidas de rate limit
 */
export const RATE_LIMITS = {
    // Operaciones de lectura
    READ: {
        max: 100,
        window: '1m', // 100 requests por minuto
    },

    // Operaciones de escritura
    WRITE: {
        max: 30,
        window: '1m', // 30 requests por minuto
    },

    // Operaciones de autenticación
    AUTH: {
        max: 5,
        window: '15m', // 5 intentos cada 15 minutos
    },

    // Operaciones de exportación
    EXPORT: {
        max: 10,
        window: '1h', // 10 exportaciones por hora
    },

    // Operaciones de importación
    IMPORT: {
        max: 5,
        window: '1h', // 5 importaciones por hora
    },

    // Búsquedas
    SEARCH: {
        max: 60,
        window: '1m', // 60 búsquedas por minuto
    },

    // Creación de productos
    PRODUCTS_CREATE: {
        max: 20,
        window: '1m', // 20 productos por minuto
    },

    // Procesamiento de ventas
    SALES_CREATE: {
        max: 30,
        window: '1m', // 30 ventas por minuto
    },
} as const

/**
 * Helper para agregar headers de rate limit a respuestas exitosas
 */
export function addRateLimitHeaders(
    response: Response,
    info: Awaited<ReturnType<typeof getRateLimitInfo>>
): Response {
    const headers = new Headers(response.headers)
    headers.set('X-RateLimit-Limit', info.limit.toString())
    headers.set('X-RateLimit-Remaining', info.remaining.toString())
    headers.set('X-RateLimit-Reset', info.reset.toString())

    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
    })
}

/**
 * Ejemplo de uso en API route:
 * 
 * export async function POST(req: Request) {
 *   // Verificar rate limit
 *   const rateLimitResponse = await rateLimitMiddleware(
 *     req,
 *     'products-create',
 *     RATE_LIMITS.PRODUCTS_CREATE
 *   )
 *   
 *   if (rateLimitResponse) {
 *     return rateLimitResponse // 429 Too Many Requests
 *   }
 *   
 *   // Continuar con la lógica normal...
 *   const data = await req.json()
 *   // ...
 * }
 */
