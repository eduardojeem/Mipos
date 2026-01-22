// Utilidades para análisis de bundle y optimización de rendimiento

export interface BundleAnalysis {
  totalSize: number;
  chunks: ChunkInfo[];
  recommendations: string[];
}

export interface ChunkInfo {
  name: string;
  size: number;
  modules: string[];
  loadTime?: number;
}

// Función para analizar el rendimiento de carga de chunks
export function analyzeBundlePerformance(): Promise<BundleAnalysis> {
  return new Promise((resolve) => {
    const analysis: BundleAnalysis = {
      totalSize: 0,
      chunks: [],
      recommendations: []
    };

    // Simular análisis de chunks (en producción esto vendría de webpack-bundle-analyzer)
    if (typeof window !== 'undefined' && 'performance' in window) {
      const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      
      entries.forEach(entry => {
        if (entry.name.includes('_next/static/chunks/')) {
          const chunkName = entry.name.split('/').pop() || 'unknown';
          const size = entry.transferSize || 0;
          
          analysis.chunks.push({
            name: chunkName,
            size,
            modules: [], // En producción esto vendría del análisis real
            loadTime: entry.duration
          });
          
          analysis.totalSize += size;
        }
      });

      // Generar recomendaciones basadas en el análisis
      analysis.recommendations = generateOptimizationRecommendations(analysis);
    }

    resolve(analysis);
  });
}

function generateOptimizationRecommendations(analysis: BundleAnalysis): string[] {
  const recommendations: string[] = [];
  
  // Analizar chunks grandes
  const largeChunks = analysis.chunks.filter(chunk => chunk.size > 500000); // > 500KB
  if (largeChunks.length > 0) {
    recommendations.push(`Considerar dividir chunks grandes: ${largeChunks.map(c => c.name).join(', ')}`);
  }

  // Analizar tiempo de carga lento
  const slowChunks = analysis.chunks.filter(chunk => (chunk.loadTime || 0) > 1000); // > 1s
  if (slowChunks.length > 0) {
    recommendations.push(`Optimizar chunks con carga lenta: ${slowChunks.map(c => c.name).join(', ')}`);
  }

  // Recomendaciones generales
  if (analysis.totalSize > 2000000) { // > 2MB
    recommendations.push('El bundle total es grande, considerar lazy loading adicional');
  }

  if (analysis.chunks.length > 20) {
    recommendations.push('Muchos chunks pequeños, considerar consolidar algunos');
  }

  return recommendations;
}

// Hook para monitorear el rendimiento de carga
export function useLoadPerformance() {
  const [metrics, setMetrics] = React.useState<{
    fcp?: number;
    lcp?: number;
    cls?: number;
    fid?: number;
  }>({});

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    // First Contentful Paint
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          setMetrics(prev => ({ ...prev, fcp: entry.startTime }));
        }
      }
    });

    observer.observe({ entryTypes: ['paint'] });

    // Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      setMetrics(prev => ({ ...prev, lcp: lastEntry.startTime }));
    });

    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

    // Cumulative Layout Shift
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      }
      setMetrics(prev => ({ ...prev, cls: clsValue }));
    });

    clsObserver.observe({ entryTypes: ['layout-shift'] });

    return () => {
      observer.disconnect();
      lcpObserver.disconnect();
      clsObserver.disconnect();
    };
  }, []);

  return metrics;
}

// Función para precargar recursos críticos
export function preloadCriticalResources() {
  if (typeof window === 'undefined') return;

  // Evitar preloads de rutas estáticas de Next que pueden cambiar entre builds.
  // Usa fuentes gestionadas por next/font y scripts/estilos gestionados por Next.
  const criticalResources: Array<{ href: string; as: string; type?: string }> = [
    // Ejemplo: fuentes propias servidas estáticamente (si aplica)
    // { href: '/fonts/inter.woff2', as: 'font', type: 'font/woff2' },
  ];

  criticalResources.forEach(resource => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = resource.href;
    link.as = resource.as;
    if (resource.type) {
      link.type = resource.type;
      link.crossOrigin = 'anonymous';
    }
    document.head.appendChild(link);
  });
}

// Función para detectar y reportar problemas de rendimiento
export function detectPerformanceIssues(): string[] {
  const issues: string[] = [];

  if (typeof window === 'undefined') return issues;

  // Verificar tiempo de carga de la página
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  if (navigation) {
    const loadTime = navigation.loadEventEnd - navigation.startTime;
    if (loadTime > 3000) {
      issues.push(`Tiempo de carga lento: ${loadTime.toFixed(0)}ms`);
    }

    const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.startTime;
    if (domContentLoaded > 2000) {
      issues.push(`DOM lento en cargar: ${domContentLoaded.toFixed(0)}ms`);
    }
  }

  // Verificar recursos grandes
  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  const largeResources = resources.filter(resource => 
    (resource.transferSize || 0) > 1000000 // > 1MB
  );

  if (largeResources.length > 0) {
    issues.push(`Recursos grandes detectados: ${largeResources.length} archivos > 1MB`);
  }

  // Verificar memoria
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    if (memory.usedJSHeapSize > 50000000) { // > 50MB
      issues.push(`Alto uso de memoria: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB`);
    }
  }

  return issues;
}

// Función para optimizar imágenes automáticamente
export function optimizeImages() {
  if (typeof window === 'undefined') return;

  const images = document.querySelectorAll('img[data-optimize]');
  
  images.forEach((img) => {
    const imageElement = img as HTMLImageElement;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // Cargar imagen optimizada cuando sea visible
          const optimizedSrc = imageElement.dataset.src;
          if (optimizedSrc) {
            imageElement.src = optimizedSrc;
            imageElement.removeAttribute('data-optimize');
          }
          observer.unobserve(imageElement);
        }
      });
    });

    observer.observe(imageElement);
  });
}

// Hook para monitorear el uso de memoria
export function useMemoryMonitor() {
  const [memoryInfo, setMemoryInfo] = React.useState<{
    used: number;
    total: number;
    percentage: number;
  } | null>(null);

  React.useEffect(() => {
    const checkMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const used = memory.usedJSHeapSize;
        const total = memory.totalJSHeapSize;
        const percentage = (used / total) * 100;

        setMemoryInfo({ used, total, percentage });

        // Advertir si el uso de memoria es alto
        if (percentage > 80) {
          console.warn(`⚠️ Alto uso de memoria: ${percentage.toFixed(1)}%`);
        }
      }
    };

    checkMemory();
    const interval = setInterval(checkMemory, 10000); // Cada 10 segundos

    return () => clearInterval(interval);
  }, []);

  return memoryInfo;
}

// Import React para los hooks
import React from 'react';