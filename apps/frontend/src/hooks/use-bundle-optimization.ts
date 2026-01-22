'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

// Types for bundle optimization
interface BundleStats {
  totalSize: number;
  loadedChunks: string[];
  pendingChunks: string[];
  failedChunks: string[];
  loadTime: number;
  cacheHitRate: number;
}

interface LazyLoadConfig {
  threshold: number;
  rootMargin: string;
  preloadDelay: number;
  maxConcurrentLoads: number;
}

interface PerformanceMetrics {
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
  timeToInteractive: number;
}

// Default configuration
const DEFAULT_LAZY_CONFIG: LazyLoadConfig = {
  threshold: 0.1,
  rootMargin: '50px',
  preloadDelay: 100,
  maxConcurrentLoads: 3,
};

// Bundle optimization hook
export const useBundleOptimization = (config: Partial<LazyLoadConfig> = {}) => {
  const [bundleStats, setBundleStats] = useState<BundleStats>({
    totalSize: 0,
    loadedChunks: [],
    pendingChunks: [],
    failedChunks: [],
    loadTime: 0,
    cacheHitRate: 0,
  });

  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    firstContentfulPaint: 0,
    largestContentfulPaint: 0,
    cumulativeLayoutShift: 0,
    firstInputDelay: 0,
    timeToInteractive: 0,
  });

  const [isOptimizing, setIsOptimizing] = useState(false);
  const [loadingQueue, setLoadingQueue] = useState<string[]>([]);
  const [activeLoads, setActiveLoads] = useState<Set<string>>(new Set());

  const finalConfig = useMemo(() => ({
    ...DEFAULT_LAZY_CONFIG,
    ...config,
  }), [config]);

  // Performance observer for Web Vitals
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      
      entries.forEach((entry) => {
        switch (entry.entryType) {
          case 'paint':
            if (entry.name === 'first-contentful-paint') {
              setPerformanceMetrics(prev => ({
                ...prev,
                firstContentfulPaint: entry.startTime,
              }));
            }
            break;
          case 'largest-contentful-paint':
            setPerformanceMetrics(prev => ({
              ...prev,
              largestContentfulPaint: entry.startTime,
            }));
            break;
          case 'layout-shift':
            if (!(entry as any).hadRecentInput) {
              setPerformanceMetrics(prev => ({
                ...prev,
                cumulativeLayoutShift: prev.cumulativeLayoutShift + (entry as any).value,
              }));
            }
            break;
          case 'first-input':
            setPerformanceMetrics(prev => ({
              ...prev,
              firstInputDelay: (entry as any).processingStart - entry.startTime,
            }));
            break;
        }
      });
    });

    try {
      observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'layout-shift', 'first-input'] });
    } catch (error) {
      console.warn('Performance Observer not supported:', error);
    }

    return () => observer.disconnect();
  }, []);

  // Chunk loading management
  const loadChunk = useCallback(async (chunkName: string): Promise<void> => {
    if (activeLoads.has(chunkName) || bundleStats.loadedChunks.includes(chunkName)) {
      return;
    }

    if (activeLoads.size >= finalConfig.maxConcurrentLoads) {
      setLoadingQueue(prev => [...prev, chunkName]);
      return;
    }

    setActiveLoads(prev => new Set([...prev, chunkName]));
    setBundleStats(prev => ({
      ...prev,
      pendingChunks: [...prev.pendingChunks, chunkName],
    }));

    const startTime = performance.now();

    try {
      // Simulate chunk loading (replace with actual dynamic import)
      await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 100));
      
      const loadTime = performance.now() - startTime;
      
      setActiveLoads(prev => {
        const newSet = new Set(prev);
        newSet.delete(chunkName);
        return newSet;
      });

      setBundleStats(prev => ({
        ...prev,
        loadedChunks: [...prev.loadedChunks, chunkName],
        pendingChunks: prev.pendingChunks.filter(chunk => chunk !== chunkName),
        loadTime: prev.loadTime + loadTime,
      }));

      // Process next item in queue
      if (loadingQueue.length > 0) {
        const nextChunk = loadingQueue[0];
        setLoadingQueue(prev => prev.slice(1));
        setTimeout(() => loadChunk(nextChunk), finalConfig.preloadDelay);
      }

    } catch (error) {
      console.error(`Failed to load chunk ${chunkName}:`, error);
      
      setActiveLoads(prev => {
        const newSet = new Set(prev);
        newSet.delete(chunkName);
        return newSet;
      });

      setBundleStats(prev => ({
        ...prev,
        failedChunks: [...prev.failedChunks, chunkName],
        pendingChunks: prev.pendingChunks.filter(chunk => chunk !== chunkName),
      }));
    }
  }, [activeLoads, bundleStats.loadedChunks, finalConfig.maxConcurrentLoads, finalConfig.preloadDelay, loadingQueue]);

  // Preload critical chunks
  const preloadChunks = useCallback((chunkNames: string[]) => {
    chunkNames.forEach((chunkName, index) => {
      setTimeout(() => {
        loadChunk(chunkName);
      }, index * finalConfig.preloadDelay);
    });
  }, [loadChunk, finalConfig.preloadDelay]);

  // Intersection Observer for lazy loading
  const createLazyLoader = useCallback((callback: () => void) => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      callback();
      return () => {};
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            callback();
            observer.disconnect();
          }
        });
      },
      {
        threshold: finalConfig.threshold,
        rootMargin: finalConfig.rootMargin,
      }
    );

    return (element: Element) => {
      observer.observe(element);
      return () => observer.disconnect();
    };
  }, [finalConfig.threshold, finalConfig.rootMargin]);

  // Bundle size analysis
  const analyzeBundleSize = useCallback(() => {
    if (typeof window === 'undefined') return;

    setIsOptimizing(true);

    // Analyze loaded resources
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const jsResources = resources.filter(resource => 
      resource.name.includes('.js') || resource.name.includes('chunk')
    );

    const totalSize = jsResources.reduce((sum, resource) => {
      return sum + (resource.transferSize || 0);
    }, 0);

    const cacheHits = jsResources.filter(resource => resource.transferSize === 0).length;
    const cacheHitRate = jsResources.length > 0 ? (cacheHits / jsResources.length) * 100 : 0;

    setBundleStats(prev => ({
      ...prev,
      totalSize,
      cacheHitRate,
    }));

    setIsOptimizing(false);
  }, []);

  // Get optimization recommendations
  const getOptimizationRecommendations = useCallback(() => {
    const recommendations: string[] = [];

    if (performanceMetrics.firstContentfulPaint > 2000) {
      recommendations.push('Consider reducing initial bundle size');
    }

    if (performanceMetrics.largestContentfulPaint > 4000) {
      recommendations.push('Optimize largest contentful paint with image optimization');
    }

    if (performanceMetrics.cumulativeLayoutShift > 0.1) {
      recommendations.push('Reduce layout shifts by reserving space for dynamic content');
    }

    if (performanceMetrics.firstInputDelay > 100) {
      recommendations.push('Reduce JavaScript execution time');
    }

    if (bundleStats.totalSize > 1024 * 1024) { // 1MB
      recommendations.push('Bundle size is large, consider code splitting');
    }

    if (bundleStats.cacheHitRate < 50) {
      recommendations.push('Improve caching strategy');
    }

    if (bundleStats.failedChunks.length > 0) {
      recommendations.push('Fix failed chunk loading issues');
    }

    return recommendations;
  }, [performanceMetrics, bundleStats]);

  // Clear failed chunks and retry
  const retryFailedChunks = useCallback(() => {
    const failedChunks = [...bundleStats.failedChunks];
    setBundleStats(prev => ({
      ...prev,
      failedChunks: [],
    }));

    failedChunks.forEach(chunk => loadChunk(chunk));
  }, [bundleStats.failedChunks, loadChunk]);

  // Get performance score
  const getPerformanceScore = useCallback(() => {
    let score = 100;

    // FCP penalty
    if (performanceMetrics.firstContentfulPaint > 2000) score -= 20;
    else if (performanceMetrics.firstContentfulPaint > 1000) score -= 10;

    // LCP penalty
    if (performanceMetrics.largestContentfulPaint > 4000) score -= 25;
    else if (performanceMetrics.largestContentfulPaint > 2500) score -= 15;

    // CLS penalty
    if (performanceMetrics.cumulativeLayoutShift > 0.25) score -= 20;
    else if (performanceMetrics.cumulativeLayoutShift > 0.1) score -= 10;

    // FID penalty
    if (performanceMetrics.firstInputDelay > 300) score -= 15;
    else if (performanceMetrics.firstInputDelay > 100) score -= 5;

    // Bundle size penalty
    if (bundleStats.totalSize > 2 * 1024 * 1024) score -= 15; // 2MB
    else if (bundleStats.totalSize > 1024 * 1024) score -= 5; // 1MB

    return Math.max(0, Math.round(score));
  }, [performanceMetrics, bundleStats.totalSize]);

  return {
    bundleStats,
    performanceMetrics,
    isOptimizing,
    loadingQueue,
    activeLoads: Array.from(activeLoads),
    loadChunk,
    preloadChunks,
    createLazyLoader,
    analyzeBundleSize,
    getOptimizationRecommendations,
    retryFailedChunks,
    getPerformanceScore,
  };
};

// Hook for component-level lazy loading
export const useLazyComponent = <T>(
  importFn: () => Promise<{ default: T }>,
  options: { preload?: boolean; delay?: number } = {}
) => {
  const [Component, setComponent] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadComponent = useCallback(async () => {
    if (Component || loading) return;

    setLoading(true);
    setError(null);

    try {
      if (options.delay) {
        await new Promise(resolve => setTimeout(resolve, options.delay));
      }

      const loaded = await importFn();
      setComponent(loaded.default);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [Component, loading, importFn, options.delay]);

  useEffect(() => {
    if (options.preload) {
      loadComponent();
    }
  }, [options.preload, loadComponent]);

  return {
    Component,
    loading,
    error,
    loadComponent,
  };
};

export default useBundleOptimization;
