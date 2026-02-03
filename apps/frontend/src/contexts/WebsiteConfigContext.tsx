'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { createClient } from '@/lib/supabase';
import { isSupabaseActive } from '@/lib/env';

// Website Configuration Types
export interface WebsiteConfig {
  branding: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    backgroundColor: string;
    textColor: string;
    gradientStart: string;
    gradientEnd: string;
    logo: string;
    favicon: string;
    brandName: string;
    tagline: string;
  };
  hero: {
    title: string;
    highlight: string;
    description: string;
    backgroundImage: string;
    ctaText: string;
    ctaLink: string;
  };
  carousel: {
    enabled: boolean;
    transitionSeconds: number;
    autoplay: boolean;
    transitionMs: number;
    ratio: number;
    images: Array<{
      id: string;
      url: string;
      alt: string;
      title?: string;
      link?: string;
    }>;
  };
  homeOffersCarousel: {
    enabled: boolean;
    autoplay: boolean;
    intervalSeconds: number;
    transitionMs: number;
    ratio: number;
    title: string;
    subtitle: string;
  };
  contact: {
    phone: string;
    email: string;
    whatsapp: string;
    address: {
      street: string;
      city: string;
      department: string;
      country: string;
      postalCode: string;
      mapUrl: string;
      mapEmbedUrl: string;
      mapEmbedEnabled: boolean;
      latitude: number | null;
      longitude: number | null;
    };
  };
  businessHours: {
    schedule: string[];
    specialHours: {
      holidays: string;
      vacation: string;
    };
    timezone: string;
  };
  seo: {
    title: string;
    description: string;
    keywords: string[];
    ogImage: string;
    twitterCard: string;
    canonicalUrl: string;
    robots: string;
  };
  analytics: {
    googleAnalytics: string;
    googleTagManager: string;
    facebookPixel: string;
    hotjar: string;
    enabled: boolean;
  };
  socialMedia: {
    facebook: string;
    instagram: string;
    twitter: string;
    linkedin: string;
    youtube: string;
    tiktok: string;
    enabled: boolean;
  };
  features: {
    enableBlog: boolean;
    enableTestimonials: boolean;
    enableNewsletter: boolean;
    enableLiveChat: boolean;
    enableSearch: boolean;
    enableWishlist: boolean;
    enableCompare: boolean;
  };
  legal: {
    termsUrl: string;
    privacyUrl: string;
    cookiePolicy: string;
    refundPolicy: string;
    shippingPolicy: string;
  };
  maintenance: {
    enabled: boolean;
    message: string;
    allowedIPs: string[];
    estimatedTime: string;
  };
  performance: {
    enableCaching: boolean;
    cacheTimeout: number;
    enableCompression: boolean;
    enableLazyLoading: boolean;
    optimizeImages: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

// Default website configuration
export const defaultWebsiteConfig: WebsiteConfig = {
  branding: {
    primaryColor: '#dc2626',
    secondaryColor: '#1d4ed8',
    accentColor: '#059669',
    backgroundColor: '#f7f9fb',
    textColor: '#202c38',
    gradientStart: '#e9f0f7',
    gradientEnd: '#f9fbfe',
    logo: '',
    favicon: '',
    brandName: 'Mi Negocio',
    tagline: 'Calidad y servicio de excelencia'
  },
  hero: {
    title: 'Bienvenidos a',
    highlight: 'nuestro negocio',
    description: 'Ofrecemos productos y servicios de la más alta calidad.',
    backgroundImage: '',
    ctaText: 'Ver Productos',
    ctaLink: '/productos'
  },
  carousel: {
    enabled: true,
    transitionSeconds: 5,
    autoplay: true,
    transitionMs: 500,
    ratio: 2.5,
    images: []
  },
  homeOffersCarousel: {
    enabled: true,
    autoplay: true,
    intervalSeconds: 5,
    transitionMs: 500,
    ratio: 2.5,
    title: 'Ofertas Especiales',
    subtitle: 'No te pierdas nuestras promociones'
  },
  contact: {
    phone: '+595 21 123456',
    email: 'info@minegocio.com.py',
    whatsapp: '+595 981 123456',
    address: {
      street: 'Av. Principal 123',
      city: 'Asunción',
      department: 'Central',
      country: 'Paraguay',
      postalCode: '1234',
      mapUrl: '',
      mapEmbedUrl: '',
      mapEmbedEnabled: false,
      latitude: null,
      longitude: null
    }
  },
  businessHours: {
    schedule: ['Lunes - Viernes: 8:00 - 18:00', 'Sábados: 8:00 - 12:00'],
    specialHours: {
      holidays: 'Cerrado en feriados nacionales',
      vacation: ''
    },
    timezone: 'America/Asuncion'
  },
  seo: {
    title: 'Mi Negocio - Calidad y Servicio',
    description: 'Ofrecemos productos y servicios de calidad en Paraguay',
    keywords: ['productos', 'servicios', 'calidad', 'paraguay'],
    ogImage: '',
    twitterCard: 'summary_large_image',
    canonicalUrl: '',
    robots: 'index,follow'
  },
  analytics: {
    googleAnalytics: '',
    googleTagManager: '',
    facebookPixel: '',
    hotjar: '',
    enabled: false
  },
  socialMedia: {
    facebook: '',
    instagram: '',
    twitter: '',
    linkedin: '',
    youtube: '',
    tiktok: '',
    enabled: false
  },
  features: {
    enableBlog: false,
    enableTestimonials: true,
    enableNewsletter: false,
    enableLiveChat: false,
    enableSearch: true,
    enableWishlist: false,
    enableCompare: false
  },
  legal: {
    termsUrl: '',
    privacyUrl: '',
    cookiePolicy: '',
    refundPolicy: '',
    shippingPolicy: ''
  },
  maintenance: {
    enabled: false,
    message: 'Sitio en mantenimiento. Volvemos pronto.',
    allowedIPs: [],
    estimatedTime: ''
  },
  performance: {
    enableCaching: true,
    cacheTimeout: 3600,
    enableCompression: true,
    enableLazyLoading: true,
    optimizeImages: true
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

interface WebsiteConfigContextType {
  config: WebsiteConfig;
  updateConfig: (updates: Partial<WebsiteConfig>) => Promise<{ persisted: boolean }>;
  loading: boolean;
  error: string | null;
  resetConfig: () => Promise<void>;
  persisted: boolean;
}

const WebsiteConfigContext = createContext<WebsiteConfigContextType | undefined>(undefined);

interface WebsiteConfigProviderProps {
  children: ReactNode;
}

export function WebsiteConfigProvider({ children }: WebsiteConfigProviderProps) {
  const [config, setConfig] = useState<WebsiteConfig>(defaultWebsiteConfig);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [persisted, setPersisted] = useState(false);

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Load from localStorage first
      try {
        const savedConfig = localStorage.getItem('websiteConfig');
        if (savedConfig) {
          const parsedConfig = JSON.parse(savedConfig);
          setConfig({ ...defaultWebsiteConfig, ...parsedConfig });
        }
      } catch (localErr) {
        console.warn('Error loading website config from localStorage:', localErr);
      }

      // Load from API if Supabase is active
      if (isSupabaseActive()) {
        try {
          const response = await fetch('/api/website-config', { 
            cache: 'no-store',
            signal: AbortSignal.timeout(15000)
          });
          
          if (response.ok) {
            const apiData = await response.json();
            const apiConfig = apiData?.config || apiData;
            
            if (apiConfig && typeof apiConfig === 'object') {
              const normalized = { ...defaultWebsiteConfig, ...apiConfig };
              setConfig(normalized);
              
              localStorage.setItem('websiteConfig', JSON.stringify(normalized));
              setPersisted(true);
            }
          }
        } catch (apiErr) {
          console.warn('API website config load failed, using local config:', apiErr);
        }
      }

    } catch (err) {
      console.error('Error loading website config:', err);
      setError('Error al cargar la configuración del sitio web');
      setConfig(defaultWebsiteConfig);
      setPersisted(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const updateConfig = async (updates: Partial<WebsiteConfig>) => {
    try {
      setLoading(true);
      setError(null);

      const updatedConfig = {
        ...config,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      setConfig(updatedConfig);
      localStorage.setItem('websiteConfig', JSON.stringify(updatedConfig));

      // Save to API
      let persisted = false;
      try {
        const response = await fetch('/api/website-config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedConfig)
        });

        if (response.ok) {
          persisted = true;
          setPersisted(true);
        }
      } catch (apiErr) {
        console.warn('Failed to persist website config to API:', apiErr);
      }

      return { persisted };

    } catch (err) {
      console.error('Error updating website config:', err);
      setError('Error al actualizar la configuración del sitio web');
      return { persisted: false };
    } finally {
      setLoading(false);
    }
  };

  const resetConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      const resetConfigData = {
        ...defaultWebsiteConfig,
        updatedAt: new Date().toISOString()
      };

      setConfig(resetConfigData);
      localStorage.setItem('websiteConfig', JSON.stringify(resetConfigData));
      setPersisted(false);

      // Reset in API
      try {
        const response = await fetch('/api/website-config/reset', { method: 'POST' });
        if (response.ok) {
          setPersisted(true);
        }
      } catch (apiErr) {
        console.warn('Failed to reset website config in API:', apiErr);
      }

    } catch (err) {
      console.error('Error resetting website config:', err);
      setError('Error al resetear la configuración del sitio web');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const value: WebsiteConfigContextType = {
    config,
    updateConfig,
    loading,
    error,
    resetConfig,
    persisted
  };

  return (
    <WebsiteConfigContext.Provider value={value}>
      {children}
    </WebsiteConfigContext.Provider>
  );
}

export function useWebsiteConfig() {
  const context = useContext(WebsiteConfigContext);
  if (context === undefined) {
    throw new Error('useWebsiteConfig must be used within a WebsiteConfigProvider');
  }
  return context;
}

// Hook for read-only access to website config
export function useWebsiteConfigData() {
  const { config, loading, error } = useWebsiteConfig();
  return { config, loading, error };
}