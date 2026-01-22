'use client';

import { useEffect, useRef, useCallback } from 'react';

type MetricEntry = {
  name: string;
  startTime: number;
  duration?: number;
};

export function usePerfMetrics(componentName?: string) {
  const metricsRef = useRef<Record<string, MetricEntry>>({});

  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

  const mark = useCallback((name: string) => {
    const t = now();
    metricsRef.current[name] = { name, startTime: t };
    try { performance.mark?.(name); } catch {}
    return t;
  }, []);

  const measureAndLog = useCallback((measureName: string, startMark: string, endMark?: string) => {
    const end = now();
    if (endMark) {
      try { performance.mark?.(endMark); } catch {}
    }
    const start = metricsRef.current[startMark]?.startTime ?? now();
    const duration = Math.max(0, end - start);
    metricsRef.current[measureName] = { name: measureName, startTime: start, duration };
    // Report simple console metric for before/after comparisons
    // eslint-disable-next-line no-console
    console.log(`[Perf] ${measureName}: ${Math.round(duration)}ms`);
    try { performance.measure?.(measureName, startMark, endMark); } catch {}
    return duration;
  }, []);

  const trackMount = useCallback(() => {
    const base = componentName || 'Component';
    const startId = `${base}-mount-start`;
    mark(startId);
    // First paint approximation
    requestAnimationFrame(() => {
      measureAndLog(`${base}-first-paint`, startId);
    });
  }, [componentName, mark, measureAndLog]);

  useEffect(() => {
    if (componentName) {
      trackMount();
    }
  }, [componentName, trackMount]);

  return { mark, measureAndLog, trackMount, metricsRef };
}
