/**
 * Centralized Sync State Store
 * - Fuente única de verdad para estado de sincronización
 * - API para consultar y modificar
 * - Suscripciones para UI/metrics
 */

export type SyncMethod = 'realtime' | 'polling' | 'offline';

export interface SyncCoordinatorState {
  method: SyncMethod;
  networkQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'offline';
  isRealtimeActive: boolean;
  isPollingActive: boolean;
  backlogSize: number;
  backpressureActive: boolean;
  lastSyncTime?: number;
  errorCount: number;
  tickIntervalMs: number;
  thresholds: {
    slowdown: number;
    critical: number;
  };
  entityPriorities: Record<string, number>;
}

type Listener = (state: SyncCoordinatorState) => void;

class SyncStateStore {
  private state: SyncCoordinatorState = {
    method: 'realtime',
    networkQuality: 'offline',
    isRealtimeActive: false,
    isPollingActive: false,
    backlogSize: 0,
    backpressureActive: false,
    errorCount: 0,
    tickIntervalMs: 2000,
    thresholds: { slowdown: 20, critical: 100 },
    entityPriorities: {}
  };
  private listeners = new Set<Listener>();

  get(): SyncCoordinatorState { return { ...this.state }; }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.get());
    return () => this.listeners.delete(fn);
  }

  update(partial: Partial<SyncCoordinatorState>) {
    this.state = { ...this.state, ...partial };
    this.emit();
  }

  setThresholds(slowdown: number, critical: number) {
    this.state.thresholds = { slowdown, critical };
    this.emit();
  }

  setEntityPriorities(priorities: Record<string, number>) {
    this.state.entityPriorities = { ...priorities };
    this.emit();
  }

  private emit() {
    const snapshot = this.get();
    this.listeners.forEach((fn) => { try { fn(snapshot); } catch {} });
  }
}

export const syncState = new SyncStateStore();

// Simple hooks for UI (no React import to avoid SSR issues; consumers can wrap)
export type SyncStateSubscriber = Listener;

// Persistencia en localStorage del estado de sincronización
export class PersistentSyncStateStore extends SyncStateStore {
  private storageKey = 'sync-state';

  constructor() {
    super();
    this.loadFromStorage();
    this.setupPersistence();
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.update(parsed);
      }
    } catch (e) {
      console.warn('Failed to load sync state from storage', e);
    }
  }

  private setupPersistence() {
    this.subscribe((state) => {
      if (typeof window === 'undefined') return;
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(state));
      } catch (e) {
        console.warn('Failed to persist sync state', e);
      }
    });
  }
}