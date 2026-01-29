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
      const didStartLoading = isApiCall;

      try {
        if (didStartLoading) {
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
        if (didStartLoading) {
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
