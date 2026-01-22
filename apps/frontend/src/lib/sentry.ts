import * as Sentry from '@sentry/nextjs';

/**
 * Configuración de Sentry para monitoreo de errores
 * 
 * Para activar:
 * 1. Crear cuenta en sentry.io
 * 2. Crear proyecto Next.js
 * 3. Obtener DSN
 * 4. Agregar a .env.local:
 *    NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
 * 5. Descomentar la inicialización abajo
 */

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

// Inicializar Sentry solo si hay DSN configurado
if (SENTRY_DSN) {
    Sentry.init({
        dsn: SENTRY_DSN,

        // Environment (production, staging, development)
        environment: process.env.NODE_ENV || 'development',

        // Tasa de muestreo de traces (0.0 a 1.0)
        // 0.1 = 10% de las transacciones enviadas a Sentry
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

        // Configuración de errores
        beforeSend(event, hint) {
            // Filtrar errores que no son importantes
            const error = hint.originalException as Error;

            // No enviar errores de extensiones del navegador
            if (error?.stack?.includes('chrome-extension://') ||
                error?.stack?.includes('moz-extension://')) {
                return null;
            }

            // Enriquecer eventos del POS con contexto adicional
            if (event.request?.url?.includes('/dashboard/pos')) {
                event.tags = {
                    ...event.tags,
                    section: 'pos',
                    feature: 'point-of-sale',
                };

                // Agregar contexto del navegador
                event.contexts = {
                    ...event.contexts,
                    pos: {
                        userAgent: navigator.userAgent,
                        screenSize: `${window.screen.width}x${window.screen.height}`,
                        viewport: `${window.innerWidth}x${window.innerHeight}`,
                    },
                };
            }

            return event;
        },

        // Integrations adicionales
        integrations: [],

        // Ignorar ciertos errores
        ignoreErrors: [
            // Errores de red comunes
            'NetworkError',
            'Network request failed',
            'Failed to fetch',

            // Errores de cancelación
            'AbortError',
            'Request aborted',

            // Errores de navegación
            'Navigation cancelled',
        ],
    });
}

/**
 * Helper para capturar errores manualmente
 */
export function captureError(error: Error, context?: Record<string, any>) {
    if (!SENTRY_DSN) {
        console.error('Sentry not configured:', error, context);
        return;
    }

    Sentry.captureException(error, {
        extra: context,
    });
}

/**
 * Helper para capturar mensajes/warnings
 */
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
    if (!SENTRY_DSN) {
        console.log(`[${level.toUpperCase()}]`, message);
        return;
    }

    Sentry.captureMessage(message, level);
}

/**
 * Helper para agregar breadcrumbs (pistas de navegación)
 */
export function addBreadcrumb(message: string, data?: Record<string, any>) {
    if (!SENTRY_DSN) {
        console.log('[Breadcrumb]', message, data);
        return;
    }

    Sentry.addBreadcrumb({
        message,
        data,
        level: 'info',
    });
}

/**
 * Helper para setear contexto de usuario
 */
export function setUser(user: { id: string; email?: string; username?: string }) {
    if (!SENTRY_DSN) return;

    Sentry.setUser(user);
}

/**
 * Helper para limpiar contexto de usuario (logout)
 */
export function clearUser() {
    if (!SENTRY_DSN) return;

    Sentry.setUser(null);
}

export default Sentry;
