'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider, useTheme } from 'next-themes';
import { useBusinessConfig } from '@/contexts/BusinessConfigContext';
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

// Configuración del cliente de React Query
const queryClientConfig = {
  defaultOptions: {
    queries: {
      retry: (failureCount: number, error: any) => {
        // No reintentar en errores 4xx (excepto 408, 429)
        if (error?.status >= 400 && error?.status < 500 && ![408, 429].includes(error?.status)) {
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
      retry: (failureCount: number, error: any) => {
        // No reintentar mutaciones en errores 4xx
        if (error?.status >= 400 && error?.status < 500) {
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
    let watchdogTimer: any = null;

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

      try {
        if (isApiCall) {
          if (activeFetches === 0) {
            const { startLoading } = useStore.getState();
            startLoading('Cargando datos...');
          }
          activeFetches++;
          try { clearTimeout(watchdogTimer); } catch {}
          watchdogTimer = setTimeout(() => {
            try {
              activeFetches = 0;
              const { stopLoading } = useStore.getState();
              stopLoading();
            } catch {}
          }, 15_000);
        }

        const response = await originalFetch(input as any, init);
        return response;
      } catch (err) {
        throw err;
      } finally {
        const urlStrFinally = getUrlFromInput(input);
        const isHealthFinally = typeof urlStrFinally === 'string' && (urlStrFinally.startsWith('/api/health') || urlStrFinally.startsWith('/health'));
        const isAuthFinally = typeof urlStrFinally === 'string' && (urlStrFinally.startsWith('/api/auth/') || urlStrFinally.includes('/api/auth/'));
        const isPermissionsFinally = typeof urlStrFinally === 'string' && /\/api\/users\/[^/]+\/permissions/.test(urlStrFinally || '');
        const isApiCallFinally = typeof urlStrFinally === 'string' && (
          (urlStrFinally.startsWith('/api') || (apiUrl ? urlStrFinally.startsWith(apiUrl) : false)) && !isHealthFinally && !isAuthFinally && !isPermissionsFinally
        );

        if (isApiCallFinally) {
          activeFetches = Math.max(0, activeFetches - 1);
          if (activeFetches === 0) {
            try { clearTimeout(watchdogTimer); } catch {}
            const { stopLoading } = useStore.getState();
            stopLoading();
          }
        }
      }
    };

    window.fetch = patchedFetch;
    return () => {
      window.fetch = originalFetch;
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

function ThemeRuntime() {
  const { theme, setTheme } = useTheme();
  const { config } = useBusinessConfig();
  
  // Aplicar opciones avanzadas: intensidad, tono, programación
  useEffect(() => {
    try {
      const root = document.documentElement;

      // Leer opciones guardadas
      const rawOpts = localStorage.getItem('pos-ui-theme-options') || '{}';
      const opts = JSON.parse(rawOpts || '{}') as {
        intensity?: 'dim' | 'normal' | 'black';
        tone?: 'blue' | 'gray' | 'pure';
        smoothTransitions?: boolean;
      };

      const rawSched = localStorage.getItem('pos-theme-schedule') || '{}';
      const sched = JSON.parse(rawSched || '{}') as {
        enabled?: boolean;
        start?: string; // HH:MM
        end?: string;   // HH:MM
      };

      // Programación automática de tema
      if (sched?.enabled && typeof sched.start === 'string' && typeof sched.end === 'string') {
        const now = new Date();
        const [sh, sm] = sched.start.split(':').map((v) => parseInt(v, 10));
        const [eh, em] = sched.end.split(':').map((v) => parseInt(v, 10));
        const startDate = new Date(now); startDate.setHours(sh || 19, sm || 0, 0, 0);
        const endDate = new Date(now); endDate.setHours(eh || 7, em || 0, 0, 0);
        const inRange = startDate <= endDate
          ? (now >= startDate && now <= endDate)
          : (now >= startDate || now <= endDate);
        if (inRange) setTheme('dark'); else if (theme === 'system') setTheme('light');
      }

      // Intensidad para OLED/AMOLED
      root.classList.remove('oled');
      if (opts?.intensity === 'black') {
        root.classList.add('oled');
        // Ajustar variables principales para negro puro
        root.style.setProperty('--background', '0 0% 0%');
        root.style.setProperty('--card', '0 0% 0%');
        root.style.setProperty('--border', '0 0% 12%');
        root.style.setProperty('--muted', '0 0% 8%');
      } else if (opts?.intensity === 'dim') {
        root.style.setProperty('--background', '220 20% 10%');
        root.style.setProperty('--card', '220 20% 12%');
        root.style.setProperty('--border', '220 15% 20%');
      } else {
        // Restablecer a variables base del tema oscuro definido en CSS
        root.style.removeProperty('--background');
        root.style.removeProperty('--card');
        root.style.removeProperty('--border');
        root.style.removeProperty('--muted');
      }

      // Tono de color (ajuste de marca para modo oscuro)
      const applyTone = (t: string | undefined) => {
        if (t === 'blue') {
          root.style.setProperty('--primary', '217.2 91.2% 59.8%');
          root.style.setProperty('--accent', '217.2 32.6% 17.5%');
        } else if (t === 'gray') {
          root.style.setProperty('--primary', '220 9% 46%');
          root.style.setProperty('--accent', '220 9% 20%');
        } else if (t === 'pure') {
          root.style.setProperty('--primary', '0 0% 100%');
          root.style.setProperty('--accent', '0 0% 20%');
        } else {
          root.style.removeProperty('--primary');
          root.style.removeProperty('--accent');
        }
      };
      applyTone(opts?.tone);

      // Transiciones suaves
      root.classList.toggle('theme-smooth', !!opts?.smoothTransitions);

      // Caché simple de assets oscuros (logo/favicon de negocio)
      try {
        const urls: string[] = [];
        const logo = config?.branding?.logo || '';
        const favicon = config?.branding?.favicon || '';
        if (typeof logo === 'string' && logo) urls.push(logo);
        if (typeof favicon === 'string' && favicon) urls.push(favicon);
        urls.forEach((u) => { const img = new Image(); img.decoding = 'async'; img.src = u; });
      } catch {}
    } catch {}
  }, [theme, setTheme, config]);

  return null;
}
