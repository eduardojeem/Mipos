'use client';

import AdvancedCache from './AdvancedCache';

interface OfflineAction {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'product' | 'category';
  data: any;
  timestamp: number;
  retryCount: number;
}

interface OfflineState {
  isOnline: boolean;
  pendingActions: OfflineAction[];
  lastSync: number;
}

class OfflineManager {
  private static instance: OfflineManager;
  private cache: AdvancedCache;
  private state: OfflineState;
  private listeners: ((state: OfflineState) => void)[] = [];
  private syncInProgress = false;
  private handleOnline = () => {
    this.updateOnlineStatus(true);
    this.syncPendingActions();
  };
  private handleOffline = () => {
    this.updateOnlineStatus(false);
  };

  private constructor() {
    this.cache = AdvancedCache.getInstance();
    this.state = {
      isOnline: navigator.onLine,
      pendingActions: [],
      lastSync: 0
    };

    this.initializeEventListeners();
    this.loadOfflineState();
  }

  static getInstance(): OfflineManager {
    if (!this.instance) {
      this.instance = new OfflineManager();
    }
    return this.instance;
  }

  private initializeEventListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);

    // Periodic sync when online
    setInterval(() => {
      if (this.state.isOnline && this.state.pendingActions.length > 0) {
        this.syncPendingActions();
      }
    }, 30000); // Every 30 seconds
  }

  private updateOnlineStatus(isOnline: boolean): void {
    this.state.isOnline = isOnline;
    this.notifyListeners();
    this.saveOfflineState();
  }

  // Queue action for offline execution
  queueAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>): void {
    const fullAction: OfflineAction = {
      ...action,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0
    };

    this.state.pendingActions.push(fullAction);
    this.notifyListeners();
    this.saveOfflineState();

    // Try to sync immediately if online
    if (this.state.isOnline) {
      this.syncPendingActions();
    }
  }

  // Execute action (online or queue for offline)
  async executeAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>): Promise<boolean> {
    if (this.state.isOnline) {
      try {
        const success = await this.performAction(action);
        if (success) {
          return true;
        } else {
          // Queue for retry
          this.queueAction(action);
          return false;
        }
      } catch (error) {
        console.error('Failed to execute action online:', error);
        this.queueAction(action);
        return false;
      }
    } else {
      // Queue for offline execution
      this.queueAction(action);
      return false;
    }
  }

  // Sync pending actions when online
  private async syncPendingActions(): Promise<void> {
    if (this.syncInProgress || !this.state.isOnline || this.state.pendingActions.length === 0) {
      return;
    }

    this.syncInProgress = true;
    const actionsToSync = [...this.state.pendingActions];
    const successfulActions: string[] = [];

    for (const action of actionsToSync) {
      try {
        const success = await this.performAction(action);
        if (success) {
          successfulActions.push(action.id);
        } else {
          // Increment retry count
          action.retryCount++;
          if (action.retryCount >= 3) {
            // Remove after 3 failed attempts
            successfulActions.push(action.id);
            console.warn('Action failed after 3 attempts, removing:', action);
          }
        }
      } catch (error) {
        console.error('Failed to sync action:', action, error);
        action.retryCount++;
        if (action.retryCount >= 3) {
          successfulActions.push(action.id);
        }
      }
    }

    // Remove successful actions
    this.state.pendingActions = this.state.pendingActions.filter(
      action => !successfulActions.includes(action.id)
    );

    this.state.lastSync = Date.now();
    this.syncInProgress = false;
    this.notifyListeners();
    this.saveOfflineState();
  }

  // Perform the actual action (would integrate with your API)
  private async performAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>): Promise<boolean> {
    // This is a mock implementation
    // In a real app, this would call your API endpoints
    
    console.log('Performing action:', action);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate success/failure (90% success rate)
    return Math.random() > 0.1;
  }

  // Cache data for offline access
  async cacheForOffline(key: string, data: any, ttl: number = 24 * 60 * 60 * 1000): Promise<void> {
    await this.cache.set(`offline:${key}`, data, ttl, { offline: true });
  }

  // Get cached data for offline access
  async getOfflineData<T>(key: string): Promise<T | null> {
    return this.cache.get<T>(`offline:${key}`);
  }

  // Check if data is available offline
  async hasOfflineData(key: string): Promise<boolean> {
    return this.cache.has(`offline:${key}`);
  }

  // Get offline state
  getState(): OfflineState {
    return { ...this.state };
  }

  // Subscribe to state changes
  subscribe(listener: (state: OfflineState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Get offline statistics
  getStats(): {
    pendingActions: number;
    lastSync: string;
    isOnline: boolean;
    cacheSize: number;
  } {
    return {
      pendingActions: this.state.pendingActions.length,
      lastSync: this.state.lastSync ? new Date(this.state.lastSync).toLocaleString() : 'Never',
      isOnline: this.state.isOnline,
      cacheSize: 0 // Would need to get from cache
    };
  }

  // Force sync
  async forceSync(): Promise<void> {
    if (this.state.isOnline) {
      await this.syncPendingActions();
    }
  }

  // Clear offline data
  async clearOfflineData(): Promise<void> {
    this.state.pendingActions = [];
    this.state.lastSync = 0;
    this.notifyListeners();
    this.saveOfflineState();
    
    // Clear offline cache entries
    // This would need to be implemented in AdvancedCache
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.getState()));
  }

  private saveOfflineState(): void {
    try {
      localStorage.setItem('offline-state', JSON.stringify({
        pendingActions: this.state.pendingActions,
        lastSync: this.state.lastSync
      }));
    } catch (error) {
      console.warn('Failed to save offline state:', error);
    }
  }

  private loadOfflineState(): void {
    try {
      const stored = localStorage.getItem('offline-state');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.state.pendingActions = parsed.pendingActions || [];
        this.state.lastSync = parsed.lastSync || 0;
      }
    } catch (error) {
      console.warn('Failed to load offline state:', error);
    }
  }

  // Cleanup
  destroy(): void {
    this.listeners = [];
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
  }
}

export default OfflineManager;
