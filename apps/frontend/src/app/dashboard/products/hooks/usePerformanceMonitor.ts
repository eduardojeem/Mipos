'use client';

import React, { useEffect, useCallback, useRef } from 'react';
import PerformanceMonitor from '../services/PerformanceMonitor';

export function usePerformanceMonitor() {
  const monitor = useRef<PerformanceMonitor | null>(null);

  useEffect(() => {
    monitor.current = PerformanceMonitor.getInstance();
    monitor.current.loadPersistedMetrics();

    return () => {
      // Don't destroy on unmount as it's a singleton
    };
  }, []);

  const startTiming = useCallback((operationName: string) => {
    monitor.current?.startTiming(operationName);
  }, []);

  const endTiming = useCallback((operationName: string, category?: any, metadata?: Record<string, any>) => {
    monitor.current?.endTiming(operationName, category, metadata);
  }, []);

  const recordComponentRender = useCallback((componentName: string, renderTime: number) => {
    monitor.current?.recordComponentRender(componentName, renderTime);
  }, []);

  const recordApiCall = useCallback((endpoint: string, duration: number, success: boolean) => {
    monitor.current?.recordApiCall(endpoint, duration, success);
  }, []);

  const recordInteraction = useCallback((action: string, duration?: number) => {
    monitor.current?.recordInteraction(action, duration);
  }, []);

  const getReport = useCallback(() => {
    return monitor.current?.getReport();
  }, []);

  const clearMetrics = useCallback(() => {
    monitor.current?.clearMetrics();
  }, []);

  return {
    startTiming,
    endTiming,
    recordComponentRender,
    recordApiCall,
    recordInteraction,
    getReport,
    clearMetrics
  };
}

// HOC for automatic component performance monitoring
export function withPerformanceMonitoring<T extends Record<string, any>>(
  WrappedComponent: React.ComponentType<T>,
  componentName: string
) {
  const PerformanceMonitoredComponent: React.FC<T> = (props) => {
    const { recordComponentRender } = usePerformanceMonitor();
    const renderStartTime = useRef<number>(0);

    React.useEffect(() => {
      renderStartTime.current = performance.now();
    });

    React.useEffect(() => {
      if (renderStartTime.current > 0) {
        const renderTime = performance.now() - renderStartTime.current;
        recordComponentRender(componentName, renderTime);
      }
    });

    return React.createElement(WrappedComponent, props);
  };

  PerformanceMonitoredComponent.displayName = `withPerformanceMonitoring(${componentName})`;
  return PerformanceMonitoredComponent;
}