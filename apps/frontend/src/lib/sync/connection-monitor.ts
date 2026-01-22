/**
 * Connection Monitor System
 * Provides real-time connection status indicators and automatic polling fallback
 */

import { supabaseRealtimeService } from '../supabase-realtime';
import { pollingFallbackService } from './polling-fallback';

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';
export type NetworkQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'offline';
export type SyncStatus = 'synced' | 'syncing' | 'pending' | 'error' | 'offline';

export interface ConnectionMetrics {
  latency: number; // ms
  packetLoss: number; // percentage
  bandwidth: number; // bytes/sec
  jitter: number; // ms
  lastMeasured: number;
}

export interface ConnectionState {
  status: ConnectionStatus;
  networkQuality: NetworkQuality;
  syncStatus: SyncStatus;
  metrics: ConnectionMetrics;
  isRealtimeActive: boolean;
  isPollingActive: boolean;
  lastConnected: number;
  reconnectAttempts: number;
  errorMessage?: string;
}

export interface ConnectionConfig {
  heartbeatInterval: number; // ms
  qualityCheckInterval: number; // ms
  reconnectInterval: number; // ms
  maxReconnectAttempts: number;
  pollingFallbackDelay: number; // ms
  latencyThresholds: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
  packetLossThresholds: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
}

/**
 * Monitors connection status and provides fallback mechanisms
 */
export class ConnectionMonitor {
  private state: ConnectionState;
  private config: ConnectionConfig;
  private listeners: Set<ConnectionListener> = new Set();
  private heartbeatInterval?: NodeJS.Timeout;
  private qualityCheckInterval?: NodeJS.Timeout;
  private reconnectTimeout?: NodeJS.Timeout;
  private pollingInterval?: NodeJS.Timeout;
  private lastHeartbeat: number = 0;
  private pendingPings: Map<string, number> = new Map();

  constructor(config: Partial<ConnectionConfig> = {}) {
    this.config = {
      heartbeatInterval: 5000, // 5 seconds
      qualityCheckInterval: 30000, // 30 seconds
      reconnectInterval: 2000, // 2 seconds
      maxReconnectAttempts: 10,
      pollingFallbackDelay: 15000, // 15 seconds
      latencyThresholds: {
        excellent: 50,
        good: 150,
        fair: 300,
        poor: 1000
      },
      packetLossThresholds: {
        excellent: 0,
        good: 1,
        fair: 3,
        poor: 10
      },
      ...config
    };

    this.state = {
      status: 'disconnected',
      networkQuality: 'offline',
      syncStatus: 'offline',
      metrics: {
        latency: 0,
        packetLoss: 0,
        bandwidth: 0,
        jitter: 0,
        lastMeasured: 0
      },
      isRealtimeActive: false,
      isPollingActive: false,
      lastConnected: 0,
      reconnectAttempts: 0
    };

    this.initialize();
  }

  /**
   * Initialize connection monitoring
   */
  private initialize(): void {
    this.setupRealtimeMonitoring();
    if (typeof window !== 'undefined') {
      const start = () => {
        this.startHeartbeat();
        this.startQualityChecks();
        this.setupNetworkEventListeners();
      };
      try {
        // Prefer idle callback to avoid blocking initial render
        const ric: any = (window as any).requestIdleCallback;
        if (typeof ric === 'function') {
          ric(() => start(), { timeout: 2000 });
        } else {
          setTimeout(start, 1500);
        }
      } catch {
        setTimeout(start, 1500);
      }
    }
  }

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return { ...this.state };
  }

  /**
   * Subscribe to connection state changes
   */
  subscribe(listener: ConnectionListener): () => void {
    this.listeners.add(listener);
    
    // Send current state immediately
    listener(this.state);

    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Force connection check
   */
  async checkConnection(): Promise<void> {
    await this.performQualityCheck();
  }

  /**
   * Manually trigger reconnection
   */
  async reconnect(): Promise<void> {
    this.state.reconnectAttempts = 0;
    await this.attemptReconnection();
  }

  /**
   * Setup realtime connection monitoring
   */
  private setupRealtimeMonitoring(): void {
    // Monitor Supabase realtime connection
    supabaseRealtimeService.onConnectionChange((status) => {
      this.handleRealtimeStatusChange(status);
    });

    // Monitor for realtime errors
    supabaseRealtimeService.onError((error) => {
      this.handleRealtimeError(error);
    });
  }

  /**
   * Handle realtime status changes
   */
  private handleRealtimeStatusChange(status: string): void {
    const now = Date.now();

    switch (status) {
      case 'SUBSCRIBED':
      case 'CHANNEL_SUBSCRIBED':
        this.state.status = 'connected';
        this.state.isRealtimeActive = true;
        this.state.lastConnected = now;
        this.state.reconnectAttempts = 0;
        this.state.errorMessage = undefined;
        this.stopPolling();
        break;

      case 'CONNECTING':
      case 'CHANNEL_CONNECTING':
        this.state.status = 'connecting';
        break;

      case 'DISCONNECTED':
      case 'CHANNEL_DISCONNECTED':
        this.state.status = 'disconnected';
        this.state.isRealtimeActive = false;
        this.scheduleReconnection();
        break;

      case 'CHANNEL_ERROR':
      case 'ERROR':
        this.state.status = 'error';
        this.state.isRealtimeActive = false;
        this.scheduleReconnection();
        break;
    }

    this.updateSyncStatus();
    this.notifyListeners();
  }

  /**
   * Handle realtime errors
   */
  private handleRealtimeError(error: any): void {
    this.state.status = 'error';
    this.state.errorMessage = error.message || 'Realtime connection error';
    this.state.isRealtimeActive = false;
    
    this.scheduleReconnection();
    this.notifyListeners();
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, this.config.heartbeatInterval);
  }

  /**
   * Send heartbeat ping
   */
  private async sendHeartbeat(): Promise<void> {
    const pingId = `ping_${Date.now()}_${Math.random()}`;
    const startTime = performance.now();
    
    this.pendingPings.set(pingId, startTime);

    try {
      const resp1 = await fetch('/api/health', {
        method: 'GET',
        cache: 'no-store',
        keepalive: true,
        headers: { 'X-Ping-ID': pingId }
      });
      let ok = resp1.ok;
      if (!ok) {
        const resp2 = await fetch('/health', {
          method: 'GET',
          cache: 'no-store',
          keepalive: true,
          headers: { 'X-Ping-ID': pingId }
        });
        ok = resp2.ok;
      }
      const endTime = performance.now();
      const latency = endTime - startTime;
      if (ok) {
        this.handleHeartbeatResponse(pingId, latency);
      } else {
        this.handleHeartbeatError(pingId);
      }
    } catch (error: any) {
      const msg = typeof error?.message === 'string' ? error.message : '';
      const name = String(error?.name || '');
      const code = String((error as any)?.code || '');
      const aborted = name === 'AbortError' || msg.includes('Abort') || code === 'ERR_ABORTED';
      if (!aborted) {
        this.handleHeartbeatError(pingId);
      } else {
        this.pendingPings.delete(pingId);
      }
    }
  }

  /**
   * Handle successful heartbeat response
   */
  private handleHeartbeatResponse(pingId: string, latency: number): void {
    this.pendingPings.delete(pingId);
    this.lastHeartbeat = Date.now();

    // Update metrics
    this.state.metrics.latency = latency;
    this.state.metrics.lastMeasured = this.lastHeartbeat;

    // Update network quality based on latency
    this.updateNetworkQuality();

    // If we were disconnected, mark as connected
    if (this.state.status === 'disconnected' || this.state.status === 'error') {
      this.state.status = 'connected';
      this.state.reconnectAttempts = 0;
      this.state.errorMessage = undefined;
    }

    this.updateSyncStatus();
    this.notifyListeners();
  }

  /**
   * Handle heartbeat error
   */
  private handleHeartbeatError(pingId: string): void {
    this.pendingPings.delete(pingId);

    // Check if we've been offline for too long
    const timeSinceLastHeartbeat = Date.now() - this.lastHeartbeat;
    
    if (timeSinceLastHeartbeat > this.config.heartbeatInterval * 3) {
      this.state.status = 'disconnected';
      this.state.networkQuality = 'offline';
      this.scheduleReconnection();
    }

    this.updateSyncStatus();
    this.notifyListeners();
  }

  /**
   * Start quality checks
   */
  private startQualityChecks(): void {
    this.qualityCheckInterval = setInterval(() => {
      this.performQualityCheck();
    }, this.config.qualityCheckInterval);
  }

  /**
   * Perform comprehensive quality check
   */
  private async performQualityCheck(): Promise<void> {
    const startTime = performance.now();
    const testData = new Array(1000).fill('x').join(''); // 1KB test data

    try {
      const resp1 = await fetch('/api/health', {
        method: 'POST',
        cache: 'no-store',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: testData })
      });
      let ok = resp1.ok;
      if (!ok) {
        const resp2 = await fetch('/health', {
          method: 'POST',
          cache: 'no-store',
          keepalive: true,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ test: testData })
        });
        ok = resp2.ok;
      }
      const endTime = performance.now();
      const latency = endTime - startTime;
      if (ok) {
        const dataSize = testData.length * 2;
        const bandwidth = (dataSize / (latency / 1000));
        this.state.metrics.latency = latency;
        this.state.metrics.bandwidth = bandwidth;
        this.state.metrics.lastMeasured = Date.now();
        this.updateNetworkQuality();
      }
    } catch (error: any) {
      const msg = typeof error?.message === 'string' ? error.message : '';
      const name = String(error?.name || '');
      const code = String((error as any)?.code || '');
      const aborted = name === 'AbortError' || msg.includes('Abort') || code === 'ERR_ABORTED';
      if (!aborted) {
        this.state.networkQuality = 'offline';
      }
    }

    this.updateSyncStatus();
    this.notifyListeners();
  }

  /**
   * Update network quality based on metrics
   */
  private updateNetworkQuality(): void {
    const { latency, packetLoss } = this.state.metrics;
    const { latencyThresholds, packetLossThresholds } = this.config;

    if (latency <= latencyThresholds.excellent && packetLoss <= packetLossThresholds.excellent) {
    this.state.networkQuality = 'excellent';
    } else if (latency <= latencyThresholds.good && packetLoss <= packetLossThresholds.good) {
    this.state.networkQuality = 'good';
    } else if (latency <= latencyThresholds.fair && packetLoss <= packetLossThresholds.fair) {
    this.state.networkQuality = 'fair';
    } else if (latency <= latencyThresholds.poor && packetLoss <= packetLossThresholds.poor) {
    this.state.networkQuality = 'poor';
    } else {
    this.state.networkQuality = 'offline';
    }
  }

  /**
   * Update sync status based on connection state
   */
  private updateSyncStatus(): void {
    if (this.state.status === 'connected' && this.state.isRealtimeActive) {
      this.state.syncStatus = 'synced';
    } else if (this.state.status === 'connecting') {
      this.state.syncStatus = 'syncing';
    } else if (this.state.isPollingActive) {
      this.state.syncStatus = 'pending';
    } else if (this.state.status === 'error') {
      this.state.syncStatus = 'error';
    } else {
      this.state.syncStatus = 'offline';
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnection(): void {
    if (this.state.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.startPolling();
      return;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    const delay = this.config.reconnectInterval * Math.pow(2, this.state.reconnectAttempts);
    
    this.reconnectTimeout = setTimeout(() => {
      this.attemptReconnection();
    }, delay);
  }

  /**
   * Attempt to reconnect
   */
  private async attemptReconnection(): Promise<void> {
    this.state.reconnectAttempts++;
    this.state.status = 'connecting';
    this.notifyListeners();

    try {
      // Try to reconnect realtime service
      await supabaseRealtimeService.reconnect();
    } catch (error) {
      console.error('Reconnection failed:', error);
      this.scheduleReconnection();
    }
  }

  /**
   * Start polling fallback
   */
  private startPolling(): void {
    if (this.state.isPollingActive) return;
    console.log('Starting polling fallback');
    this.state.syncStatus = 'pending';
    // Delegate to centralized polling fallback service
    pollingFallbackService.start();
    this.notifyListeners();
  }

  /**
   * Stop polling fallback
   */
  private stopPolling(): void {
    if (!this.state.isPollingActive) return;
    console.log('Stopping polling fallback');
    // Delegate to centralized polling fallback service
    pollingFallbackService.stop();
    this.notifyListeners();
  }

  // Polling sync is now fully delegated to pollingFallbackService

  /**
   * Setup network event listeners
   */
  private setupNetworkEventListeners(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('Network came online');
        this.state.reconnectAttempts = 0;
        this.attemptReconnection();
      });

      window.addEventListener('offline', () => {
        console.log('Network went offline');
        this.state.status = 'disconnected';
        this.state.networkQuality = 'offline';
        this.state.isRealtimeActive = false;
        this.startPolling();
        this.notifyListeners();
      });
    }

    // Monitor polling fallback status
    this.monitorPollingFallback();
  }

  /**
   * Monitor polling fallback service
   */
  private monitorPollingFallback(): void {
    pollingFallbackService.subscribe((pollingState) => {
      this.state.isPollingActive = pollingState.isActive;
      this.updateSyncStatus();
      this.notifyListeners();
    });
  }

  /**
   * Notify all listeners of state changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.state);
      } catch (error) {
        console.error('Error in connection listener:', error);
      }
    });
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    if (this.qualityCheckInterval) {
      clearInterval(this.qualityCheckInterval);
    }
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    this.listeners.clear();
  }
}

export type ConnectionListener = (state: ConnectionState) => void;

/**
 * Global connection monitor instance
 */
export const connectionMonitor = new ConnectionMonitor();

/**
 * React hook for connection monitoring
 */
export function useConnectionMonitor() {
  const [connectionState, setConnectionState] = React.useState<ConnectionState>(
    connectionMonitor.getState()
  );

  React.useEffect(() => {
    const unsubscribe = connectionMonitor.subscribe(setConnectionState);
    return unsubscribe;
  }, []);

  const checkConnection = React.useCallback(() => {
    connectionMonitor.checkConnection();
  }, []);

  const reconnect = React.useCallback(() => {
    connectionMonitor.reconnect();
  }, []);

  return {
    ...connectionState,
    checkConnection,
    reconnect
  };
}

/**
 * Connection status indicator component props
 */
export interface ConnectionIndicatorProps {
  showDetails?: boolean;
  className?: string;
}

// Import React for the hook
import React from 'react';
