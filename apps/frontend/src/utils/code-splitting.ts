import { lazy, ComponentType, LazyExoticComponent } from 'react';

// Types for code splitting
interface RouteConfig {
  path: string;
  component: string;
  preload?: boolean;
  priority?: 'high' | 'medium' | 'low';
  dependencies?: string[];
  chunkName?: string;
}

interface ChunkLoadingStrategy {
  immediate: string[];
  onHover: string[];
  onVisible: string[];
  onIdle: string[];
}

interface PreloadOptions {
  delay?: number;
  priority?: 'high' | 'low';
  crossOrigin?: 'anonymous' | 'use-credentials';
}

// Route-based code splitting configuration
export const ROUTE_CHUNKS: RouteConfig[] = [
  // Dashboard routes
  {
    path: '/dashboard',
    component: 'MainDashboard',
    preload: true,
    priority: 'high',
    chunkName: 'dashboard-main',
  },
  {
    path: '/dashboard/analytics',
    component: 'CustomerAnalytics',
    priority: 'medium',
    chunkName: 'dashboard-analytics',
  },
  {
    path: '/dashboard/stock-alerts',
    component: 'StockAlerts',
    priority: 'medium',
    chunkName: 'dashboard-stock',
  },

  // Product routes
  {
    path: '/products',
    component: 'ProductCatalog',
    priority: 'high',
    chunkName: 'products-catalog',
    dependencies: ['LazyTableComponents', 'LazyFormComponents'],
  },
  {
    path: '/products/create',
    component: 'ProductForm',
    priority: 'medium',
    chunkName: 'products-form',
  },
  {
    path: '/products/:id',
    component: 'ProductDetails',
    priority: 'medium',
    chunkName: 'products-details',
  },

  // Sales routes
  {
    path: '/sales',
    component: 'SalesManagement',
    priority: 'high',
    chunkName: 'sales-management',
  },
  {
    path: '/sales/pos',
    component: 'POSSystem',
    priority: 'high',
    chunkName: 'sales-pos',
  },

  // Inventory routes
  {
    path: '/inventory',
    component: 'InventoryManagement',
    priority: 'medium',
    chunkName: 'inventory-management',
  },

  // Customer routes
  {
    path: '/customers',
    component: 'CustomerManagement',
    priority: 'medium',
    chunkName: 'customers-management',
  },

  // Reports routes
  {
    path: '/reports',
    component: 'ReportsHub',
    priority: 'low',
    chunkName: 'reports-hub',
    dependencies: ['LazyChartComponents'],
  },

  // Settings routes
  {
    path: '/settings',
    component: 'SettingsPanel',
    priority: 'low',
    chunkName: 'settings-panel',
  },
];

// Chunk loading strategies
export const CHUNK_LOADING_STRATEGY: ChunkLoadingStrategy = {
  immediate: ['MainDashboard', 'ProductCatalog', 'SalesManagement'],
  onHover: ['CustomerAnalytics', 'StockAlerts', 'POSSystem'],
  onVisible: ['InventoryManagement', 'CustomerManagement'],
  onIdle: ['ReportsHub', 'SettingsPanel'],
};

// Dynamic import with error handling and retry logic
export const createDynamicImport = (
  importFn: () => Promise<{ default: ComponentType<any> }>,
  options: {
    retries?: number;
    retryDelay?: number;
    fallback?: ComponentType;
    chunkName?: string;
  } = {}
): LazyExoticComponent<ComponentType<any>> => {
  const { retries = 3, retryDelay = 1000, chunkName } = options;

  const importWithRetry = async (attempt = 1): Promise<{ default: ComponentType<any> }> => {
    try {
      const startTime = performance.now();
      const mod = await importFn();
      const loadTime = performance.now() - startTime;

      // Log performance metrics
      if (chunkName) {
        console.log(`Chunk "${chunkName}" loaded in ${loadTime.toFixed(2)}ms`);
      }

      return mod;
    } catch (error) {
      console.error(`Failed to load chunk (attempt ${attempt}):`, error);

      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        return importWithRetry(attempt + 1);
      }

      throw error;
    }
  };

  return lazy(importWithRetry);
};

// Preload chunks based on strategy
export const preloadChunk = (
  importFn: () => Promise<any>,
  options: PreloadOptions = {}
): Promise<void> => {
  const { delay = 0, priority = 'low' } = options;

  return new Promise((resolve) => {
    const load = () => {
      // Create link element for preloading
      const link = document.createElement('link');
      link.rel = priority === 'high' ? 'preload' : 'prefetch';
      link.as = 'script';
      
      // Start the import
      importFn()
        .then(() => {
          resolve();
        })
        .catch((error) => {
          console.warn('Preload failed:', error);
          resolve(); // Don't reject, just log the warning
        });
    };

    if (delay > 0) {
      setTimeout(load, delay);
    } else {
      load();
    }
  });
};

// Intelligent preloading based on user behavior
export class IntelligentPreloader {
  private preloadedChunks = new Set<string>();
  private hoverTimeouts = new Map<string, NodeJS.Timeout>();
  private intersectionObserver?: IntersectionObserver;

  constructor() {
    this.setupIntersectionObserver();
    this.preloadCriticalChunks();
  }

  private setupIntersectionObserver() {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return;
    }

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const chunkName = entry.target.getAttribute('data-chunk');
            if (chunkName && !this.preloadedChunks.has(chunkName)) {
              this.preloadChunk(chunkName);
            }
          }
        });
      },
      {
        rootMargin: '100px',
        threshold: 0.1,
      }
    );
  }

  private async preloadCriticalChunks() {
    // Preload immediate chunks
    for (const chunkName of CHUNK_LOADING_STRATEGY.immediate) {
      await this.preloadChunk(chunkName);
    }

    // Preload on idle
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        CHUNK_LOADING_STRATEGY.onIdle.forEach(chunkName => {
          this.preloadChunk(chunkName);
        });
      });
    }
  }

  private async preloadChunk(chunkName: string) {
    if (this.preloadedChunks.has(chunkName)) {
      return;
    }

    this.preloadedChunks.add(chunkName);

    try {
      // Find the route config for this chunk
      const routeConfig = ROUTE_CHUNKS.find(
        route => route.component === chunkName || route.chunkName === chunkName
      );

      if (!routeConfig) {
        console.warn(`No route config found for chunk: ${chunkName}`);
        return;
      }

      // Dynamic import based on component name
      const importFn = this.getImportFunction(routeConfig.component);
      if (importFn) {
        await preloadChunk(importFn, {
          priority: routeConfig.priority === 'high' ? 'high' : 'low',
        });
      }
    } catch (error) {
      console.error(`Failed to preload chunk ${chunkName}:`, error);
      this.preloadedChunks.delete(chunkName);
    }
  }

  private getImportFunction(componentName: string): (() => Promise<any>) | null {
    // Map component names to their import functions
    const importMap: Record<string, () => Promise<any>> = {
      MainDashboard: () => import('../components/dashboard/MainDashboard'),
      CustomerAnalytics: () => import('../components/dashboard/CustomerAnalytics'),
      StockAlerts: () => import('../components/dashboard/StockAlerts'),
      ProductCatalog: () => import('../components/products/ProductCatalog'),
      ProductForm: () => import('../components/products/ProductForm'),
      ProductDetails: () => import('../components/products/ProductDetails'),
      SalesManagement: () => import('../components/sales/SalesManagement'),
      POSSystem: () => import('../components/sales/POSSystem'),
      InventoryManagement: () => import('../components/inventory/InventoryManagement'),
      CustomerManagement: () => import('../components/customers/CustomerManagement'),
      ReportsHub: () => import('../components/reports/ReportsHub'),
      SettingsPanel: () => import('../components/settings/SettingsPanel'),
    };

    return importMap[componentName] || null;
  }

  // Setup hover preloading
  setupHoverPreloading(element: HTMLElement, chunkName: string) {
    if (CHUNK_LOADING_STRATEGY.onHover.includes(chunkName)) {
      element.addEventListener('mouseenter', () => {
        const timeout = setTimeout(() => {
          this.preloadChunk(chunkName);
        }, 100); // Small delay to avoid unnecessary preloads

        this.hoverTimeouts.set(chunkName, timeout);
      });

      element.addEventListener('mouseleave', () => {
        const timeout = this.hoverTimeouts.get(chunkName);
        if (timeout) {
          clearTimeout(timeout);
          this.hoverTimeouts.delete(chunkName);
        }
      });
    }
  }

  // Setup visibility-based preloading
  setupVisibilityPreloading(element: HTMLElement, chunkName: string) {
    if (CHUNK_LOADING_STRATEGY.onVisible.includes(chunkName) && this.intersectionObserver) {
      element.setAttribute('data-chunk', chunkName);
      this.intersectionObserver.observe(element);
    }
  }

  // Cleanup
  destroy() {
    this.hoverTimeouts.forEach(timeout => clearTimeout(timeout));
    this.hoverTimeouts.clear();
    
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
  }
}

// Create global preloader instance
export const intelligentPreloader = new IntelligentPreloader();

// Utility to create route-based lazy components
export const createLazyRoute = (routePath: string) => {
  const routeConfig = ROUTE_CHUNKS.find(route => route.path === routePath);
  
  if (!routeConfig) {
    throw new Error(`No route configuration found for path: ${routePath}`);
  }

  const importFn = () => {
    switch (routeConfig.component) {
      case 'MainDashboard':
        return import('../components/dashboard/MainDashboard').then(m => ({ default: m.default }));
      case 'CustomerAnalytics':
        return import('../components/dashboard/CustomerAnalytics').then(m => ({ default: m.default }));
      case 'StockAlerts':
        return import('../components/dashboard/StockAlerts').then(m => ({ default: m.default }));
      case 'ProductCatalog':
        return import('../components/products/ProductCatalog').then(m => ({ default: m.default }));
      case 'ProductForm':
        return import('../components/products/ProductForm').then(m => ({ default: m.default }));
      case 'ProductDetails':
        return import('../components/products/ProductDetails').then(m => ({ default: m.default }));
      case 'SalesManagement':
        return import('../components/sales/SalesManagement').then(m => ({ default: m.default }));
      case 'POSSystem':
        return import('../components/sales/POSSystem').then(m => ({ default: m.default }));
      case 'InventoryManagement':
        return import('../components/inventory/InventoryManagement').then(m => ({ default: m.default }));
      case 'CustomerManagement':
        return import('../components/customers/CustomerManagement').then(m => ({ default: m.CustomerManagement }));
      case 'ReportsHub':
        return import('../components/reports/ReportsHub').then(m => ({ default: m.default }));
      case 'SettingsPanel':
        return import('../components/settings/SettingsPanel').then(m => ({ default: m.default }));
      default:
        throw new Error(`Unknown component: ${routeConfig.component}`);
    }
  };

  return createDynamicImport(importFn, {
    chunkName: routeConfig.chunkName,
    retries: 3,
    retryDelay: 1000,
  });
};

// Bundle analyzer utilities
export const analyzeBundleSize = () => {
  if (typeof window === 'undefined') return null;

  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  const jsResources = resources.filter(resource => 
    resource.name.includes('.js') && !resource.name.includes('hot-update')
  );

  const analysis = {
    totalResources: jsResources.length,
    totalSize: jsResources.reduce((sum, resource) => sum + (resource.transferSize || 0), 0),
    gzippedSize: jsResources.reduce((sum, resource) => sum + (resource.encodedBodySize || 0), 0),
    uncompressedSize: jsResources.reduce((sum, resource) => sum + (resource.decodedBodySize || 0), 0),
    cacheHits: jsResources.filter(resource => resource.transferSize === 0).length,
    loadTimes: jsResources.map(resource => ({
      name: resource.name.split('/').pop() || 'unknown',
      loadTime: resource.responseEnd - resource.requestStart,
      size: resource.transferSize || 0,
    })).sort((a, b) => b.loadTime - a.loadTime),
  };

  return analysis;
};

export const CodeSplittingUtils = {
  createDynamicImport,
  preloadChunk,
  IntelligentPreloader,
  intelligentPreloader,
  createLazyRoute,
  analyzeBundleSize,
  ROUTE_CHUNKS,
  CHUNK_LOADING_STRATEGY,
};
