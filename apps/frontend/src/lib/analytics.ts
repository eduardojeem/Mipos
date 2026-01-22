import { createClient } from './supabase';
import { isSupabaseActive } from './env';

// Helper to detect canceled/aborted requests (Axios/Fetch)
export function isCancelError(err: any): boolean {
  try {
    const name = err?.name;
    const code = err?.code;
    const message = (err?.message || '').toString();
    return (
      name === 'AbortError' ||
      name === 'CanceledError' ||
      code === 'ERR_CANCELED' ||
      message.includes('aborted') ||
      message.toLowerCase().includes('canceled')
    );
  } catch {
    return false;
  }
}

type ReportUsagePayload = {
  reportKey: string;
  filters?: Record<string, any> | null;
  rowsCount?: number | null;
  durationMs?: number | null;
  succeeded?: boolean;
};

type PerformancePhase = 'fetch' | 'render' | 'export' | 'aggregate' | 'other';

// Registra el uso de un reporte con metadatos básicos
export async function logReportUsage(payload: ReportUsagePayload): Promise<void> {
  const supabase = createClient();
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id ?? null;
    await supabase.from('report_usage_analytics').insert({
      user_id: userId,
      report_key: payload.reportKey,
      filters: payload.filters ?? null,
      rows_count: payload.rowsCount ?? null,
      duration_ms: payload.durationMs ?? null,
      succeeded: payload.succeeded ?? true,
    });
  } catch (err) {
    // No bloquear UX por errores de analítica
    console.warn('report_usage_analytics insert failed', err);
  }
}

// Mide y registra la métrica de rendimiento de una fase específica del reporte
export async function measureReportPerformance<T>(
  reportKey: string,
  phase: PerformancePhase,
  fn: () => Promise<T> | T,
  options?: { onCancel?: () => Promise<T> | T }
): Promise<T> {
  const supabase = createClient();
  const start = performance.now();
  try {
    const result = await fn();
    const duration = Math.round(performance.now() - start);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id ?? null;
      await supabase.from('report_performance_metrics').insert({
        user_id: userId,
        report_key: reportKey,
        phase,
        duration_ms: duration,
        succeeded: true,
      });
    } catch (err) {
      console.warn('report_performance_metrics insert failed', err);
    }
    return result;
  } catch (e) {
    const duration = Math.round(performance.now() - start);
    // Skip logging failed metric for canceled requests to avoid noise
    if (!isCancelError(e)) {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id ?? null;
        await supabase.from('report_performance_metrics').insert({
          user_id: userId,
          report_key: reportKey,
          phase,
          duration_ms: duration,
          succeeded: false,
        });
      } catch (err) {
        console.warn('report_performance_metrics insert failed', err);
      }
    }
    // If cancellation and an onCancel handler is provided, return neutral value
    if (isCancelError(e) && options?.onCancel) {
      return await options.onCancel();
    }
    throw e;
  }
}

// Registra explícitamente una métrica de rendimiento ya medida (por ejemplo, render)
export async function logPerformanceMetric(
  reportKey: string,
  phase: PerformancePhase,
  durationMs: number,
  succeeded: boolean = true
): Promise<void> {
  const supabase = createClient();
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id ?? null;
    await supabase.from('report_performance_metrics').insert({
      user_id: userId,
      report_key: reportKey,
      phase,
      duration_ms: Math.round(durationMs),
      succeeded,
    });
  } catch (err) {
    console.warn('logPerformanceMetric insert failed', err);
  }
}

// Ayudante para registrar uso completo de un reporte (descarga + conteo)
export async function trackReportUsage<T>(
  reportKey: string,
  perform: () => Promise<T>,
  opts?: { filters?: Record<string, any> }
): Promise<T> {
  const start = performance.now();
  try {
    const result = await perform();
    const duration = Math.round(performance.now() - start);
    const rowsCount = Array.isArray(result) ? result.length : null;
    await logReportUsage({
      reportKey,
      filters: opts?.filters ?? null,
      rowsCount,
      durationMs: duration,
      succeeded: true,
    });
    return result;
  } catch (e) {
    const duration = Math.round(performance.now() - start);
    // Do not log usage failure for cancellations
    if (!isCancelError(e)) {
      await logReportUsage({
        reportKey,
        filters: opts?.filters ?? null,
        rowsCount: null,
        durationMs: duration,
        succeeded: false,
      });
    }
    throw e;
  }
}

export type InteractionEvent = {
  component: string;
  name: string;
  durationMs: number;
  productId?: string | null;
  metadata?: Record<string, any> | null;
  timestamp: number;
};

export async function logInteractionEvent(event: InteractionEvent): Promise<void> {
  const supabase = createClient();
  const payload = {
    component_name: event.component,
    event_name: event.name,
    duration_ms: Math.round(event.durationMs),
    product_id: event.productId ?? null,
    metadata: event.metadata ?? null,
    created_at: new Date(event.timestamp).toISOString()
  } as any;
  try {
    if (isSupabaseActive()) {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id ?? null;
      await supabase.from('product_interaction_events').insert({
        user_id: userId,
        ...payload
      });
    } else if (typeof window !== 'undefined') {
      const raw = localStorage.getItem('interaction-events');
      const arr: InteractionEvent[] = raw ? JSON.parse(raw) : [];
      const next = [...arr.slice(-199), event];
      localStorage.setItem('interaction-events', JSON.stringify(next));
    }
  } catch (err) {
    console.warn('logInteractionEvent failed', err);
  }
}

export async function fetchInteractionEvents(limit: number = 50): Promise<InteractionEvent[]> {
  const supabase = createClient();
  try {
    if (isSupabaseActive()) {
      const { data } = await supabase
        .from('product_interaction_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      const mapped: InteractionEvent[] = (data || []).map((row: any) => ({
        component: String(row.component_name || ''),
        name: String(row.event_name || ''),
        durationMs: Number(row.duration_ms || 0),
        productId: row.product_id ? String(row.product_id) : null,
        metadata: row.metadata || null,
        timestamp: row.created_at ? new Date(row.created_at).getTime() : Date.now()
      }));
      return mapped;
    } else if (typeof window !== 'undefined') {
      const raw = localStorage.getItem('interaction-events');
      const arr: InteractionEvent[] = raw ? JSON.parse(raw) : [];
      return arr.slice(-limit).reverse();
    }
    return [];
  } catch (err) {
    console.warn('fetchInteractionEvents failed', err);
    return [];
  }
}