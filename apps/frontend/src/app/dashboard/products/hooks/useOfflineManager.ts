'use client';

import { useState, useEffect, useCallback } from 'react';
import OfflineManager from '../services/OfflineManager';

export function useOfflineManager() {
  const [offlineState, setOfflineState] = useState(() => 
    OfflineManager.getInstance().getState()
  );

  useEffect(() => {
    const manager = OfflineManager.getInstance();
    
    const unsubscribe = manager.subscribe((state) => {
      setOfflineState(state);
    });

    return unsubscribe;
  }, []);

  const queueAction = useCallback((action: any) => {
    const manager = OfflineManager.getInstance();
    manager.queueAction(action);
  }, []);

  const executeAction = useCallback(async (action: any) => {
    const manager = OfflineManager.getInstance();
    return manager.executeAction(action);
  }, []);

  const cacheForOffline = useCallback(async (key: string, data: any, ttl?: number) => {
    const manager = OfflineManager.getInstance();
    return manager.cacheForOffline(key, data, ttl);
  }, []);

  const getOfflineData = useCallback(async <T>(key: string): Promise<T | null> => {
    const manager = OfflineManager.getInstance();
    return manager.getOfflineData<T>(key);
  }, []);

  const hasOfflineData = useCallback(async (key: string): Promise<boolean> => {
    const manager = OfflineManager.getInstance();
    return manager.hasOfflineData(key);
  }, []);

  const forceSync = useCallback(async () => {
    const manager = OfflineManager.getInstance();
    return manager.forceSync();
  }, []);

  const getStats = useCallback(() => {
    const manager = OfflineManager.getInstance();
    return manager.getStats();
  }, []);

  const clearOfflineData = useCallback(async () => {
    const manager = OfflineManager.getInstance();
    return manager.clearOfflineData();
  }, []);

  return {
    // State
    isOnline: offlineState.isOnline,
    pendingActions: offlineState.pendingActions,
    lastSync: offlineState.lastSync,
    
    // Actions
    queueAction,
    executeAction,
    cacheForOffline,
    getOfflineData,
    hasOfflineData,
    forceSync,
    getStats,
    clearOfflineData
  };
}