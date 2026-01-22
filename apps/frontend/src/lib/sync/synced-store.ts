import { SyncEvent, SyncStoreConfig, SyncState, SyncListener } from './types';
import { ORIGIN } from './utils';
import { supabase } from './utils';

export class SyncedStore<T extends Record<string, any>> {
  private key: string;
  private state: SyncState<T>;
  private bc: BroadcastChannel;
  private applyingInbound = false;
  private listeners: Set<SyncListener<T>> = new Set();
  private config: SyncStoreConfig;
  private debounceTimer: NodeJS.Timeout | null = null;
  private mergeStrategy: (local: T, remote: T, type: string) => T;

  constructor(
    key: string,
    initial: T,
    config: SyncStoreConfig,
    mergeStrategy?: (local: T, remote: T, type: string) => T
  ) {
    this.key = key;
    this.config = config;
    this.mergeStrategy = mergeStrategy || this.defaultMerge;
    
    const cached = localStorage.getItem(this.key);
    const lastSync = localStorage.getItem(`${this.key}:lastSync`);
    const version = parseInt(localStorage.getItem(`${this.key}:version`) || '0', 10);
    
    this.state = {
      data: cached ? JSON.parse(cached) as T : initial,
      version,
      lastSync,
      isOnline: navigator.onLine
    };

    this.bc = new BroadcastChannel('app-sync');
    this.bc.onmessage = this.handleBroadcastMessage.bind(this);
    
    window.addEventListener('online', () => this.updateOnlineStatus(true));
    window.addEventListener('offline', () => this.updateOnlineStatus(false));
  }

  getState(): SyncState<T> {
    return this.state;
  }

  getData(): T {
    return this.state.data;
  }

  subscribe(listener: SyncListener<T>): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  setState(patch: Partial<T>, type: string = 'state.patch') {
    if (this.applyingInbound) return;
    
    const nextData = { ...this.state.data, ...patch } as T;
    this.updateState(nextData, type);
    
    if (this.config.debounceMs) {
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.broadcastAndSync(patch, nextData);
      }, this.config.debounceMs);
    } else {
      this.broadcastAndSync(patch, nextData);
    }
  }

  private updateState(data: T, type: string, version?: number, lastSync?: string) {
    this.state = {
      ...this.state,
      data,
      version: version || this.state.version,
      lastSync: lastSync || new Date().toISOString(),
      isOnline: navigator.onLine
    };
    
    localStorage.setItem(this.key, JSON.stringify(data));
    if (version !== undefined) {
      localStorage.setItem(`${this.key}:version`, String(version));
    }
    localStorage.setItem(`${this.key}:lastSync`, this.state.lastSync!);
    
    this.listeners.forEach(listener => listener(this.state));
  }

  private broadcastAndSync(patch: Partial<T>, fullData: T) {
    const event: SyncEvent = {
      channel: this.config.channel,
      entity_id: this.config.entityId,
      type: 'state.patch',
      payload: patch,
      origin: ORIGIN,
      branch_id: this.config.branchId,
      pos_id: this.config.posId
    };

    this.broadcast(event, fullData);
    this.syncToRemote(event, fullData);
  }

  private broadcast(event: SyncEvent, fullData: T) {
    const broadcastData = {
      ...event,
      state: fullData,
      version: this.state.version
    };
    this.bc.postMessage(broadcastData);
  }

  private async syncToRemote(event: SyncEvent, fullData: T) {
    if (!navigator.onLine) return;
    
    try {
      const { error } = await supabase.from('sync_events').insert(event);
      if (error) {
        console.warn('Failed to sync to remote:', error);
      }
    } catch (err) {
      console.error('Remote sync error:', err);
    }
  }

  private handleBroadcastMessage(ev: MessageEvent) {
    const msg = ev.data as SyncEvent & { state?: T; version?: number };
    
    if (!msg || msg.channel !== this.config.channel || msg.entity_id !== this.config.entityId) return;
    if (msg.origin === ORIGIN) return;
    
    const remoteVersion = msg.version || 0;
    if (remoteVersion <= this.state.version) return;
    
    this.applyInbound(msg.payload, msg.state, remoteVersion);
  }

  private applyInbound(patch: any, fullState: T | undefined, version: number) {
    this.applyingInbound = true;
    
    try {
      let nextData: T;
      if (fullState) {
        nextData = this.mergeStrategy(this.state.data, fullState, 'remote.full');
      } else {
        const patchData = { ...this.state.data, ...patch } as T;
        nextData = this.mergeStrategy(this.state.data, patchData, 'remote.patch');
      }
      
      this.updateState(nextData, 'remote.apply', version);
    } finally {
      this.applyingInbound = false;
    }
  }

  private defaultMerge(local: T, remote: T, type: string): T {
    if (type.includes('full')) {
      return remote;
    }
    return { ...local, ...remote };
  }

  private updateOnlineStatus(isOnline: boolean) {
    this.state = { ...this.state, isOnline };
    this.listeners.forEach(listener => listener(this.state));
  }

  destroy() {
    this.bc.close();
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    window.removeEventListener('online', () => this.updateOnlineStatus(true));
    window.removeEventListener('offline', () => this.updateOnlineStatus(false));
  }
}