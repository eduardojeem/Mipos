import { createClient } from '@/lib/supabase';
import { isSupabaseActive } from '@/lib/env';
import type { SyncStatus } from './sync-coordinator';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface SyncLogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: any;
  durationMs?: number;
}

export interface SyncMetrics {
  realtimeEvents: number;
  pollingEvents: number;
  errors: number;
  lastErrorAt?: number;
  avgLatencyByOp: Record<string, number>;
  opSamplesByOp: Record<string, number>;
  throughputPerMin: number;
  lastSyncTime?: number;
  syncMethod?: 'realtime' | 'polling' | 'offline';
  isRealtimeActive?: boolean;
  isPollingActive?: boolean;
}

// Reglas de alerta basadas en métricas de sincronización
export interface AlertRule {
  id: string;
  condition: (metrics: SyncMetrics) => boolean;
  message: string;
  severity: 'info' | 'warning' | 'error';
  cooldown?: number; // Tiempo mínimo entre alertas del mismo tipo (ms)
  lastTriggered?: number;
}

export interface AlertEvent {
  id: string;
  condition: (metrics: SyncMetrics) => boolean;
  message: string;
  severity: 'info' | 'warning' | 'error';
  timestamp: number;
  metricsSnapshot: SyncMetrics;
  cooldown?: number;
}

interface TimerInfo {
  name: string;
  start: number;
  context?: Record<string, any>;
}

/**
 * Servicio de logging y métricas de sincronización
 * - Mantiene logs recientes en memoria
 * - Calcula métricas en tiempo real (latencia, throughput, errores)
 * - Opcionalmente persiste logs en Supabase si está habilitado
 */
class SyncLoggingService {
  private logs: SyncLogEntry[] = [];
  private metrics: SyncMetrics = {
    realtimeEvents: 0,
    pollingEvents: 0,
    errors: 0,
    avgLatencyByOp: {},
    opSamplesByOp: {},
    throughputPerMin: 0,
  };
  private timers = new Map<string, TimerInfo>();
  private subscribers = new Set<(metrics: SyncMetrics) => void>();
  private coordinatorStatus?: SyncStatus;
  private supabasePersistenceEnabled: boolean;
  private supabase = createClient();

  constructor() {
    this.supabasePersistenceEnabled = !!process.env.NEXT_PUBLIC_ENABLE_SYNC_LOG_PERSISTENCE && isSupabaseActive();

    // Recalcular throughput cada 5s
    if (typeof window !== 'undefined') {
      setInterval(() => this.recalculateThroughput(), 5000);
    }
  }

  subscribe(listener: (metrics: SyncMetrics) => void): () => void {
    this.subscribers.add(listener);
    // Emitir estado inicial
    listener(this.getMetrics());
    return () => this.subscribers.delete(listener);
  }

  private notify() {
    const snapshot = this.getMetrics();
    this.subscribers.forEach(fn => {
      try { fn(snapshot); } catch (e) { /* noop */ }
    });
  }

  setCoordinatorStatus(status: SyncStatus) {
    this.coordinatorStatus = status;
    this.metrics.lastSyncTime = status.lastSyncTime;
    this.metrics.syncMethod = status.syncMethod;
    this.metrics.isRealtimeActive = status.isRealtimeActive;
    this.metrics.isPollingActive = status.isPollingActive;
    this.notify();
  }

  log(level: LogLevel, message: string, context?: Record<string, any>, error?: any) {
    const entry: SyncLogEntry = {
      timestamp: Date.now(),
      level,
      message,
      context,
      error
    };
    this.pushLog(entry);

    if (level === 'error') {
      this.metrics.errors += 1;
      this.metrics.lastErrorAt = entry.timestamp;
    }

    this.notify();
    this.persist(entry).catch(() => {/* ignore */});
  }

  recordRealtimeChange(entity: string, eventType: string) {
    this.metrics.realtimeEvents += 1;
    this.log('info', 'Realtime change', { entity, eventType });
  }

  recordPollingChange(entity: string) {
    this.metrics.pollingEvents += 1;
    this.log('info', 'Polling change', { entity });
  }

  startTimer(name: string, context?: Record<string, any>): string {
    const id = `${name}-${Math.random().toString(36).slice(2)}`;
    this.timers.set(id, { name, start: Date.now(), context });
    return id;
  }

  endTimer(id: string, extra?: Record<string, any>) {
    const t = this.timers.get(id);
    if (!t) return;
    this.timers.delete(id);
    const durationMs = Date.now() - t.start;
    const name = t.name;

    // Actualizar promedio
    const prevAvg = this.metrics.avgLatencyByOp[name] || 0;
    const prevSamples = this.metrics.opSamplesByOp[name] || 0;
    const newAvg = ((prevAvg * prevSamples) + durationMs) / (prevSamples + 1);
    this.metrics.avgLatencyByOp[name] = newAvg;
    this.metrics.opSamplesByOp[name] = prevSamples + 1;

    this.pushLog({
      timestamp: Date.now(),
      level: 'debug',
      message: `Op ${name} completed in ${durationMs}ms`,
      context: { ...t.context, ...extra },
      durationMs
    });

    this.notify();
  }

  getLogs(limit = 200): SyncLogEntry[] {
    return this.logs.slice(-limit);
  }

  getMetrics(): SyncMetrics {
    return { ...this.metrics };
  }

  private pushLog(entry: SyncLogEntry) {
    this.logs.push(entry);
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000);
    }
  }

  private recalculateThroughput() {
    const now = Date.now();
    const minuteAgo = now - 60_000;
    const lastMin = this.logs.filter(l => l.timestamp >= minuteAgo);
    this.metrics.throughputPerMin = lastMin.length;
    this.notify();
  }

  private async persist(entry: SyncLogEntry) {
    if (!this.supabasePersistenceEnabled) return;
    try {
      const { error } = await this.supabase
        .from('sync_logs')
        .insert({
          timestamp: new Date(entry.timestamp).toISOString(),
          level: entry.level,
          message: entry.message,
          context: entry.context || null,
          error: entry.error ? JSON.stringify(entry.error) : null,
          duration_ms: entry.durationMs ?? null
        });
      if (error) {
        // Si la tabla no existe o falla RLS, sólo log local
        // Evitar ruido excesivo
        return;
      }
    } catch {
      // Ignorar errores de persistencia
    }
  }

  error(message: string, context?: Record<string, any>, error?: any) {
    this.log('error', message, context, error);
  }

  info(message: string, context?: Record<string, any>) {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, any>) {
    this.log('warn', message, context);
  }

  recordMetric(key: string, value: number) {
    this.log('debug', 'metric recorded', { key, value });
  }
}

export const syncLogger = new SyncLoggingService();

// Servicio extendido con soporte de alertas
export class AlertingSyncLogger extends SyncLoggingService {
  private rules: AlertRule[] = [];
  private alertHistory: AlertEvent[] = [];

  addAlertRule(rule: AlertRule): void {
    if (!rule.id) throw new Error('Alert rule must have an ID');
    this.rules.push({ ...rule, lastTriggered: 0 });
  }

  removeAlertRule(ruleId: string): void {
    this.rules = this.rules.filter(r => r.id !== ruleId);
  }

  checkAlerts(): AlertEvent[] {
    const metrics = this.getMetrics();
    const now = Date.now();

    const alerts = this.rules
      .filter(rule => {
        const shouldTrigger = rule.condition(metrics);
        const isOnCooldown = rule.cooldown && (now - (rule.lastTriggered || 0) < rule.cooldown);
        return shouldTrigger && !isOnCooldown;
      })
      .map(rule => {
        rule.lastTriggered = now;
        return {
          ...rule,
          timestamp: now,
          metricsSnapshot: { ...metrics }
        } as AlertEvent;
      });

    alerts.forEach(alert => {
      const level: LogLevel = alert.severity === 'warning' ? 'warn' : (alert.severity as LogLevel);
      this.log(level, alert.message);
      this.alertHistory.push(alert);
    });

    return alerts;
  }

  getAlertHistory(): AlertEvent[] {
    return [...this.alertHistory];
  }

  /**
   * Evalúa reglas actuales contra las métricas y genera alertas.
   * Las alertas se registran usando el nivel correspondiente.
   */
  checkAlertsLegacy() {
    return this.checkAlertsAgainst(this.getMetrics());
  }

  /**
   * Evalúa reglas con métricas externas y registra alertas en el logger principal.
   */
  checkAlertsAgainst(metrics: SyncMetrics) {
    const alerts = this.rules
      .filter(rule => {
        try { return rule.condition(metrics); } catch { return false; }
      })
      .map(rule => ({ ...rule, timestamp: Date.now() }));

    alerts.forEach(alert => {
      const level: LogLevel = alert.severity === 'warning' ? 'warn' : (alert.severity as LogLevel);
      // Registrar en el logger principal para visibilidad unificada
      syncLogger.log(level, alert.message, { alert: true, timestamp: alert.timestamp });
    });
    return alerts;
  }
}

export const alertingSyncLogger = new AlertingSyncLogger();

// Conexión automática: evaluar alertas cuando cambian métricas del logger principal
try {
  if (typeof window !== 'undefined') {
    syncLogger.subscribe((metrics) => {
      try { alertingSyncLogger.checkAlertsAgainst(metrics); } catch { /* noop */ }
    });
  }
} catch { /* noop */ }