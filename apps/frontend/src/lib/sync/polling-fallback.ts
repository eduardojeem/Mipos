/**
 * Polling Fallback System
 * Automatically switches to polling when real-time connections fail
 */

import React from 'react';
import { supabaseRealtimeService } from '@/lib/supabase-realtime';
import { api } from '@/lib/api';
import { createClient } from '@/lib/supabase';
import type { NetworkQuality } from './connection-monitor';

export interface PollingConfig {
  /** Base polling interval in milliseconds */
  baseInterval: number;
  /** Maximum polling interval in milliseconds */
  maxInterval: number;
  /** Backoff multiplier when errors occur */
  backoffMultiplier: number;
  /** Maximum number of consecutive errors before stopping */
  maxErrors: number;
  /** Entities to poll */
  entities: string[];
  /** Custom polling functions for specific entities */
  customPollers?: Record<string, () => Promise<any>>;
  /** Enable delta sync (only changes since last poll) */
  enableDeltaSync?: boolean;
  /** Use Supabase direct queries for delta sync */
  useSupabaseDirect?: boolean;
  /** Minimal fields per entity to reduce payload */
  entityFields?: Record<string, string[]>;
  /** Optional filters per entity (e.g., store_id, user-based) */
  entityFilters?: Record<string, Record<string, string | number>>;
}

export interface PollingState {
  isActive: boolean;
  currentInterval: number;
  consecutiveErrors: number;
  lastPollTime: number;
  lastSuccessTime: number;
  errorMessage?: string;
  pollingEntities: string[];
}

export interface PollingMetrics {
  totalPolls: number;
  successfulPolls: number;
  failedPolls: number;
  averageResponseTime: number;
  lastResponseTime: number;
}

export class PollingFallbackService {
  private config: PollingConfig;
  private state: PollingState;
  private metrics: PollingMetrics;
  private pollingTimer?: NodeJS.Timeout;
  private listeners: Set<(state: PollingState) => void> = new Set();
  private entityCache: Map<string, any> = new Map();
  private lastDataHashes: Map<string, string> = new Map();
  private entityLastSync: Map<string, number> = new Map();
  private supabase = createClient();
  private lastQuality?: NetworkQuality;

  constructor(config: Partial<PollingConfig> = {}) {
    this.config = {
      baseInterval: 5000, // 5 seconds
      maxInterval: 60000, // 1 minute
      backoffMultiplier: 1.5,
      maxErrors: 5,
      entities: ['products', 'categories', 'customers', 'sales', 'inventory_movements'],
      ...config
    };

    this.state = {
      isActive: false,
      currentInterval: this.config.baseInterval,
      consecutiveErrors: 0,
      lastPollTime: 0,
      lastSuccessTime: 0,
      pollingEntities: []
    };

    this.metrics = {
      totalPolls: 0,
      successfulPolls: 0,
      failedPolls: 0,
      averageResponseTime: 0,
      lastResponseTime: 0
    };

    this.setupRealtimeMonitoring();
  }

  /**
   * Actualiza intervalos de polling según calidad de red (idempotente, sin reinicios en cascada)
   */
  setNetworkQuality(quality: NetworkQuality) {
    // Mapear a nuevos intervalos
    let newBase = this.config.baseInterval;
    let newMax = this.config.maxInterval;
    switch (quality) {
      case 'excellent':
        newBase = 3000; newMax = 15000; break;
      case 'good':
        newBase = 5000; newMax = 20000; break;
      case 'fair':
        newBase = 8000; newMax = 30000; break;
      case 'poor':
        newBase = 12000; newMax = 45000; break;
      case 'offline':
      default:
        newBase = 15000; newMax = 60000; break;
    }

    // Si no hay cambios efectivos, no hacer nada
    const baseChanged = newBase !== this.config.baseInterval;
    const maxChanged = newMax !== this.config.maxInterval;
    this.lastQuality = quality;
    if (!baseChanged && !maxChanged) return;

    // Actualizar config
    this.config.baseInterval = newBase;
    this.config.maxInterval = newMax;

    // Si está activo, ajustar el siguiente ciclo sin parar/arrancar
    if (this.state.isActive) {
      // Adaptar el intervalo actual hacia el nuevo base sin exceder el max
      const ratio = this.state.currentInterval / (this.state.currentInterval || 1);
      this.state.currentInterval = Math.min(newBase * Math.max(1, ratio), newMax);
      if (this.pollingTimer) {
        clearTimeout(this.pollingTimer);
        this.scheduleNextPoll();
      }
      this.notifyListeners();
    }
  }

  /**
   * Configurar prioridades por entidad (mayor número = mayor prioridad)
   */
  public setEntityPriorities(priorities: Record<string, number>): void {
    if (!this.state.pollingEntities.length) return;
    const sorted = [...this.state.pollingEntities].sort((a, b) =>
      (priorities[b] ?? 0) - (priorities[a] ?? 0)
    );
    this.state.pollingEntities = sorted;
    // Reprogramar próximo poll con el nuevo orden si activo
    if (this.state.isActive && this.pollingTimer) {
      clearTimeout(this.pollingTimer);
      this.scheduleNextPoll();
      this.notifyListeners();
    }
  }

  /**
   * Start polling fallback
   */
  public start(entities?: string[]): void {
    if (this.state.isActive) {
      return;
    }

    this.state.isActive = true;
    this.state.pollingEntities = entities || this.config.entities;
    this.state.consecutiveErrors = 0;
    this.state.currentInterval = this.config.baseInterval;
    this.state.errorMessage = undefined;
    // Reset per-entity last sync markers
    this.entityLastSync.clear();

    console.log('[PollingFallback] Starting polling for entities:', this.state.pollingEntities);
    this.scheduleNextPoll();
    this.notifyListeners();
  }

  /**
   * Stop polling fallback
   */
  public stop(): void {
    if (!this.state.isActive) {
      return;
    }

    this.state.isActive = false;
    this.state.pollingEntities = [];

    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer);
      this.pollingTimer = undefined;
    }

    console.log('[PollingFallback] Stopped polling');
    this.notifyListeners();
  }

  /**
   * Get current polling state
   */
  public getState(): PollingState {
    return { ...this.state };
  }

  /**
   * Get polling metrics
   */
  public getMetrics(): PollingMetrics {
    return { ...this.metrics };
  }

  /**
   * Subscribe to state changes
   */
  public subscribe(listener: (state: PollingState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Force a poll cycle
   */
  public async forcePoll(): Promise<void> {
    if (!this.state.isActive) {
      return;
    }

    await this.performPoll();
  }

  /**
   * Setup real-time connection monitoring
   * 🔴 DISABLED: Polling fallback not needed with Supabase Realtime
   * API endpoints don't exist, causing 404 errors
   */
  private setupRealtimeMonitoring(): void {
    // Monitor real-time connection status (logging only)
    const checkRealtimeStatus = () => {
      const isRealtimeConnected = supabaseRealtimeService.isConnected();

      // ❌ DISABLED: Auto-start polling causes 404 errors
      // The app uses Supabase Realtime directly, polling is not needed
      if (!isRealtimeConnected && !this.state.isActive) {
        console.warn('[PollingFallback] Real-time disconnected (polling fallback disabled - using Supabase Realtime only)');
        // this.start(); // Disabled to prevent 404 errors on non-existent API endpoints
      } else if (isRealtimeConnected && this.state.isActive) {
        console.log('[PollingFallback] Real-time reconnected, stopping polling fallback');
        this.stop();
      }
    };

    // Check every 10 seconds
    setInterval(checkRealtimeStatus, 10000);

    // Initial check
    setTimeout(checkRealtimeStatus, 1000);
  }

  /**
   * Schedule the next poll
   */
  private scheduleNextPoll(): void {
    if (!this.state.isActive) {
      return;
    }

    this.pollingTimer = setTimeout(() => {
      this.performPoll();
    }, this.state.currentInterval);
  }

  /**
   * Perform a polling cycle
   */
  private async performPoll(): Promise<void> {
    if (!this.state.isActive) {
      return;
    }

    const startTime = Date.now();
    this.state.lastPollTime = startTime;
    this.metrics.totalPolls++;

    try {
      const results = await Promise.allSettled(
        this.state.pollingEntities.map(entity => this.pollEntity(entity))
      );

      let hasErrors = false;
      let errorMessage = '';

      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          hasErrors = true;
          errorMessage = result.reason?.message || 'Unknown error';
          console.error(`[PollingFallback] Error polling ${this.state.pollingEntities[index]}:`, result.reason);
        }
      });

      const responseTime = Date.now() - startTime;
      this.metrics.lastResponseTime = responseTime;
      this.updateAverageResponseTime(responseTime);

      if (hasErrors) {
        this.handlePollError(errorMessage);
      } else {
        this.handlePollSuccess();
      }

    } catch (error) {
      console.error('[PollingFallback] Poll cycle error:', error);
      this.handlePollError(error instanceof Error ? error.message : 'Unknown error');
    }

    // Schedule next poll
    this.scheduleNextPoll();
  }

  /**
   * Poll a specific entity
   */
  private async pollEntity(entity: string): Promise<any> {
    // Use custom poller if available
    if (this.config.customPollers?.[entity]) {
      return await this.config.customPollers[entity]();
    }

    // When delta sync is enabled, prefer Supabase direct queries to fetch only changes
    if (this.config.enableDeltaSync) {
      const tableMap: Record<string, string> = {
        products: 'products',
        categories: 'categories',
        customers: 'customers',
        sales: 'sales',
        inventory_movements: 'inventory_movements'
      };
      const table = tableMap[entity];
      if (!table) throw new Error(`Unknown entity: ${entity}`);

      const lastTs = this.entityLastSync.get(entity) || 0;
      const fields = this.config.entityFields?.[entity]?.join(',') || '*';
      let query = this.supabase.from(table).select(fields, { count: 'exact' });

      // Apply delta filter by updated_at
      if (lastTs > 0) {
        const sinceIso = new Date(lastTs).toISOString();
        query = query.gt('updated_at', sinceIso);
      }

      // Apply optional entity filters (role/user based)
      const filters = this.config.entityFilters?.[entity];
      if (filters) {
        Object.entries(filters).forEach(([col, val]) => {
          query = query.eq(col, val as any);
        });
      }

      const { data, error } = await query;
      if (error) {
        throw error;
      }

      // If there are changes, emit them; otherwise return cached
      if (Array.isArray(data) && data.length > 0) {
        // Update last sync timestamp to max updated_at found
        try {
          const maxUpdated = data
            .map((row: any) => new Date(row.updated_at || Date.now()).getTime())
            .reduce((a: number, b: number) => Math.max(a, b), lastTs);
          if (maxUpdated) this.entityLastSync.set(entity, maxUpdated);
        } catch { }
        this.emitEntityChange(entity, data);
      }

      this.entityCache.set(entity, data || []);
      // Maintain simple hash for metrics/change detection
      const dataHash = this.hashData(data || []);
      this.lastDataHashes.set(entity, dataHash);

      return data || [];
    }

    // Default polling via API (full dataset), optionally with minimal fields
    let endpoint = '';
    switch (entity) {
      case 'products':
        endpoint = '/api/products';
        break;
      case 'categories':
        endpoint = '/api/categories';
        break;
      case 'customers':
        endpoint = '/api/customers';
        break;
      case 'sales':
        endpoint = '/api/sales';
        break;
      case 'inventory_movements':
        endpoint = '/api/inventory/movements';
        break;
      default:
        throw new Error(`Unknown entity: ${entity}`);
    }

    // Attach optional query params for fields and delta (align with backend: since)
    const params: Record<string, string> = {};
    const lastTs = this.entityLastSync.get(entity) || 0;
    if (lastTs > 0) params['since'] = new Date(lastTs).toISOString();
    const fields = this.config.entityFields?.[entity];
    if (fields?.length) params['fields'] = fields.join(',');
    const queryString = Object.keys(params).length
      ? `?${new URLSearchParams(params).toString()}`
      : '';

    const response = await api.get(`${endpoint}${queryString}`);
    const body = response.data;
    const data = body?.products ?? body?.data ?? body;

    // Check if data has changed
    const dataHash = this.hashData(data);
    const lastHash = this.lastDataHashes.get(entity);

    if (lastHash && lastHash !== dataHash) {
      // Data has changed, emit change event
      this.emitEntityChange(entity, data);
    }

    this.lastDataHashes.set(entity, dataHash);
    this.entityCache.set(entity, data);
    // Update last sync using backend-provided watermark when available
    const nextSince = body?.sync?.nextSince;
    if (nextSince) {
      try {
        const ts = new Date(nextSince).getTime();
        if (!Number.isNaN(ts)) this.entityLastSync.set(entity, ts);
        else this.entityLastSync.set(entity, Date.now());
      } catch {
        this.entityLastSync.set(entity, Date.now());
      }
    } else {
      this.entityLastSync.set(entity, Date.now());
    }

    return data;
  }

  /**
   * Handle successful poll
   */
  private handlePollSuccess(): void {
    this.state.consecutiveErrors = 0;
    this.state.lastSuccessTime = Date.now();
    this.state.currentInterval = this.config.baseInterval;
    this.state.errorMessage = undefined;
    this.metrics.successfulPolls++;

    this.notifyListeners();
  }

  /**
   * Handle poll error
   */
  private handlePollError(errorMessage: string): void {
    this.state.consecutiveErrors++;
    this.state.errorMessage = errorMessage;
    this.metrics.failedPolls++;

    // Apply exponential backoff
    this.state.currentInterval = Math.min(
      this.state.currentInterval * this.config.backoffMultiplier,
      this.config.maxInterval
    );

    // Stop polling if too many consecutive errors
    if (this.state.consecutiveErrors >= this.config.maxErrors) {
      console.error('[PollingFallback] Too many consecutive errors, stopping polling');
      this.stop();
      return;
    }

    console.warn(`[PollingFallback] Poll error (${this.state.consecutiveErrors}/${this.config.maxErrors}):`, errorMessage);
    this.notifyListeners();
  }

  /**
   * Update average response time
   */
  private updateAverageResponseTime(responseTime: number): void {
    if (this.metrics.averageResponseTime === 0) {
      this.metrics.averageResponseTime = responseTime;
    } else {
      // Exponential moving average
      this.metrics.averageResponseTime =
        (this.metrics.averageResponseTime * 0.8) + (responseTime * 0.2);
    }
  }

  /**
   * Create a simple hash of data for change detection
   */
  private hashData(data: any): string {
    return JSON.stringify(data).length.toString() +
      JSON.stringify(data).slice(0, 100);
  }

  /**
   * Emit entity change event
   */
  private emitEntityChange(entity: string, data: any): void {
    // Create a synthetic real-time event
    const changeEvent = {
      entity,
      eventType: 'UPDATE' as const,
      new: data,
      old: this.entityCache.get(entity),
      timestamp: new Date().toISOString(),
      source: 'polling'
    };

    // Emit through a custom event system or callback
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('polling-entity-change', {
        detail: changeEvent
      }));
    }

    console.log(`[PollingFallback] Entity ${entity} changed (detected via polling)`);
  }

  /**
   * Notify all listeners of state changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.getState());
      } catch (error) {
        console.error('[PollingFallback] Error notifying listener:', error);
      }
    });
  }

  /**
   * Get cached entity data
   */
  public getCachedData(entity: string): any {
    return this.entityCache.get(entity);
  }

  /**
   * Clear cached data
   */
  public clearCache(): void {
    this.entityCache.clear();
    this.lastDataHashes.clear();
  }

  /**
   * Update polling configuration
   */
  public updateConfig(newConfig: Partial<PollingConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Reset interval if currently polling
    if (this.state.isActive) {
      this.state.currentInterval = this.config.baseInterval;
    }
  }
}

// Global instance
export const pollingFallbackService = new PollingFallbackService();

/**
 * React hook for polling fallback state
 */
export function usePollingFallback() {
  const [state, setState] = React.useState<PollingState>(pollingFallbackService.getState());
  const [metrics, setMetrics] = React.useState<PollingMetrics>(pollingFallbackService.getMetrics());

  React.useEffect(() => {
    const unsubscribe = pollingFallbackService.subscribe((newState) => {
      setState(newState);
      setMetrics(pollingFallbackService.getMetrics());
    });

    return unsubscribe;
  }, []);

  return {
    state,
    metrics,
    start: (entities?: string[]) => pollingFallbackService.start(entities),
    stop: () => pollingFallbackService.stop(),
    forcePoll: () => pollingFallbackService.forcePoll(),
    getCachedData: (entity: string) => pollingFallbackService.getCachedData(entity),
    clearCache: () => pollingFallbackService.clearCache(),
    updateConfig: (config: Partial<PollingConfig>) => pollingFallbackService.updateConfig(config)
  };
}