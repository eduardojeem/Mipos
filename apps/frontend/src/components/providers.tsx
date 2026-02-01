'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider, useTheme } from 'next-themes';
import { useBusinessConfig } from '@/contexts/BusinessConfigContext';
import { useUserSettings } from '@/app/dashboard/settings/hooks/useOptimizedSettings';
import { AuthProvider as OldAuthProvider } from '@/hooks/use-auth';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { PermissionsProvider } from '@/hooks/use-permissions';
import { PermissionProvider } from '@/components/ui/permission-guard';
import { UnifiedPermissionsProvider } from '@/hooks/use-unified-permissions';
import { BusinessConfigProvider } from '@/contexts/BusinessConfigContext';
import { WebsiteConfigProvider } from '@/contexts/WebsiteConfigContext';
import { useEffect, useState } from 'react';
import { LoadingOverlay } from '@/components/ui/unified-error-loading';
import { useStore } from '@/store';
import { registerServiceWorker } from '@/lib/register-sw';
import { structuredLogger } from '@/lib/logger';
import { fetchWithRetry, isRetryableError } from '@/lib/fetch-retry';

// Configuración del cliente de React Query
const queryClientConfig = {
  defaultOptions: {
    queries: {
      retry: (failureCount: number, error: unknown) => {
        const err = error as { status?: number };
        // No reintentar en errores 4xx (excepto 408, 429)
        if (err?.status && err.status >= 400 && err.status < 500 && ![408, 429].includes(err.status)) {
          return false;
        }
        // Reintentar hasta 3 veces para otros errores
        return failureCount < 3;
      },
      staleTime: 5 * 60 * 1000,
      gcTime: 15 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: false,
      keepPreviousData: true,
    },
    mutations: {
      retry: (failureCount: number, error: unknown) => {
        const err = error as { status?: number };
        // No reintentar mutaciones en errores 4xx
        if (err?.status && err.status >= 400 && err.status < 500) {
          return false;
        }
        // Reintentar hasta 2 veces para errores de red
        return failureCount < 2;
      },
    },
  },
};

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient(queryClientConfig));

  // Estado global de loading para overlay (evitar objetos nuevos en SSR)
  const isGlobalLoading = useStore((state) => state.isGlobalLoading);
  const loadingMessage = useStore((state) => state.loadingMessage);
  const loadingProgress = useStore((state) => state.loadingProgress);

  // Patch de fetch para activar el loading global en peticiones no-axios
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const originalFetch = window.fetch;
    let activeFetches = 0;
    let watchdogTimer: ReturnType<typeof setTimeout> | null = null;

    const getUrlFromInput = (input: RequestInfo | URL): string | undefined => {
      if (typeof input === 'string') return input;
      if (input instanceof URL) return input.toString();
      try {
        return (input as Request).url;
      } catch {
        return undefined;
      }
    };

    const patchedFetch: typeof window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const urlStr = getUrlFromInput(input);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const isHealth = typeof urlStr === 'string' && (urlStr.startsWith('/api/health') || urlStr.startsWith('/health'));
      const isAuth = typeof urlStr === 'string' && (urlStr.startsWith('/api/auth/') || urlStr.includes('/api/auth/'));
      const isPermissions = typeof urlStr === 'string' && /\/api\/users\/[^/]+\/permissions/.test(urlStr || '');
      const isApiCall = typeof urlStr === 'string' && (
        (urlStr.startsWith('/api') || (apiUrl ? urlStr.startsWith(apiUrl) : false)) && !isHealth && !isAuth && !isPermissions
      );
      const didStartLoading = isApiCall;

      // Timeout handling: 60-second timeout for all requests to accommodate slow networks/cold starts
      // Requirements: 7.1, 7.2, 7.3
      const TIMEOUT_MS = 60_000;
      const startTime = Date.now();

      // Log request start
      // Requirements: 1.1, 9.1
      const method = init?.method || 'GET';
      const headers = init?.headers ? 
        (init.headers instanceof Headers ? Object.fromEntries(init.headers.entries()) : init.headers) 
        : {};
      
      structuredLogger.info('Fetch request started', {
        component: 'FetchWrapper',
        action: 'requestStart',
        metadata: {
          url: urlStr,
          method,
          headers: headers,
          isApiCall,
          timestamp: new Date().toISOString(),
        },
      });

      // Track concurrent requests
      // Requirement: 5.3
      if (didStartLoading) {
        // Increment counter before starting request
        activeFetches++;
        
        // Log request count change
        structuredLogger.debug('Active request count changed', {
          component: 'FetchWrapper',
          action: 'requestCountIncrement',
          metadata: {
            url: urlStr,
            activeFetches,
            operation: 'increment',
          },
        });

        // Start loading overlay if this is the first request
        if (activeFetches === 1) {
          const { startLoading } = useStore.getState();
          startLoading('Cargando datos...');
          
          structuredLogger.debug('Loading overlay started', {
            component: 'FetchWrapper',
            action: 'loadingStart',
            metadata: {
              url: urlStr,
              activeFetches,
            },
          });
        }

        // Reset watchdog timer for all active requests
        // The watchdog should only fire if ALL requests are stuck
        try { if (watchdogTimer !== null) clearTimeout(watchdogTimer); } catch {}
        watchdogTimer = setTimeout(() => {
          // Watchdog timer fired - log warning but don't interfere
          // Requirement: 5.4
          // The watchdog should ONLY log a warning and NOT interfere with pending requests
          structuredLogger.warn('Watchdog timer fired - possible stuck requests', {
            component: 'FetchWrapper',
            action: 'watchdogFired',
            metadata: {
              activeFetches,
              message: 'Requests may be stuck. This is a diagnostic warning only - not interfering with execution.',
            },
          });
          
          // DO NOT reset counter or stop loading - let requests complete naturally
          // The finally block will handle cleanup when requests actually complete or fail
        }, 15_000);
      }

      try {

        // Wrap fetch with retry logic
        // Requirements: 3.1, 3.2, 3.6
        const response = await fetchWithRetry(
          async () => {
            const timeoutController = new AbortController();
            let timeoutId: ReturnType<typeof setTimeout> | null = null;

            try {
              // Set up timeout
              timeoutId = setTimeout(() => {
                const timeoutError = new Error('Request timeout');
                timeoutError.name = 'TimeoutError';
                timeoutController.abort(timeoutError);
                
                const duration = Date.now() - startTime;
                structuredLogger.warn('Request timeout', {
                  component: 'FetchWrapper',
                  action: 'timeout',
                  metadata: {
                    url: urlStr,
                    duration,
                    timeoutMs: TIMEOUT_MS,
                  },
                });
              }, TIMEOUT_MS);

              // Merge abort signals if the caller provided one
              const mergedSignal = init?.signal
                ? createMergedAbortSignal([init.signal, timeoutController.signal])
                : timeoutController.signal;

              const response = await originalFetch(input as RequestInfo | URL, {
                ...init,
                signal: mergedSignal,
                // Ensure keepalive is not used with AbortSignal in older browsers/environments if needed
                // but generally Next.js polyfills this. 
                // Fix: explicit casting to any to avoid type conflict with RequestInit
              } as any);

              // Clear timeout on successful response
              if (timeoutId !== null) {
                clearTimeout(timeoutId);
                timeoutId = null;
              }

              // Log successful response
              // Requirements: 1.3, 9.2
              const duration = Date.now() - startTime;
              const contentLength = response.headers.get('content-length');
              
              structuredLogger.info('Fetch request completed successfully', {
                component: 'FetchWrapper',
                action: 'requestSuccess',
                metadata: {
                  url: urlStr,
                  method,
                  status: response.status,
                  statusText: response.statusText,
                  duration,
                  contentLength: contentLength ? parseInt(contentLength, 10) : undefined,
                  headers: Object.fromEntries(response.headers.entries()),
                },
              });

              return response;
            } catch (err) {
              // Clear timeout on error
              if (timeoutId !== null) {
                clearTimeout(timeoutId);
                timeoutId = null;
              }

              // Detect and log timeout errors
              if (err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError')) {
                const duration = Date.now() - startTime;
                
                // Check if this was a timeout (duration >= TIMEOUT_MS) vs user abort
                if (duration >= TIMEOUT_MS - 100) { // 100ms tolerance
                  structuredLogger.warn('Request aborted due to timeout', {
                    component: 'FetchWrapper',
                    action: 'timeoutAbort',
                    metadata: {
                      url: urlStr,
                      method,
                      duration,
                      timeoutMs: TIMEOUT_MS,
                      errorName: err.name,
                      errorMessage: err.message
                    },
                  });
                } else {
                  // User-initiated abort or component unmount
                  // Requirement 5.2: Log abort but don't throw additional errors
                  structuredLogger.info('Request aborted by caller', {
                    component: 'FetchWrapper',
                    action: 'userAbort',
                    metadata: {
                      url: urlStr,
                      method,
                      duration,
                      message: 'Request was aborted - cleanup will occur in finally block',
                    },
                  });

                  // Mark as non-retryable to prevent retry loop on user abort
                  (err as { doNotRetry?: boolean }).doNotRetry = true;
                }
              } else if (err instanceof Error) {
                // Log other errors with full context
                // Requirements: 1.5, 9.3
                const duration = Date.now() - startTime;
                structuredLogger.error('Fetch request failed', err, {
                  component: 'FetchWrapper',
                  action: 'requestError',
                  metadata: {
                    url: urlStr,
                    method,
                    duration,
                    errorName: err.name,
                    errorMessage: err.message,
                  },
                });
              }

              // Propagate original error without modification
              // Requirement: 5.1
              throw err;
            } finally {
              // Ensure timeout is always cleaned up
              if (timeoutId !== null) {
                clearTimeout(timeoutId);
                timeoutId = null;
              }
            }
          },
          {
            maxAttempts: 3,
            initialDelay: 1000, // 1 second
            backoffMultiplier: 2, // Exponential: 1s, 2s, 4s
            shouldRetry: (error) => isRetryableError(error),
            onRetry: (error, attempt, delay) => {
              // Log retry attempts
              // Requirement: 3.6
              structuredLogger.warn('Retrying request', {
                component: 'FetchWrapper',
                action: 'retry',
                metadata: {
                  url: urlStr,
                  attempt,
                  delay,
                  error: {
                    name: error.name,
                    message: error.message,
                  },
                },
              });
            },
          }
        );

        return response;
      } catch (err) {
        // Log final error after all retries exhausted
        // Requirements: 1.5, 9.3
        const duration = Date.now() - startTime;
        if (err instanceof Error) {
          structuredLogger.error('Fetch request failed after all retries', err, {
            component: 'FetchWrapper',
            action: 'finalError',
            metadata: {
              url: urlStr,
              method,
              duration,
              errorName: err.name,
              errorMessage: err.message,
            },
          });
        }
        
        // Propagate original error without modification
        // Requirement: 5.1
        throw err;
      } finally {
        // Cleanup: decrement counter and stop loading if no more active requests
        // Requirements: 5.2, 5.3
        // This cleanup MUST happen for all code paths: success, error, and abort
        if (didStartLoading) {
          // Ensure counter never goes below zero
          const previousCount = activeFetches;
          activeFetches = Math.max(0, activeFetches - 1);
          
          // Log request count change
          structuredLogger.debug('Active request count changed', {
            component: 'FetchWrapper',
            action: 'requestCountDecrement',
            metadata: {
              url: urlStr,
              activeFetches,
              previousCount,
              operation: 'decrement',
            },
          });

          // Stop loading overlay if this was the last request
          if (activeFetches === 0) {
            // Clear watchdog timer when all requests complete
            // Requirement: 5.2 - proper cleanup of timers
            try { 
              if (watchdogTimer !== null) {
                clearTimeout(watchdogTimer); 
                watchdogTimer = null;
                
                structuredLogger.debug('Watchdog timer cleared', {
                  component: 'FetchWrapper',
                  action: 'watchdogCleared',
                  metadata: {
                    reason: 'All requests completed',
                  },
                });
              }
            } catch (err) {
              // Prevent cleanup errors from propagating
              // Requirement: 5.2 - don't throw additional errors during cleanup
              structuredLogger.warn('Error clearing watchdog timer', {
                component: 'FetchWrapper',
                action: 'watchdogClearError',
                metadata: {
                  error: err instanceof Error ? err.message : String(err),
                },
              });
            }
            
            // Stop loading overlay
            try {
              const { stopLoading } = useStore.getState();
              stopLoading();
              
              structuredLogger.debug('Loading overlay stopped', {
                component: 'FetchWrapper',
                action: 'loadingStop',
                metadata: {
                  url: urlStr,
                  activeFetches,
                  reason: 'All requests completed',
                },
              });
            } catch (err) {
              // Prevent cleanup errors from propagating
              // Requirement: 5.2 - don't throw additional errors during cleanup
              structuredLogger.warn('Error stopping loading overlay', {
                component: 'FetchWrapper',
                action: 'loadingStopError',
                metadata: {
                  error: err instanceof Error ? err.message : String(err),
                },
              });
            }
          }
        }
      }
    };

    // Helper function to merge multiple AbortSignals
    // This allows combining the timeout signal with any user-provided signal
    function createMergedAbortSignal(signals: AbortSignal[]): AbortSignal {
      const controller = new AbortController();
      
      for (const signal of signals) {
        if (signal.aborted) {
          controller.abort(signal.reason);
          return controller.signal;
        }
        
        signal.addEventListener('abort', () => {
          controller.abort(signal.reason);
        }, { once: true });
      }
      
      return controller.signal;
    }

    window.fetch = patchedFetch;
    
    // Cleanup function: restore original fetch and clear watchdog timer
    // Requirement: 5.2 - proper cleanup on unmount
    return () => {
      window.fetch = originalFetch;
      
      // Clear watchdog timer on unmount
      if (watchdogTimer !== null) {
        try {
          clearTimeout(watchdogTimer);
          watchdogTimer = null;
          
          structuredLogger.debug('Watchdog timer cleared on unmount', {
            component: 'FetchWrapper',
            action: 'unmountCleanup',
            metadata: {
              activeFetches,
            },
          });
        } catch (err) {
          // Silently handle cleanup errors
          console.warn('Error clearing watchdog timer on unmount:', err);
        }
      }
      
      // Reset active fetches counter on unmount
      if (activeFetches > 0) {
        structuredLogger.warn('Component unmounting with active requests', {
          component: 'FetchWrapper',
          action: 'unmountWithActiveRequests',
          metadata: {
            activeFetches,
          },
        });
        activeFetches = 0;
      }
    };
  }, []);

  // Registrar Service Worker (SWR en cliente)
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange={false}
      >
        <OldAuthProvider>
          <AuthProvider>
            <UnifiedPermissionsProvider>
              <PermissionsProvider>
                <PermissionProvider>
                  <BusinessConfigProvider>
                    <WebsiteConfigProvider>
                      {children}
                      <ThemeRuntime />
                      {/* Overlay global de carga */}
                      <LoadingOverlay 
                        isVisible={!!isGlobalLoading}
                        message={loadingMessage || 'Cargando...'}
                        progress={typeof loadingProgress === 'number' ? loadingProgress : undefined}
                      />
                    </WebsiteConfigProvider>
                  </BusinessConfigProvider>
                </PermissionProvider>
              </PermissionsProvider>
            </UnifiedPermissionsProvider>
          </AuthProvider>
        </OldAuthProvider>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

const COLOR_MAP: Record<string, string> = {
  blue: '221.2 83.2% 53.3%',
  indigo: '226 100% 65%', // Keeping the vibrant indigo from globals
  violet: '262.1 83.3% 57.8%',
  purple: '271.5 81.3% 55.9%',
  fuchsia: '292.2 84.1% 60.6%',
  pink: '330.4 81.2% 60.4%',
  rose: '346.8 77.2% 49.8%',
  red: '355.6 71.1% 60.6%',
  orange: '24.6 95% 53.1%',
  amber: '48 96% 53%',
  yellow: '47.9 95.8% 53.1%',
  lime: '84.8 85.2% 55.6%',
  green: '142.1 76.2% 36.3%',
  emerald: '156.2 71.6% 66.9%',
  teal: '173.4 80.4% 40%',
  cyan: '188.7 94.5% 42.7%',
  sky: '201.3 96.3% 42.3%',
  slate: '215.4 16.3% 46.9%',
};

function ThemeRuntime() {
  const { theme, setTheme } = useTheme();
  const { config } = useBusinessConfig();
  const { data: userSettings } = useUserSettings();
  
  // Aplicar opciones avanzadas: intensidad, tono, programación
  useEffect(() => {
    try {
      const root = document.documentElement;

      // 1. Priorizar settings del usuario (servidor), fallback a localStorage
      const settings = userSettings || {
        theme_dark_intensity: 'normal',
        theme_dark_tone: 'blue',
        theme_smooth_transitions: true,
        primary_color: 'blue',
        border_radius: '0.5',
        enable_animations: true,
        dashboard_layout: 'comfortable'
      };

      // Si el usuario tiene un tema explícito guardado en DB, sincronizar next-themes
      // Solo si es diferente para evitar loops, y si userSettings ya cargó
      if (userSettings?.theme && userSettings.theme !== theme && userSettings.theme !== 'system') {
         // Nota: Esto podría causar conflictos si el usuario cambia el tema localmente.
         // Idealmente el toggle de tema debería actualizar userSettings.
      }

      // --- Personalización Visual ---

      // 1. Color Primario
      const primaryColor = settings.primary_color || 'blue';
      const primaryHSL = COLOR_MAP[primaryColor];
      if (primaryHSL) {
        root.style.setProperty('--primary', primaryHSL);
        // Ajustar ring para combinar
        root.style.setProperty('--ring', primaryHSL);
      } else {
        root.style.removeProperty('--primary');
        root.style.removeProperty('--ring');
      }

      // 2. Radio de Borde
      const radius = settings.border_radius || '0.5';
      root.style.setProperty('--radius', `${radius}rem`);

      // 3. Layout / Densidad
      const density = settings.dashboard_layout || 'comfortable';
      root.setAttribute('data-density', density);
      // Ajustar variables de espaciado según densidad
      if (density === 'compact') {
        root.style.setProperty('--card-padding', '1rem');
      } else if (density === 'spacious') {
        root.style.setProperty('--card-padding', '2rem');
      } else {
        root.style.removeProperty('--card-padding');
      }

      // 4. Intensidad Oscura (OLED/AMOLED)
      root.classList.remove('oled');
      if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        if (settings.theme_dark_intensity === 'black') {
          root.classList.add('oled');
          root.style.setProperty('--background', '0 0% 0%');
          root.style.setProperty('--card', '0 0% 0%');
          root.style.setProperty('--border', '0 0% 12%');
          root.style.setProperty('--muted', '0 0% 8%');
        } else if (settings.theme_dark_intensity === 'dim') {
          root.style.setProperty('--background', '220 20% 10%');
          root.style.setProperty('--card', '220 20% 12%');
          root.style.setProperty('--border', '220 15% 20%');
        } else {
          // Normal
          root.style.removeProperty('--background');
          root.style.removeProperty('--card');
          root.style.removeProperty('--border');
          root.style.removeProperty('--muted');
        }
      }

      // 5. Animaciones
      root.classList.toggle('theme-smooth', !!settings.enable_animations);
      if (!settings.enable_animations) {
        root.style.setProperty('--transition-duration', '0s');
      } else {
        root.style.removeProperty('--transition-duration');
      }

      // Caché simple de assets oscuros (logo/favicon de negocio)
      try {
        const urls: string[] = [];
        const logo = config?.branding?.logo || '';
        const favicon = config?.branding?.favicon || '';
        if (typeof logo === 'string' && logo) urls.push(logo);
        if (typeof favicon === 'string' && favicon) urls.push(favicon);
        urls.forEach((u) => { const img = new Image(); img.decoding = 'async'; img.src = u; });
      } catch {}

    } catch (e) {
      console.error('Error applying theme:', e);
    }
  }, [theme, setTheme, config, userSettings]);

  return null;
}
