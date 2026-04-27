'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';
import { BusinessConfig, BusinessConfigUpdate, defaultBusinessConfig } from '@/types/business-config';
import { supabaseRealtimeService } from '@/lib/supabase-realtime'
import { isSupabaseActive } from '@/lib/env'
import { syncLogger } from '@/lib/sync/sync-logging'
import { useAuth } from '@/hooks/use-auth'
import { useUserOrganizations } from '@/hooks/use-user-organizations'
import { formatCurrency } from '@/lib/utils'

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
  // Espejar imÃ¡genes en items para clientes legacy (no se usa en UI actual)
  if (cfg.carousel && Array.isArray(cfg.carousel.images)) {
    (cfg as any).carousel.items = cfg.carousel.images.map((img) => ({ id: img.id, url: img.url, alt: img.alt }));
  }
  // Clampear transiciÃ³n a rango permitido 3-10
  const t = cfg.carousel?.transitionSeconds;
  if (typeof t !== 'number' || t < 3 || t > 10) {
    cfg.carousel = { ...(cfg.carousel || {}), transitionSeconds: Math.min(10, Math.max(3, Number(t) || 5)), enabled: cfg.carousel?.enabled ?? true, images: cfg.carousel?.images ?? [] };
  }
  // Defaults y validaciÃ³n leve para nuevos campos de carrusel
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
  cfg.publicSite = {
    sections: {
      ...defaultBusinessConfig.publicSite!.sections,
      ...(cfg.publicSite?.sections || {}),
    },
    content: {
      ...defaultBusinessConfig.publicSite!.content,
      ...(cfg.publicSite?.content || {}),
    },
  };
  return cfg;
}

interface BusinessConfigContextType {
  config: BusinessConfig;
  updateConfig: (updates: BusinessConfigUpdate) => Promise<{ persisted: boolean }>;
  loading: boolean;
  error: string | null;
  resetConfig: () => Promise<void>;
  persisted: boolean;
  organizationId: string | null;
  organizationName: string | null;
}

const BusinessConfigContext = createContext<BusinessConfigContextType | undefined>(undefined);

interface BusinessConfigProviderProps {
  children: ReactNode;
}

interface StaticBusinessConfigProviderProps {
  children: ReactNode;
  config: BusinessConfig;
  organizationId?: string | null;
  organizationName?: string | null;
}

export function BusinessConfigProvider({ children }: BusinessConfigProviderProps) {
  const { user } = useAuth();
  const { selectedOrganization } = useUserOrganizations(user?.id);
  
  const [config, setConfig] = useState<BusinessConfig>(defaultBusinessConfig);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [persisted, setPersisted] = useState<boolean>(false);
  // BroadcastChannel para sincronizaciÃ³n entre pestaÃ±as/ventanas
  const bcRef = useRef<BroadcastChannel | null>(null)
  
  // Organization context
  const organizationId = selectedOrganization?.id || null;
  const organizationName = selectedOrganization?.name || null;

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

  // Cola offline mÃ­nima para operaciones pendientes de persistencia
  type PendingUpdate = { config: BusinessConfig; queuedAt: number }
  const QUEUE_KEY = 'businessConfigQueue'
  
  // Helper to get organization-scoped localStorage key
  const getStorageKey = useCallback((key: string) => {
    return organizationId ? `${key}_${organizationId}` : key;
  }, [organizationId]);
  
  const getQueue = useCallback((): PendingUpdate[] => {
    try {
      const raw = localStorage.getItem(getStorageKey(QUEUE_KEY))
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }, [getStorageKey]);
  
  const saveQueue = useCallback((queue: PendingUpdate[]) => {
    try { localStorage.setItem(getStorageKey(QUEUE_KEY), JSON.stringify(queue)) } catch {}
  }, [getStorageKey]);
  
  const enqueueUpdate = useCallback((cfg: BusinessConfig) => {
    const q = getQueue()
    q.push({ config: cfg, queuedAt: Date.now() })
    saveQueue(q)
    syncLogger.warn('BusinessConfig encolado para persistencia offline', { 
      organizationId,
      queuedAt: new Date().toISOString() 
    })
  }, [getQueue, saveQueue, organizationId]);
  
  const tryPersistToApi = useCallback(async (cfg: BusinessConfig): Promise<{ ok: boolean; status: 'success' | 'error'; message?: string }> => {
    if (!organizationId) {
      return { ok: false, status: 'error', message: 'No organization selected' }
    }
    
    try {
      const url = `/api/business-config?organizationId=${organizationId}`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg)
      })
      if (response.ok) {
        syncLogger.info('BusinessConfig persistido en API/Supabase', { 
          organizationId,
          organizationName,
          updatedAt: cfg.updatedAt 
        })
        return { ok: true, status: 'success' }
      } else {
        const data = await response.json().catch(() => null)
        const msg = data?.error || 'Error al guardar la configuraciÃ³n'
        syncLogger.warn('Fallo al persistir BusinessConfig en API', { 
          organizationId,
          message: msg 
        })
        return { ok: false, status: 'error', message: msg }
      }
    } catch (apiErr: any) {
      syncLogger.error('Error de red al persistir BusinessConfig en API', undefined, apiErr)
      return { ok: false, status: 'error', message: apiErr?.message }
    }
  }, [organizationId, organizationName]);
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
          localStorage.setItem(getStorageKey('businessConfig'), JSON.stringify(item.config))
          localStorage.setItem(getStorageKey('businessConfigPersisted'), 'true')
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
    if (!organizationId) {
      // No organization selected yet, use defaults
      setConfig(defaultBusinessConfig);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);

      // Cargar desde localStorage primero (scoped por organizaciÃ³n)
      try {
        const savedConfig = localStorage.getItem(getStorageKey('businessConfig'));
        const savedPersistedFlag = localStorage.getItem(getStorageKey('businessConfigPersisted'));
        const lastPersisted = savedPersistedFlag === 'true';
        
        if (savedConfig) {
          const parsedConfig = JSON.parse(savedConfig);
          setConfig(normalizeBusinessConfig({ ...defaultBusinessConfig, ...parsedConfig }));
          setPersisted(lastPersisted);
        }
      } catch (localErr) {
        console.warn('Error loading from localStorage:', localErr);
      }

      // Intentar cargar desde API si Supabase estÃ¡ activo
      try {
        if (isSupabaseActive()) {
          const url = `/api/business-config?organizationId=${organizationId}`;
          const response = await fetch(url, { 
            cache: 'no-store',
            signal: AbortSignal.timeout(15000) // 15 second timeout
          });
          
          if (response.ok) {
            const apiData = await response.json();
            const apiConfig = apiData?.config || apiData;
            
            if (apiConfig && typeof apiConfig === 'object') {
              const normalized = normalizeBusinessConfig({ ...defaultBusinessConfig, ...apiConfig });
              setConfig(normalized);
              
              // Guardar en localStorage (scoped por organizaciÃ³n)
              localStorage.setItem(getStorageKey('businessConfig'), JSON.stringify(normalized));
              localStorage.setItem(getStorageKey('businessConfigPersisted'), 'true');
              setPersisted(true);
              
              syncLogger.info('BusinessConfig cargado desde API', { 
                organizationId,
                organizationName 
              });
            }
          }
        }
      } catch (apiErr) {
        // Silenciar errores de red o API - usar configuraciÃ³n local
        console.warn('API config load failed, using local config:', apiErr);
      }

    } catch (err) {
      console.error('Error loading business config:', err);
      setError('Error al cargar la configuraciÃ³n del negocio');
      
      // Fallback a configuraciÃ³n por defecto
      setConfig(defaultBusinessConfig);
      setPersisted(false);
    } finally {
      setLoading(false);
    }
  }, [organizationId, organizationName, getStorageKey]); // Dependencias actualizadas

  // Cargar configuraciÃ³n desde localStorage o API - cuando cambia la organizaciÃ³n
  useEffect(() => {
    loadConfig();
  }, [loadConfig]); // Recargar cuando cambia organizationId

  // Configurar suscripciones y listeners - separado del loadConfig
  useEffect(() => {
    if (!organizationId) return; // No suscribirse sin organizaciÃ³n
    if (!isSupabaseActive()) return; // Evitar suscripciones cuando Supabase estÃ¡ inactivo
    
    // Suscribirse a cambios de business_config en tiempo real (si Supabase estÃ¡ activo)
    let unsubscribe: (() => Promise<void>) | null = null
    let storageListener: ((e: StorageEvent) => void) | null = null
    let bcListener: ((ev: MessageEvent) => void) | null = null

    try {
      supabaseRealtimeService.subscribeToBusinessConfig(async (payload) => {
        if (payload?.config && typeof payload.config === 'object') {
          try {
            const remote = normalizeBusinessConfig({ ...defaultBusinessConfig, ...payload.config });
            
            // Aplicar configuraciÃ³n remota directamente para evitar conflictos
            setConfig(remote);
            localStorage.setItem(getStorageKey('businessConfig'), JSON.stringify(remote));
            localStorage.setItem(getStorageKey('businessConfigPersisted'), 'true');
            setPersisted(true);
            
            syncLogger.info('BusinessConfig actualizado desde remoto (realtime)', {
              organizationId,
              organizationName
            });
          } catch (err) {
            console.warn('Error processing remote config update:', err);
          }
        }
      }).then((unsub) => {
        unsubscribe = unsub;
      }).catch(() => {});
    } catch {}

    // SincronizaciÃ³n entre pestaÃ±as simplificada (scoped por organizaciÃ³n)
    try {
      const storageKey = getStorageKey('businessConfig');
      storageListener = (e: StorageEvent) => {
        if (e.key === storageKey && typeof e.newValue === 'string') {
          try {
            const parsed = JSON.parse(e.newValue);
            const merged = normalizeBusinessConfig({ ...defaultBusinessConfig, ...parsed });
            setConfig(merged);
            
            const flag = localStorage.getItem(getStorageKey('businessConfigPersisted')) === 'true';
            setPersisted(flag);
            
            syncLogger.info('BusinessConfig sincronizado vÃ­a storage event', {
              organizationId
            });
          } catch (err) {
            console.warn('Error syncing storage event:', err);
          }
        }
      };
      window.addEventListener('storage', storageListener);
    } catch {}

    // BroadcastChannel scoped por organizaciÃ³n
    try {
      const channelName = `business-config-${organizationId}`;
      const channel = new BroadcastChannel(channelName);
      bcRef.current = channel;
      
      bcListener = (ev: MessageEvent) => {
        const data = ev?.data;
        if (data && data.type === 'business-config:update' && data.payload) {
          try {
            const merged = normalizeBusinessConfig({ ...defaultBusinessConfig, ...data.payload });
            setConfig(merged);
            localStorage.setItem(getStorageKey('businessConfig'), JSON.stringify(merged));
            
            const flag = localStorage.getItem(getStorageKey('businessConfigPersisted')) === 'true';
            setPersisted(flag);
            
            syncLogger.info('BusinessConfig sincronizado vÃ­a BroadcastChannel', {
              organizationId
            });
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
        const activeChannel = bcRef.current
        if (activeChannel && bcListener) {
          (activeChannel as any).removeEventListener?.('message', bcListener)
          activeChannel.close()
        }
        bcRef.current = null
      } catch {}
    }
  }, [organizationId, organizationName, getStorageKey]); // Recrear cuando cambia la organizaciÃ³n

  // Propagar colores de marca a variables CSS globales para toda la web
  useEffect(() => {
    try {
      const b = config?.branding || defaultBusinessConfig.branding;
      const root = document.documentElement;
      const primaryHex = b.primaryColor || defaultBusinessConfig.branding.primaryColor;
      const secondaryHex = (b.secondaryColor || defaultBusinessConfig.branding.secondaryColor)!;
      const accentHex = (b.accentColor || defaultBusinessConfig.branding.accentColor)!;
      const backgroundHex = (b.backgroundColor || defaultBusinessConfig.branding.backgroundColor)!;
      const textHex = (b.textColor || defaultBusinessConfig.branding.textColor)!;

      // Tokens semánticos del sistema: solo conservar acentos seguros.
      root.style.setProperty('--primary', hexToHslTriple(primaryHex));
      root.style.setProperty('--ring', hexToHslTriple(secondaryHex));

      // Tokens dedicados de marca para previews y páginas públicas.
      root.style.setProperty('--brand-primary', hexToHslTriple(primaryHex));
      root.style.setProperty('--brand-secondary', hexToHslTriple(secondaryHex));
      root.style.setProperty('--brand-accent', hexToHslTriple(accentHex));
      root.style.setProperty('--brand-background', hexToHslTriple(backgroundHex));
      root.style.setProperty('--brand-foreground', hexToHslTriple(textHex));
      // â€”â€” Accesibilidad: elegir color de texto con mayor contraste (WCAG AA) para foregrounds
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
      root.style.setProperty('--primary-foreground', hexToHslTriple(pickAccessibleText(primaryHex)));
      root.style.setProperty('--brand-primary-foreground', hexToHslTriple(pickAccessibleText(primaryHex)));
      root.style.setProperty('--brand-secondary-foreground', hexToHslTriple(pickAccessibleText(secondaryHex)));
      root.style.setProperty('--brand-accent-foreground', hexToHslTriple(pickAccessibleText(accentHex)));
      // Paleta de texto dedicada (jerarquÃ­a visual)
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
    if (!organizationId) {
      setError('No hay organizaciÃ³n seleccionada');
      return { persisted: false, status: 'error', message: 'No organization selected' }
    }
    
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

      // Guardar en localStorage (scoped por organizaciÃ³n)
      localStorage.setItem(getStorageKey('businessConfig'), JSON.stringify(normalizedUpdated));
      // Por defecto marcamos como no persistido hasta confirmar
      localStorage.setItem(getStorageKey('businessConfigPersisted'), 'false');
      setPersisted(false)
      
      // Difundir actualizaciÃ³n inmediata
      try { bcRef.current?.postMessage({ type: 'business-config:update', payload: normalizedUpdated }) } catch {}
      try { window.dispatchEvent(new CustomEvent('business-config:updated', { detail: { config: normalizedUpdated } })) } catch {}

      // Guardar en API (requiere rol admin)
      let persisted = false
      const apiRes = await tryPersistToApi(normalizedUpdated)
      if (apiRes.ok) {
        persisted = true
        localStorage.setItem(getStorageKey('businessConfigPersisted'), 'true')
        setPersisted(true)
      } else {
        // Encolar para persistencia cuando vuelva conexiÃ³n / permisos
        enqueueUpdate(normalizedUpdated)
      }

      syncLogger.info('ConfiguraciÃ³n de negocio actualizada localmente', { 
        organizationId,
        organizationName,
        persisted 
      })
      if (!apiRes.ok) {
        setError(apiRes.message || 'No se pudo guardar en Supabase. El cambio quedo en cola local.')
      }

      return { persisted, status: apiRes.ok ? 'success' : 'queued', message: apiRes.message }

    } catch (err) {
      console.error('Error updating business config:', err);
      syncLogger.error('Error al actualizar BusinessConfig', undefined, err)
      setError('Error al actualizar la configuraciÃ³n del negocio');
      return { persisted: false, status: 'error', message: (err as any)?.message }
    } finally {
      setLoading(false);
    }
  };

  const resetConfig = async () => {
    if (!organizationId) {
      setError('No hay organizaciÃ³n seleccionada');
      throw new Error('No organization selected');
    }
    
    try {
      setLoading(true);
      setError(null);

      const resetConfigData = {
        ...defaultBusinessConfig,
        updatedAt: new Date().toISOString()
      };

      setConfig(resetConfigData);
      localStorage.setItem(getStorageKey('businessConfig'), JSON.stringify(resetConfigData));
      localStorage.setItem(getStorageKey('businessConfigPersisted'), 'false');
      setPersisted(false)

      // Resetear en API (requiere rol admin)
      try {
        const url = `/api/business-config/reset?organizationId=${organizationId}`;
        const response = await fetch(url, { method: 'POST' })
        if (!response.ok) {
          const data = await response.json().catch(() => null)
          const msg = data?.error || 'Error al resetear en API'
          throw new Error(msg)
        }
        const apiData = await response.json().catch(() => null)
        const apiConfig = apiData?.config || null
        if (apiConfig) {
          setConfig(apiConfig)
          localStorage.setItem(getStorageKey('businessConfig'), JSON.stringify(apiConfig))
          localStorage.setItem(getStorageKey('businessConfigPersisted'), 'true')
          setPersisted(true)
          try { bcRef.current?.postMessage({ type: 'business-config:update', payload: apiConfig }) } catch {}
          try { window.dispatchEvent(new CustomEvent('business-config:updated', { detail: { config: apiConfig } })) } catch {}
          syncLogger.info('BusinessConfig reseteado y persistido en API', {
            organizationId,
            organizationName
          })
        }
      } catch (apiErr) {
        console.warn('Fallo al resetear en API, se mantiene localStorage:', apiErr)
        syncLogger.warn('Fallo al resetear BusinessConfig en API, se conserva local', undefined)
      }

    } catch (err) {
      console.error('Error resetting business config:', err);
      setError('Error al resetear la configuraciÃ³n del negocio');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const value = useMemo<BusinessConfigContextType>(() => ({
    config,
    updateConfig,
    loading,
    error,
    resetConfig,
    persisted,
    organizationId,
    organizationName
  }), [config, updateConfig, loading, error, resetConfig, persisted, organizationId, organizationName]);

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

export function StaticBusinessConfigProvider({
  children,
  config,
  organizationId = null,
  organizationName = null,
}: StaticBusinessConfigProviderProps) {
  const normalizedConfig = useMemo(() => normalizeBusinessConfig(config), [config]);
  const value = useMemo<BusinessConfigContextType>(() => ({
    config: normalizedConfig,
    updateConfig: async () => ({ persisted: true }),
    loading: false,
    error: null,
    resetConfig: async () => {},
    persisted: true,
    organizationId,
    organizationName,
  }), [normalizedConfig, organizationId, organizationName]);

  return (
    <BusinessConfigContext.Provider value={value}>
      {children}
    </BusinessConfigContext.Provider>
  );
}

// Hook personalizado para obtener solo la configuraciÃ³n (sin funciones de actualizaciÃ³n)
export function useBusinessConfigData() {
  const { config, loading, error } = useBusinessConfig();
  return { config, loading, error };
}

// Formateador de moneda basado en configuraciÃ³n del negocio
export function useCurrencyFormatter() {
  const { config } = useBusinessConfig();
  const currencyCode = config?.storeSettings?.currency || 'PYG';
  const currencyLocale = config?.regional?.locale || 'es-PY';
  const currencyDecimals = currencyCode === 'PYG' ? 0 : 2;
  return (value: number) => {
    return formatCurrency(value, currencyCode, currencyLocale, currencyDecimals);
  };
}
