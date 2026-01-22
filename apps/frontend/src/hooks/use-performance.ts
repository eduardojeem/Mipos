import { useEffect, useRef, useState, useCallback, useMemo } from 'react';

export interface PerformanceMetrics {
  renderTime: number;
  componentName: string;
  timestamp: number;
  memoryUsage?: number;
  props?: Record<string, any>;
}

export interface PerformanceConfig {
  enableLogging: boolean;
  threshold: number; // milliseconds
  trackMemory: boolean;
  trackProps: boolean;
}

const defaultConfig: PerformanceConfig = {
  enableLogging: process.env.NODE_ENV === 'development',
  threshold: 16, // 16ms for 60fps
  trackMemory: true,
  trackProps: false
};

/**
 * Hook to monitor component performance
 */
export const usePerformanceMonitor = (
  componentName: string,
  config: Partial<PerformanceConfig> = {}
) => {
  const finalConfig = useMemo(() => ({ ...defaultConfig, ...config }), [config]);
  const renderStartTime = useRef<number>(0);
  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([]);

  const startMeasure = useCallback(() => {
    if (finalConfig.enableLogging) {
      renderStartTime.current = performance.now();
    }
  }, [finalConfig.enableLogging]);

  const endMeasure = useCallback((props?: Record<string, any>) => {
    if (finalConfig.enableLogging && renderStartTime.current > 0) {
      const renderTime = performance.now() - renderStartTime.current;
      
      const metric: PerformanceMetrics = {
        renderTime,
        componentName,
        timestamp: Date.now(),
        memoryUsage: finalConfig.trackMemory ? getMemoryUsage() : undefined,
        props: finalConfig.trackProps ? props : undefined
      };

      setMetrics(prev => [...prev.slice(-9), metric]); // Keep last 10 measurements

      if (renderTime > finalConfig.threshold) {
        console.warn(`🐌 Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`);
      }

      renderStartTime.current = 0;
    }
  }, [componentName, finalConfig]);

  return { startMeasure, endMeasure, metrics };
};

/**
 * Hook to track component mount/unmount performance
 */
export const useComponentLifecycle = (componentName: string) => {
  const mountTime = useRef<number>(0);

  useEffect(() => {
    mountTime.current = performance.now();
    
    return () => {
      const unmountTime = performance.now();
      const lifecycleTime = unmountTime - mountTime.current;
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`📊 ${componentName} lifecycle: ${lifecycleTime.toFixed(2)}ms`);
      }
    };
  }, [componentName]);
};

/**
 * Hook to detect memory leaks
 */
export const useMemoryLeakDetector = (componentName: string, interval = 5000) => {
  const [memoryTrend, setMemoryTrend] = useState<number[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      intervalRef.current = setInterval(() => {
        const memory = getMemoryUsage();
        if (memory) {
          setMemoryTrend(prev => {
            const newTrend = [...prev.slice(-19), memory]; // Keep last 20 measurements
            
            // Check for memory leak (consistent growth over 10 measurements)
            if (newTrend.length >= 10) {
              const recent = newTrend.slice(-10);
              const isGrowing = recent.every((val, i) => i === 0 || val >= recent[i - 1]);
              const growth = recent[recent.length - 1] - recent[0];
              
              if (isGrowing && growth > 5) { // 5MB growth
                console.warn(`🚨 Potential memory leak in ${componentName}: +${growth.toFixed(2)}MB`);
              }
            }
            
            return newTrend;
          });
        }
      }, interval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [componentName, interval]);

  return memoryTrend;
};

/**
 * Hook to optimize expensive calculations
 */
  export const useOptimizedCalculation = <T>(
  calculation: () => T,
  dependencies: any[],
  componentName?: string
) => {
  const [result, setResult] = useState<T>();
  const [isCalculating, setIsCalculating] = useState(false);
  const calculationTime = useRef<number>(0);

  useEffect(() => {
    setIsCalculating(true);
    const startTime = performance.now();

    // Use requestIdleCallback if available, otherwise setTimeout
    const scheduleCalculation = (callback: () => void) => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(callback);
      } else {
        setTimeout(callback, 0);
      }
    };

    scheduleCalculation(() => {
      try {
        const newResult = calculation();
        const endTime = performance.now();
        calculationTime.current = endTime - startTime;

        if (process.env.NODE_ENV === 'development' && componentName) {
          if (calculationTime.current > 16) {
            console.warn(`🐌 Expensive calculation in ${componentName}: ${calculationTime.current.toFixed(2)}ms`);
          }
        }

        setResult(newResult);
      } catch (error) {
        console.error(`❌ Calculation error in ${componentName}:`, error);
      } finally {
        setIsCalculating(false);
      }
    });
  }, [calculation, componentName, dependencies]);

  return { result, isCalculating, calculationTime: calculationTime.current };
};

/**
 * Hook to track user interactions performance
 */
export const useInteractionTracking = (componentName: string) => {
  const interactions = useRef<Map<string, number>>(new Map());

  const trackInteraction = useCallback((interactionName: string) => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      interactions.current.set(interactionName, duration);
      
      if (process.env.NODE_ENV === 'development') {
        if (duration > 100) { // Interactions should be under 100ms
          console.warn(`🐌 Slow interaction in ${componentName}.${interactionName}: ${duration.toFixed(2)}ms`);
        }
      }
    };
  }, [componentName]);

  const getInteractionMetrics = useCallback(() => {
    return Array.from(interactions.current.entries()).map(([name, duration]) => ({
      name,
      duration,
      componentName
    }));
  }, [componentName]);

  return { trackInteraction, getInteractionMetrics };
};

/**
 * Hook to optimize re-renders
 */
export const useRenderOptimization = (componentName: string, props?: Record<string, any>) => {
  const renderCount = useRef(0);
  const lastProps = useRef(props);
  const [renderHistory, setRenderHistory] = useState<Array<{ count: number; timestamp: number; reason?: string }>>([]);

  useEffect(() => {
    renderCount.current += 1;
    
    let reason: string | undefined;
    if (props && lastProps.current) {
      const changedProps = Object.keys(props).filter(
        key => props[key] !== lastProps.current?.[key]
      );
      if (changedProps.length > 0) {
        reason = `Props changed: ${changedProps.join(', ')}`;
      }
    }

    setRenderHistory(prev => [
      ...prev.slice(-9), // Keep last 10 renders
      { count: renderCount.current, timestamp: Date.now(), reason }
    ]);

    if (process.env.NODE_ENV === 'development') {
      if (renderCount.current > 10) {
        console.warn(`🔄 High render count in ${componentName}: ${renderCount.current} renders`);
      }
    }

    lastProps.current = props;
  }, [props, componentName]);

  return { renderCount: renderCount.current, renderHistory };
};

/**
 * Utility function to get memory usage
 */
function getMemoryUsage(): number | undefined {
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    return memory.usedJSHeapSize / 1024 / 1024; // Convert to MB
  }
  return undefined;
}

/**
 * Performance monitoring context for global metrics
 */
export const PerformanceContext = {
  metrics: [] as PerformanceMetrics[],
  
  addMetric(metric: PerformanceMetrics) {
    this.metrics.push(metric);
    // Keep only last 100 metrics
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }
  },
  
  getSlowComponents(threshold = 16) {
    return this.metrics
      .filter(m => m.renderTime > threshold)
      .sort((a, b) => b.renderTime - a.renderTime);
  },
  
  getComponentStats(componentName: string) {
    const componentMetrics = this.metrics.filter(m => m.componentName === componentName);
    if (componentMetrics.length === 0) return null;
    
    const renderTimes = componentMetrics.map(m => m.renderTime);
    return {
      count: componentMetrics.length,
      avgRenderTime: renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length,
      maxRenderTime: Math.max(...renderTimes),
      minRenderTime: Math.min(...renderTimes)
    };
  },
  
  clear() {
    this.metrics = [];
  }
};
