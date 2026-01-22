'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { BusinessConfig, BusinessConfigUpdate, defaultBusinessConfig } from '@/types/business-config';
import { supabaseRealtimeService } from '@/lib/supabase-realtime'
import { isSupabaseActive } from '@/lib/env'
import { syncLogger } from '@/lib/sync/sync-logging'

// Normaliza el esquema de BusinessConfig para compatibilidad del carrusel
function normalizeBusinessConfig(input: BusinessConfig): BusinessConfig {
  const cfg: BusinessConfig = { ...defaultBusinessConfig, ...input };
  // Asegurar estructura de carrusel
  const hasImages = Array.isArray(cfg.carousel?.images);
  const legacyItems = (cfg as any)?.carousel?.items;
  const itemsArr = Array.isArray(legacyItems) ? legacyItems : [];
  if (!hasImages && itemsArr.length) {
    const mapped = itemsArr
      .map((it: any) => ({
        id: typeof it?.id === 'string' ? it.id : (typeof it?.uuid === 'string' ? it.uuid : `${Math.random().toString(36).slice(2)}`),
        url: typeof it?.url === 'string' ? it.url : (typeof it?.src === 'string' ? it.src : ''),
        alt: typeof it?.alt === 'string' ? it.alt : (typeof it?.title === 'string' ? it.title : ''),
      }))
      .filter((img: any) => img.url);
    cfg.carousel = { ...(cfg.carousel || { enabled: true, transitionSeconds: 5, images: [] }), images: mapped };
  }
  // Espejar imágenes en items para clientes legacy (no se usa en UI actual)
  if (cfg.carousel && Array.isArray(cfg.carousel.images)) {
    (cfg as any).carousel.items = cfg.carousel.images.map((img) => ({ id: img.id, url: img.url, alt: img.alt }));
  }
  // Clampear transición a rango permitido 3-10
  const t = cfg.carousel?.transitionSeconds;
  if (typeof t !== 'number' || t < 3 || t > 10) {
    cfg.carousel = { ...(cfg.carousel || {}), transitionSeconds: Math.min(10, Math.max(3, Number(t) || 5)), enabled: cfg.carousel?.enabled ?? true, images: cfg.carousel?.images ?? [] };
  }
  // Defaults y validación leve para nuevos campos de carrusel
  const r = cfg.carousel?.ratio;
  if (r !== undefined && (!isFinite(Number(r)) || Number(r) <= 0)) {
    cfg.carousel = { ...(cfg.carousel || {}), ratio: defaultBusinessConfig.carousel.ratio };
  } else {
    cfg.carousel = { ...(cfg.carousel || {}), ratio: cfg.carousel?.ratio ?? defaultBusinessConfig.carousel.ratio };
  }
  const ap = cfg.carousel?.autoplay;
  cfg.carousel = { ...(cfg.carousel || {}), autoplay: ap === undefined ? defaultBusinessConfig.carousel.autoplay : !!ap };
  const tms = cfg.carousel?.transitionMs;
  cfg.carousel = { ...(cfg.carousel || {}), transitionMs: (typeof tms === 'number' && tms >= 0 && tms <= 5000) ? tms : (defaultBusinessConfig.carousel.transitionMs) };

  // Carrusel de Ofertas defaults
  const hoc = cfg.homeOffersCarousel || defaultBusinessConfig.homeOffersCarousel!;
  const hocRatio = hoc?.ratio;
  const fixedHoc: NonNullable<typeof cfg.homeOffersCarousel> = {
    enabled: !!hoc?.enabled,
    autoplay: hoc?.autoplay !== false,
    intervalSeconds: (typeof hoc?.intervalSeconds === 'number') ? Math.min(10, Math.max(3, hoc.intervalSeconds)) : defaultBusinessConfig.homeOffersCarousel!.intervalSeconds,
    transitionMs: (typeof hoc?.transitionMs === 'number' && hoc.transitionMs >= 0 && hoc.transitionMs <= 5000) ? hoc.transitionMs : defaultBusinessConfig.homeOffersCarousel!.transitionMs,
    ratio: (hocRatio !== undefined && isFinite(Number(hocRatio)) && Number(hocRatio) > 0) ? Number(hocRatio) : defaultBusinessConfig.homeOffersCarousel!.ratio,
  };
  cfg.homeOffersCarousel = fixedHoc;
  cfg.storeSettings = { ...(defaultBusinessConfig.storeSettings), ...(cfg.storeSettings || {}) };
  return cfg;
}

interface BusinessConfigContextType {
  config: BusinessConfig;
  updateConfig: (updates: BusinessConfigUpdate) => Promise<{ persisted: boolean }>;
  loading: boolean;
  error: string | null;
  resetConfig: () => Promise<void>;
  persisted: boolean;
}

const BusinessConfigContext = createContext<BusinessConfigContextType | undefined>(undefined);

interface BusinessConfigProviderProps {
  children: ReactNode;
}

export function BusinessConfigProvider({ children }: BusinessConfigProviderProps) {
  const [config, setConfig] = useState<BusinessConfig>(defaultBusinessConfig);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [persisted, setPersisted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('businessConfigPersisted') === 'true'
    } catch {
      return false
    }
  });
  // BroadcastChannel para sincronización entre pestañas/ventanas
  const [bc, setBc] = useState<BroadcastChannel | null>(null)

  // Helpers para convertir HEX a HSL (compatible con tokens shadcn: hsl(var(--token)))
  const hexToRgb = useCallback((hex: string) => {
    const h = (hex || '').replace('#', '');
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    const bigint = parseInt(full || '000000', 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return { r, g, b };
  }, []);
  const hexToHslTriple = useCallback((hex: string) => {
    const { r, g, b } = hexToRgb(hex);
    const r1 = r / 255, g1 = g / 255, b1 = b / 255;
    const max = Math.max(r1, g1, b1), min = Math.min(r1, g1, b1);
    let h = 0, s = 0; const l = (max + min) / 2;
    const d = max - min;
    if (d !== 0) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r1: h = (g1 - b1) / d + (g1 < b1 ? 6 : 0); break;
        case g1: h = (b1 - r1) / d + 2; break;
        case b1: h = (r1 - g1) / d + 4; break;
      }
      h /= 6;
    }
    const hh = Math.round(h * 360);
    const ss = Math.round(s * 100);
    const ll = Math.round(l * 100);
    return `${hh} ${ss}% ${ll}%`;
  }, [hexToRgb]);

  // Cola offline mínima para operaciones pendientes de persistencia
  type PendingUpdate = { config: BusinessConfig; queuedAt: number }
  const QUEUE_KEY = 'businessConfigQueue'
  const getQueue = useCallback((): PendingUpdate[] => {
    try {
      const raw = localStorage.getItem(QUEUE_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }, []);
  const saveQueue = useCallback((queue: PendingUpdate[]) => {
    try { localStorage.setItem(QUEUE_KEY, JSON.stringify(queue)) } catch {}
  }, []);
  const enqueueUpdate = useCallback((cfg: BusinessConfig) => {
    const q = getQueue()
    q.push({ config: cfg, queuedAt: Date.now() })
    saveQueue(q)
    syncLogger.warn('BusinessConfig encolado para persistencia offline', { queuedAt: new Date().toISOString() })
  }, [getQueue, saveQueue]);
  const tryPersistToApi = useCallback(async (cfg: BusinessConfig): Promise<{ ok: boolean; status: 'success' | 'error'; message?: string }> => {
    try {
      const response = await fetch('/api/business-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg)
      })
      if (response.ok) {
        syncLogger.info('BusinessConfig persistido en API/Supabase', { updatedAt: cfg.updatedAt })
        return { ok: true, status: 'success' }
      } else {
        const data = await response.json().catch(() => null)
        const msg = data?.error || 'Error al guardar la configuración'
        syncLogger.warn('Fallo al persistir BusinessConfig en API', { message: msg })
        return { ok: false, status: 'error', message: msg }
      }
    } catch (apiErr: any) {
      syncLogger.error('Error de red al persistir BusinessConfig en API', undefined, apiErr)
      return { ok: false, status: 'error', message: apiErr?.message }
    }
  }, []);
  const flushQueue = useCallback(async () => {
    // Intentar despachar en orden FIFO
    const q = getQueue()
    if (!q.length) return
    if (!isSupabaseActive()) return // no enviar si Supabase inactivo
    if (typeof navigator !== 'undefined' && !navigator.onLine) return

    syncLogger.info('Intentando despachar cola offline de BusinessConfig', { size: q.length })
    const remaining: PendingUpdate[] = []
    for (const item of q) {
      const res = await tryPersistToApi(item.config)
      if (res.ok) {
        // Marcar como persistido localmente
        try {
          localStorage.setItem('businessConfig', JSON.stringify(item.config))
          localStorage.setItem('businessConfigPersisted', 'true')
          setConfig({ ...defaultBusinessConfig, ...item.config })
          setPersisted(true)
        } catch {}
        syncLogger.info('Elemento de cola persistido correctamente', { queuedAt: item.queuedAt })
      } else {
        remaining.push(item)
        syncLogger.warn('Elemento de cola no pudo persistirse, se mantiene en cola', { queuedAt: item.queuedAt })
        // Si falla uno, aplicar backoff simple: detener el flush para evitar loops
        break
      }
    }
    saveQueue(remaining)
  }, [getQueue, saveQueue, tryPersistToApi]);

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Cargar desde localStorage primero
      try {
        const savedConfig = localStorage.getItem('businessConfig');
        const savedPersistedFlag = localStorage.getItem('businessConfigPersisted');
        const lastPersisted = savedPersistedFlag === 'true';
        
        if (savedConfig) {
          const parsedConfig = JSON.parse(savedConfig);
          setConfig(normalizeBusinessConfig({ ...defaultBusinessConfig, ...parsedConfig }));
          setPersisted(lastPersisted);
        }
      } catch (localErr) {
        console.warn('Error loading from localStorage:', localErr);
      }

      // Intentar cargar desde API si Supabase está activo
      try {
        if (isSupabaseActive()) {
          const response = await fetch('/api/business-config', { 
            cache: 'no-store',
            signal: AbortSignal.timeout(5000) // 5 second timeout
          });
          
          if (response.ok) {
            const apiData = await response.json();
            const apiConfig = apiData?.config || apiData;
            
            if (apiConfig && typeof apiConfig === 'object') {
              const normalized = normalizeBusinessConfig({ ...defaultBusinessConfig, ...apiConfig });
              setConfig(normalized);
              
              // Guardar en localStorage
              localStorage.setItem('businessConfig', JSON.stringify(normalized));
              localStorage.setItem('businessConfigPersisted', 'true');
              setPersisted(true);
            }
          }
        }
      } catch (apiErr) {
        // Silenciar errores de red o API - usar configuración local
        console.warn('API config load failed, using local config:', apiErr);
      }

    } catch (err) {
      console.error('Error loading business config:', err);
      setError('Error al cargar la configuración del negocio');
      
      // Fallback a configuración por defecto
      setConfig(defaultBusinessConfig);
      setPersisted(false);
    } finally {
      setLoading(false);
    }
  }, []); // Sin dependencias para evitar recreación

  // Cargar configuración desde localStorage o API - SOLO UNA VEZ al montar
  useEffect(() => {
    loadConfig();
  }, []); // Sin dependencias para evitar bucle infinito

  // Configurar suscripciones y listeners - separado del loadConfig
  useEffect(() => {
    // Suscribirse a cambios de business_config en tiempo real (si Supabase está activo)
    let unsubscribe: (() => Promise<void>) | null = null
    let storageListener: ((e: StorageEvent) => void) | null = null
    let bcListener: ((ev: MessageEvent) => void) | null = null
    let onlineListener: (() => void) | null = null
    try {
      supabaseRealtimeService.subscribeToBusinessConfig(async (payload) => {
        if (payload?.config && typeof payload.config === 'object') {
          try {
            const remote = normalizeBusinessConfig({ ...defaultBusinessConfig, ...payload.config });
            
            // Aplicar configuración remota directamente para evitar conflictos
            setConfig(remote);
            localStorage.setItem('businessConfig', JSON.stringify(remote));
            localStorage.setItem('businessConfigPersisted', 'true');
            setPersisted(true);
            
            syncLogger.info('BusinessConfig actualizado desde remoto (realtime)');
          } catch (err) {
            console.warn('Error processing remote config update:', err);
          }
        }
      }).then((unsub) => {
        unsubscribe = unsub;
      }).catch(() => {});
    } catch {}

    // Sincronización entre pestañas simplificada
    try {
      storageListener = (e: StorageEvent) => {
        if (e.key === 'businessConfig' && typeof e.newValue === 'string') {
          try {
            const parsed = JSON.parse(e.newValue);
            const merged = normalizeBusinessConfig({ ...defaultBusinessConfig, ...parsed });
            setConfig(merged);
            
            const flag = localStorage.getItem('businessConfigPersisted') === 'true';
            setPersisted(flag);
            
            syncLogger.info('BusinessConfig sincronizado vía storage event');
          } catch (err) {
            console.warn('Error syncing storage event:', err);
          }
        }
      };
      window.addEventListener('storage', storageListener);
    } catch {}

    try {
      const channel = new BroadcastChannel('business-config');
      setBc(channel);
      
      bcListener = (ev: MessageEvent) => {
        const data = ev?.data;
        if (data && data.type === 'business-config:update' && data.payload) {
          try {
            const merged = normalizeBusinessConfig({ ...defaultBusinessConfig, ...data.payload });
            setConfig(merged);
            localStorage.setItem('businessConfig', JSON.stringify(merged));
            
            const flag = localStorage.getItem('businessConfigPersisted') === 'true';
            setPersisted(flag);
            
            syncLogger.info('BusinessConfig sincronizado vía BroadcastChannel');
          } catch (err) {
            console.warn('Error syncing broadcast channel:', err);
          }
        }
      };
      channel.addEventListener('message', bcListener as any);
    } catch {}

    return () => {
      if (unsubscribe) {
        unsubscribe().catch(() => {})
      }
      if (storageListener) {
        window.removeEventListener('storage', storageListener)
      }
      try {
        if (bc && bcListener) {
          (bc as any).removeEventListener?.('message', bcListener)
          bc.close()
        }
      } catch {}
      if (onlineListener) {
        window.removeEventListener('online', onlineListener)
      }
    }
  }, []); // Sin dependencias para evitar recreación constante

  // Propagar colores de marca a variables CSS globales para toda la web
  useEffect(() => {
    try {
      const b = config?.branding || defaultBusinessConfig.branding;
      const root = document.documentElement;
      // Tokens globales usados por Tailwind/Shadcn: hsl(var(--token))
      root.style.setProperty('--primary', hexToHslTriple(b.primaryColor || defaultBusinessConfig.branding.primaryColor));
      root.style.setProperty('--ring', hexToHslTriple((b.secondaryColor || defaultBusinessConfig.branding.secondaryColor)!));
      root.style.setProperty('--background', hexToHslTriple((b.backgroundColor || defaultBusinessConfig.branding.backgroundColor)!));
      root.style.setProperty('--foreground', hexToHslTriple((b.textColor || defaultBusinessConfig.branding.textColor)!));
      // Tokens auxiliares de marca (custom)
      root.style.setProperty('--accent', hexToHslTriple(b.accentColor || defaultBusinessConfig.branding.accentColor));
      // —— Accesibilidad: elegir color de texto con mayor contraste (WCAG AA) para foregrounds
      const hexToRgbLocal = (hex: string): [number, number, number] => {
        const h = (hex || '').replace('#', '');
        const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
        const r = parseInt(full.substring(0, 2) || '00', 16);
        const g = parseInt(full.substring(2, 4) || '00', 16);
        const b = parseInt(full.substring(4, 6) || '00', 16);
        return [r, g, b];
      };
      const srgbToLinear = (c: number) => {
        const x = c / 255;
        return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
      };
      const relativeLuminance = (hex: string) => {
        const [r, g, b] = hexToRgbLocal(hex);
        const R = srgbToLinear(r);
        const G = srgbToLinear(g);
        const B = srgbToLinear(b);
        return 0.2126 * R + 0.7152 * G + 0.0722 * B;
      };
      const contrastRatio = (hex1: string, hex2: string) => {
        const L1 = relativeLuminance(hex1);
        const L2 = relativeLuminance(hex2);
        const lighter = Math.max(L1, L2);
        const darker = Math.min(L1, L2);
        return (lighter + 0.05) / (darker + 0.05);
      };
      const pickAccessibleText = (bgHex: string) => {
        const darkText = '#0f172a'; // slate-900
        const lightText = '#ffffff';
        const contrastDark = contrastRatio(bgHex, darkText);
        const contrastLight = contrastRatio(bgHex, lightText);
        return contrastLight >= contrastDark ? lightText : darkText;
      };
      const primaryHex = b.primaryColor || defaultBusinessConfig.branding.primaryColor;
      const secondaryHex = (b.secondaryColor || defaultBusinessConfig.branding.secondaryColor)!;
      const accentHex = (b.accentColor || defaultBusinessConfig.branding.accentColor)!;
      root.style.setProperty('--primary-foreground', hexToHslTriple(pickAccessibleText(primaryHex)));
      root.style.setProperty('--secondary-foreground', hexToHslTriple(pickAccessibleText(secondaryHex)));
      root.style.setProperty('--accent-foreground', hexToHslTriple(pickAccessibleText(accentHex)));
      // Paleta de texto dedicada (jerarquía visual)
      const textHex = (b.textColor || defaultBusinessConfig.branding.textColor)!;
      root.style.setProperty('--text-primary', hexToHslTriple(textHex));
      root.style.setProperty('--text-accent', hexToHslTriple(accentHex));
      // Gradientes conservan HEX para uso en linear-gradient()
      root.style.setProperty('--brand-gradient-start', (b.gradientStart || defaultBusinessConfig.branding.gradientStart)!);
      // Punto medio del gradiente: usar accentColor por defecto
      root.style.setProperty('--brand-gradient-mid', (b.accentColor || defaultBusinessConfig.branding.accentColor)!);
      root.style.setProperty('--brand-gradient-end', (b.gradientEnd || defaultBusinessConfig.branding.gradientEnd)!);
    } catch {
      // Silenciar errores en SSR/montaje sin document
    }
  }, [config?.branding, hexToHslTriple]);


  const updateConfig = async (updates: BusinessConfigUpdate) => {
    try {
      setLoading(true);
      setError(null);

      const updatedConfig = {
        ...config,
        ...updates,
        updatedAt: new Date().toISOString()
      };
      const normalizedUpdated = normalizeBusinessConfig(updatedConfig)

      // Actualizar estado local
      setConfig(normalizedUpdated);

      // Guardar en localStorage
      localStorage.setItem('businessConfig', JSON.stringify(normalizedUpdated));
      // Por defecto marcamos como no persistido hasta confirmar
      localStorage.setItem('businessConfigPersisted', 'false');
      setPersisted(false)
      // Difundir actualización inmediata
      try { bc?.postMessage({ type: 'business-config:update', payload: normalizedUpdated }) } catch {}
      try { window.dispatchEvent(new CustomEvent('business-config:updated', { detail: { config: normalizedUpdated } })) } catch {}

      // Guardar en API (requiere rol admin)
      let persisted = false
      const apiRes = await tryPersistToApi(normalizedUpdated)
      if (apiRes.ok) {
        persisted = true
        localStorage.setItem('businessConfigPersisted', 'true')
        setPersisted(true)
      } else {
        // Encolar para persistencia cuando vuelva conexión / permisos
        enqueueUpdate(normalizedUpdated)
      }

      syncLogger.info('Configuración de negocio actualizada localmente', { persisted })
      return { persisted, status: apiRes.ok ? 'success' : 'queued', message: apiRes.message }

    } catch (err) {
      console.error('Error updating business config:', err);
      syncLogger.error('Error al actualizar BusinessConfig', undefined, err)
      setError('Error al actualizar la configuración del negocio');
      return { persisted: false, status: 'error', message: (err as any)?.message }
    } finally {
      setLoading(false);
    }
  };

  const resetConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      const resetConfigData = {
        ...defaultBusinessConfig,
        updatedAt: new Date().toISOString()
      };

      setConfig(resetConfigData);
      localStorage.setItem('businessConfig', JSON.stringify(resetConfigData));
      localStorage.setItem('businessConfigPersisted', 'false');
      setPersisted(false)

      // Resetear en API (requiere rol admin)
      try {
        const response = await fetch('/api/business-config/reset', { method: 'POST' })
        if (!response.ok) {
          const data = await response.json().catch(() => null)
          const msg = data?.error || 'Error al resetear en API'
          throw new Error(msg)
        }
        const apiData = await response.json().catch(() => null)
        const apiConfig = apiData?.config || null
        if (apiConfig) {
          setConfig(apiConfig)
          localStorage.setItem('businessConfig', JSON.stringify(apiConfig))
          localStorage.setItem('businessConfigPersisted', 'true')
          setPersisted(true)
          try { bc?.postMessage({ type: 'business-config:update', payload: apiConfig }) } catch {}
          try { window.dispatchEvent(new CustomEvent('business-config:updated', { detail: { config: apiConfig } })) } catch {}
          syncLogger.info('BusinessConfig reseteado y persistido en API')
        }
      } catch (apiErr) {
        console.warn('Fallo al resetear en API, se mantiene localStorage:', apiErr)
        syncLogger.warn('Fallo al resetear BusinessConfig en API, se conserva local', undefined)
      }

    } catch (err) {
      console.error('Error resetting business config:', err);
      setError('Error al resetear la configuración del negocio');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const value: BusinessConfigContextType = {
    config,
    updateConfig,
    loading,
    error,
    resetConfig,
    persisted
  };

  return (
    <BusinessConfigContext.Provider value={value}>
      {children}
    </BusinessConfigContext.Provider>
  );
}

export function useBusinessConfig() {
  const context = useContext(BusinessConfigContext);
  if (context === undefined) {
    throw new Error('useBusinessConfig must be used within a BusinessConfigProvider');
  }
  return context;
}

// Hook personalizado para obtener solo la configuración (sin funciones de actualización)
export function useBusinessConfigData() {
  const { config, loading, error } = useBusinessConfig();
  return { config, loading, error };
}

// Formateador de moneda basado en configuración del negocio
export function useCurrencyFormatter() {
  const { config } = useBusinessConfig();
  const currencyCode = config?.storeSettings?.currency || 'PYG';
  const currencyLocale = config?.regional?.locale || 'es-PY';
  const currencyDecimals = currencyCode === 'PYG' ? 0 : 2;
  return (value: number) => {
    const { formatCurrency } = require('@/lib/utils');
    return formatCurrency(value, currencyCode, currencyLocale, currencyDecimals);
  };
}
