'use client';

interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  timestamp: number;
  category: 'load' | 'render' | 'interaction' | 'network' | 'memory';
  metadata?: Record<string, any>;
}

interface PerformanceReport {
  metrics: PerformanceMetric[];
  summary: {
    averageLoadTime: number;
    averageRenderTime: number;
    totalInteractions: number;
    networkRequests: number;
    memoryUsage: number;
    errorRate: number;
  };
  recommendations: string[];
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private observers: PerformanceObserver[] = [];
  private startTimes: Map<string, number> = new Map();

  private constructor() {
    this.initializeObservers();
  }

  static getInstance(): PerformanceMonitor {
    if (!this.instance) {
      this.instance = new PerformanceMonitor();
    }
    return this.instance;
  }

  private initializeObservers() {
    if (typeof window === 'undefined') return;

    try {
      // Navigation timing observer
      const navObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.addMetric({
              name: 'page_load_time',
              value: navEntry.loadEventEnd - navEntry.startTime,
              category: 'load',
              metadata: {
                domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.startTime,
                firstPaint: navEntry.loadEventStart - navEntry.startTime
              }
            });
          }
        }
      });
      navObserver.observe({ entryTypes: ['navigation'] });
      this.observers.push(navObserver);

      // Resource timing observer
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming;
            this.addMetric({
              name: 'resource_load_time',
              value: resourceEntry.responseEnd - resourceEntry.requestStart,
              category: 'network',
              metadata: {
                name: resourceEntry.name,
                size: resourceEntry.transferSize,
                type: resourceEntry.initiatorType
              }
            });
          }
        }
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.push(resourceObserver);

      // Largest Contentful Paint observer
      const lcpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.addMetric({
            name: 'largest_contentful_paint',
            value: entry.startTime,
            category: 'render',
            metadata: {
              element: (entry as any).element?.tagName
            }
          });
        }
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(lcpObserver);

      // First Input Delay observer
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.addMetric({
            name: 'first_input_delay',
            value: (entry as any).processingStart - entry.startTime,
            category: 'interaction',
            metadata: {
              eventType: (entry as any).name
            }
          });
        }
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.push(fidObserver);

    } catch (error) {
      console.warn('Performance observers not supported:', error);
    }
  }

  // Start timing a custom operation
  startTiming(operationName: string): void {
    this.startTimes.set(operationName, performance.now());
  }

  // End timing and record metric
  endTiming(operationName: string, category: PerformanceMetric['category'] = 'interaction', metadata?: Record<string, any>): void {
    const startTime = this.startTimes.get(operationName);
    if (startTime) {
      const duration = performance.now() - startTime;
      this.addMetric({
        name: operationName,
        value: duration,
        category,
        metadata
      });
      this.startTimes.delete(operationName);
    }
  }

  // Add a custom metric
  addMetric(metric: Omit<PerformanceMetric, 'id' | 'timestamp'>): void {
    const fullMetric: PerformanceMetric = {
      ...metric,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };

    this.metrics.push(fullMetric);

    // Keep only last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    // Store in localStorage for persistence
    this.persistMetrics();
  }

  // Get memory usage
  getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize / 1024 / 1024; // MB
    }
    return 0;
  }

  // Record component render time
  recordComponentRender(componentName: string, renderTime: number): void {
    this.addMetric({
      name: `${componentName}_render`,
      value: renderTime,
      category: 'render',
      metadata: { component: componentName }
    });
  }

  // Record API call performance
  recordApiCall(endpoint: string, duration: number, success: boolean): void {
    this.addMetric({
      name: 'api_call',
      value: duration,
      category: 'network',
      metadata: {
        endpoint,
        success,
        status: success ? 'success' : 'error'
      }
    });
  }

  // Record user interaction
  recordInteraction(action: string, duration?: number): void {
    this.addMetric({
      name: 'user_interaction',
      value: duration || 0,
      category: 'interaction',
      metadata: { action }
    });
  }

  // Get performance report
  getReport(): PerformanceReport {
    const now = Date.now();
    const last24Hours = this.metrics.filter(m => now - m.timestamp < 24 * 60 * 60 * 1000);

    const loadMetrics = last24Hours.filter(m => m.category === 'load');
    const renderMetrics = last24Hours.filter(m => m.category === 'render');
    const interactionMetrics = last24Hours.filter(m => m.category === 'interaction');
    const networkMetrics = last24Hours.filter(m => m.category === 'network');
    const errorMetrics = last24Hours.filter(m => m.metadata?.success === false);

    const averageLoadTime = loadMetrics.length > 0 
      ? loadMetrics.reduce((sum, m) => sum + m.value, 0) / loadMetrics.length 
      : 0;

    const averageRenderTime = renderMetrics.length > 0
      ? renderMetrics.reduce((sum, m) => sum + m.value, 0) / renderMetrics.length
      : 0;

    const errorRate = networkMetrics.length > 0
      ? (errorMetrics.length / networkMetrics.length) * 100
      : 0;

    const recommendations = this.generateRecommendations({
      averageLoadTime,
      averageRenderTime,
      errorRate,
      memoryUsage: this.getMemoryUsage()
    });

    return {
      metrics: last24Hours,
      summary: {
        averageLoadTime,
        averageRenderTime,
        totalInteractions: interactionMetrics.length,
        networkRequests: networkMetrics.length,
        memoryUsage: this.getMemoryUsage(),
        errorRate
      },
      recommendations
    };
  }

  private generateRecommendations(summary: any): string[] {
    const recommendations: string[] = [];

    if (summary.averageLoadTime > 3000) {
      recommendations.push('Tiempo de carga alto (>3s). Considera optimizar imágenes y código.');
    }

    if (summary.averageRenderTime > 100) {
      recommendations.push('Tiempo de renderizado alto (>100ms). Revisa componentes pesados.');
    }

    if (summary.errorRate > 5) {
      recommendations.push('Alta tasa de errores (>5%). Revisa conexiones de red.');
    }

    if (summary.memoryUsage > 100) {
      recommendations.push('Alto uso de memoria (>100MB). Revisa memory leaks.');
    }

    if (recommendations.length === 0) {
      recommendations.push('Rendimiento óptimo. ¡Buen trabajo!');
    }

    return recommendations;
  }

  // Persist metrics to localStorage
  private persistMetrics(): void {
    try {
      const recentMetrics = this.metrics.slice(-100); // Keep last 100
      localStorage.setItem('performance-metrics', JSON.stringify(recentMetrics));
    } catch (error) {
      console.warn('Failed to persist performance metrics:', error);
    }
  }

  // Load metrics from localStorage
  loadPersistedMetrics(): void {
    try {
      const stored = localStorage.getItem('performance-metrics');
      if (stored) {
        const metrics = JSON.parse(stored);
        this.metrics = [...this.metrics, ...metrics];
      }
    } catch (error) {
      console.warn('Failed to load persisted metrics:', error);
    }
  }

  // Clear all metrics
  clearMetrics(): void {
    this.metrics = [];
    localStorage.removeItem('performance-metrics');
  }

  // Cleanup observers
  destroy(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.startTimes.clear();
  }
}

export default PerformanceMonitor;
