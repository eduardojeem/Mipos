// Utilidades de rendimiento para el sistema POS

// Función para medir el tiempo de ejecución de funciones
export function measurePerformance<T>(
  fn: () => T | Promise<T>,
  label: string
): T | Promise<T> {
  const start = performance.now();
  
  const result = fn();
  
  if (result instanceof Promise) {
    return result.then((value) => {
      const end = performance.now();
      console.log(`⚡ ${label}: ${(end - start).toFixed(2)}ms`);
      return value;
    }) as Promise<T>;
  } else {
    const end = performance.now();
    console.log(`⚡ ${label}: ${(end - start).toFixed(2)}ms`);
    return result;
  }
}

// Debounce para optimizar búsquedas
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle para limitar la frecuencia de ejecución
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Función para precargar imágenes
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
}

// Función para precargar múltiples imágenes
export async function preloadImages(urls: string[]): Promise<void> {
  const promises = urls.map(preloadImage);
  await Promise.allSettled(promises);
}

// Función para lazy loading de componentes
export function createLazyComponent<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback?: React.ComponentType
) {
  const LazyComponent = React.lazy(importFn);
  
  const LazyWrapper = (props: React.ComponentProps<T>) => 
    React.createElement(
      React.Suspense,
      { 
        fallback: fallback 
          ? React.createElement(fallback) 
          : React.createElement('div', {}, 'Cargando...')
      },
      React.createElement(LazyComponent, props)
    );
  
  LazyWrapper.displayName = 'LazyWrapper';
  return LazyWrapper;
}

// Hook para detectar si un elemento está visible (Intersection Observer)
export function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  options?: IntersectionObserverInit
) {
  const [isVisible, setIsVisible] = React.useState(false);
  
  React.useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      options
    );
    
    observer.observe(element);
    
    return () => observer.disconnect();
  }, [elementRef, options]);
  
  return isVisible;
}

// Función para optimizar renders con React.memo
export function createMemoizedComponent<T extends React.FunctionComponent<any>>(
  Component: T,
  areEqual?: (
    prevProps: Readonly<React.ComponentProps<T>>,
    nextProps: Readonly<React.ComponentProps<T>>
  ) => boolean
) {
  return React.memo(Component, areEqual as any);
}

// Función para batch de actualizaciones de estado
import ReactDOM from 'react-dom';

export function batchUpdates(updates: (() => void)[]): void {
  ReactDOM.unstable_batchedUpdates(() => {
    updates.forEach(update => update());
  });
}

// Función para medir el tiempo de carga de la página
export function measurePageLoad(): void {
  if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
      const loadTime = performance.now();
      console.log(`📊 Tiempo de carga de página: ${loadTime.toFixed(2)}ms`);
      
      // Métricas de rendimiento web
      if ('getEntriesByType' in performance) {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        if (navigation) {
          console.log('📈 Métricas de rendimiento:');
          console.log(`  - DNS Lookup: ${(navigation.domainLookupEnd - navigation.domainLookupStart).toFixed(2)}ms`);
          console.log(`  - TCP Connection: ${(navigation.connectEnd - navigation.connectStart).toFixed(2)}ms`);
          console.log(`  - Request: ${(navigation.responseStart - navigation.requestStart).toFixed(2)}ms`);
          console.log(`  - Response: ${(navigation.responseEnd - navigation.responseStart).toFixed(2)}ms`);
        }
      }
    });
  }
}

// Hook para optimizar imágenes lazy loading
export function useImageLoader(
  src: string,
  placeholder?: string
): {
  src: string;
  loading: boolean;
  error: boolean;
} {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [imageSrc, setImageSrc] = React.useState(placeholder || '');
  
  React.useEffect(() => {
    const img = new Image();
    
    img.onload = () => {
      setImageSrc(src);
      setLoading(false);
    };
    
    img.onerror = () => {
      setError(true);
      setLoading(false);
    };
    
    img.src = src;
  }, [src]);
  
  return {
    src: imageSrc,
    loading,
    error
  };
}

// Función para detectar el tipo de conexión del usuario
export function getConnectionType(): string {
  if (typeof navigator !== 'undefined' && 'connection' in navigator) {
    const connection = (navigator as any).connection;
    return connection?.effectiveType || 'unknown';
  }
  return 'unknown';
}

// Función para adaptar la calidad de contenido según la conexión
export function adaptContentQuality(): 'high' | 'medium' | 'low' {
  const connectionType = getConnectionType();
  
  switch (connectionType) {
    case '4g':
      return 'high';
    case '3g':
      return 'medium';
    case '2g':
    case 'slow-2g':
      return 'low';
    default:
      return 'medium';
  }
}

// Import React para los hooks
import React from 'react';