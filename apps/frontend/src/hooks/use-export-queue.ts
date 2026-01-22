import { useEffect, useRef, useState } from 'react';

export type ExportFormat = 'pdf' | 'excel' | 'csv' | 'json';
export type ReportType = 'sales' | 'inventory' | 'customers' | 'financial' | 'compare';

export interface ReportFilter {
  startDate?: string;
  endDate?: string;
  productId?: string;
  categoryId?: string;
  customerId?: string;
  supplierId?: string;
  userId?: string;
  status?: string;
}

export interface ExportJob {
  id: string;
  type: ReportType;
  format: ExportFormat;
  filters: ReportFilter;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
  result?: {
    filename: string;
    contentType: string;
    size: number;
  };
}

export function enqueueExport(
  type: ReportType,
  format: ExportFormat,
  filters: ReportFilter,
  options?: { priority?: 'low' | 'normal' | 'high'; columns?: string[] }
) {
  return fetch('/api/reports/export/enqueue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, format, filters, priority: options?.priority, columns: options?.columns }),
  }).then(async (res) => {
    if (!res.ok) throw new Error('No se pudo encolar la exportación');
    const data = await res.json();
    return data.jobId as string;
  });
}

export function useExportJob(jobId?: string) {
  const [job, setJob] = useState<ExportJob | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const delayIndexRef = useRef<number>(0); // 0:1s, 1:2s, 2:5s
  const pausedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!jobId) return;
    setLoading(true);
    setError(null);
    delayIndexRef.current = 0;

    const delays = [1000, 2000, 5000];

    const clearTimeoutSafe = () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    const scheduleNext = () => {
      clearTimeoutSafe();
      const delay = delays[delayIndexRef.current] ?? delays[delays.length - 1];
      timeoutRef.current = window.setTimeout(poll, delay);
    };

    const poll = async () => {
      if (pausedRef.current) return; // paused due to tab blur
      try {
        const res = await fetch(`/api/reports/export/status/${jobId}`);
        if (!res.ok) throw new Error('Error consultando estado de exportación');
        const data = await res.json();
        setJob(data.job as ExportJob);
        setLoading(false);
        // Stop polling on terminal states
        if (data.job.status === 'completed' || data.job.status === 'failed' || data.job.status === 'cancelled') {
          clearTimeoutSafe();
          return;
        }
        // Increase backoff progressively until max
        if (delayIndexRef.current < delays.length - 1) {
          delayIndexRef.current += 1;
        }
        scheduleNext();
      } catch (err: any) {
        setError(err?.message || 'Error desconocido');
        setLoading(false);
        // On error, keep current delay and try again later
        scheduleNext();
      }
    };

    // Visibility handling: pause when tab hidden, resume when visible
    const onVisibilityChange = () => {
      const hidden = document.visibilityState === 'hidden';
      pausedRef.current = hidden;
      if (!hidden) {
        // Resume immediately with current backoff
        scheduleNext();
      } else {
        clearTimeoutSafe();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Initial poll and schedule next
    poll();
    scheduleNext();

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      clearTimeoutSafe();
    };
  }, [jobId]);

  const downloadUrl = jobId ? `/api/reports/export/download/${jobId}` : null;

  return { job, loading, error, downloadUrl };
}

export interface ExportJobsResponse {
  success: boolean;
  jobs: ExportJob[];
}

export function useExportJobs(limit: number = 20) {
  const [jobs, setJobs] = useState<ExportJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const delayIndexRef = useRef<number>(0);

  useEffect(() => {
    const delays = [2000, 4000, 8000, 15000];

    const clearTimer = () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const scheduleNext = () => {
      clearTimer();
      const delay = delays[delayIndexRef.current] ?? delays[delays.length - 1];
      timerRef.current = window.setTimeout(poll, delay);
    };

    const poll = async () => {
      try {
        const res = await fetch(`/api/reports/export/jobs?limit=${encodeURIComponent(String(limit))}`);
        if (!res.ok) throw new Error('Error obteniendo historial de exportaciones');
        const data: ExportJobsResponse = await res.json();
        setJobs((data as any).jobs || []);
        setLoading(false);
        // Increase backoff progressively until max
        if (delayIndexRef.current < delays.length - 1) {
          delayIndexRef.current += 1;
        }
        scheduleNext();
      } catch (err: any) {
        setError(err?.message || 'Error desconocido');
        setLoading(false);
        scheduleNext();
      }
    };

    setLoading(true);
    delayIndexRef.current = 0;
    poll();
    scheduleNext();

    return () => {
      clearTimer();
    };
  }, [limit]);

  const refresh = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/reports/export/jobs?limit=${encodeURIComponent(String(limit))}`);
      if (!res.ok) throw new Error('Error obteniendo historial de exportaciones');
      const data: ExportJobsResponse = await res.json();
      setJobs((data as any).jobs || []);
      setLoading(false);
    } catch (err: any) {
      setError(err?.message || 'Error desconocido');
      setLoading(false);
    }
  };

  return { jobs, loading, error, refresh };
}