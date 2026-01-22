/**
 * Temporary Locks System
 * Prevents simultaneous edits with automatic timeout and release
 */

import { supabaseRealtimeService } from '../supabase-realtime';

export interface LockInfo {
  lockId: string;
  entityType: string;
  entityId: string;
  field?: string;
  userId: string;
  userName: string;
  clientId: string;
  acquiredAt: number;
  expiresAt: number;
  lastHeartbeat: number;
  lockType: LockType;
  metadata?: Record<string, any>;
}

export type LockType = 'exclusive' | 'shared' | 'intent';

export interface LockRequest {
  entityType: string;
  entityId: string;
  field?: string;
  lockType: LockType;
  timeout?: number;
  metadata?: Record<string, any>;
}

export interface LockConfig {
  defaultTimeout: number; // ms
  heartbeatInterval: number; // ms
  maxLockDuration: number; // ms
  retryInterval: number; // ms
  maxRetries: number;
}

export type LockStatus = 'acquired' | 'denied' | 'expired' | 'released';

export interface LockResult {
  status: LockStatus;
  lock?: LockInfo;
  reason?: string;
  retryAfter?: number;
}

/**
 * Manages temporary locks for preventing simultaneous edits
 */
export class TemporaryLocks {
  private locks: Map<string, LockInfo> = new Map();
  private pendingRequests: Map<string, LockRequest> = new Map();
  private heartbeatIntervals: Map<string, NodeJS.Timeout> = new Map();
  private config: LockConfig;
  private currentUser: { userId: string; userName: string; clientId: string } | null = null;
  private listeners: Map<string, Set<LockListener>> = new Map();

  constructor(config: Partial<LockConfig> = {}) {
    this.config = {
      defaultTimeout: 300000, // 5 minutes
      heartbeatInterval: 30000, // 30 seconds
      maxLockDuration: 1800000, // 30 minutes
      retryInterval: 1000, // 1 second
      maxRetries: 5,
      ...config
    };

    this.setupRealtimeSubscription();
    this.startCleanupTimer();
  }

  /**
   * Set current user information
   */
  setCurrentUser(userId: string, userName: string, clientId: string): void {
    this.currentUser = { userId, userName, clientId };
  }

  /**
   * Acquire a lock on an entity
   */
  async acquireLock(request: LockRequest): Promise<LockResult> {
    if (!this.currentUser) {
      return { status: 'denied', reason: 'User not authenticated' };
    }

    const lockKey = this.getLockKey(request.entityType, request.entityId, request.field);
    const now = Date.now();
    const timeout = request.timeout || this.config.defaultTimeout;

    // Check if lock already exists
    const existingLock = this.locks.get(lockKey);
    if (existingLock) {
      // Check if it's the same user
      if (existingLock.userId === this.currentUser.userId && 
          existingLock.clientId === this.currentUser.clientId) {
        // Extend existing lock
        existingLock.expiresAt = now + timeout;
        existingLock.lastHeartbeat = now;
        return { status: 'acquired', lock: existingLock };
      }

      // Check lock compatibility
      if (!this.areLocksCompatible(existingLock.lockType, request.lockType)) {
        return {
          status: 'denied',
          reason: `Entity is locked by ${existingLock.userName}`,
          retryAfter: existingLock.expiresAt - now
        };
      }
    }

    // Create new lock
    const lock: LockInfo = {
      lockId: `${lockKey}_${now}_${Math.random()}`,
      entityType: request.entityType,
      entityId: request.entityId,
      field: request.field,
      userId: this.currentUser.userId,
      userName: this.currentUser.userName,
      clientId: this.currentUser.clientId,
      acquiredAt: now,
      expiresAt: Math.min(now + timeout, now + this.config.maxLockDuration),
      lastHeartbeat: now,
      lockType: request.lockType,
      metadata: request.metadata
    };

    // Store lock
    this.locks.set(lockKey, lock);

    // Start heartbeat
    this.startHeartbeat(lockKey);

    // Broadcast to other clients
    await this.broadcastLockAcquired(lock);

    // Notify listeners
    this.notifyListeners(lockKey, lock);

    return { status: 'acquired', lock };
  }

  /**
   * Release a lock
   */
  async releaseLock(entityType: string, entityId: string, field?: string): Promise<boolean> {
    if (!this.currentUser) return false;

    const lockKey = this.getLockKey(entityType, entityId, field);
    const lock = this.locks.get(lockKey);

    if (!lock || lock.userId !== this.currentUser.userId) {
      return false;
    }

    // Remove lock
    this.locks.delete(lockKey);

    // Stop heartbeat
    this.stopHeartbeat(lockKey);

    // Broadcast release
    await this.broadcastLockReleased(lock);

    // Notify listeners
    this.notifyListeners(lockKey, null);

    return true;
  }

  /**
   * Extend lock duration
   */
  async extendLock(
    entityType: string,
    entityId: string,
    field: string | undefined,
    additionalTime: number
  ): Promise<boolean> {
    if (!this.currentUser) return false;

    const lockKey = this.getLockKey(entityType, entityId, field);
    const lock = this.locks.get(lockKey);

    if (!lock || lock.userId !== this.currentUser.userId) {
      return false;
    }

    const now = Date.now();
    const newExpiration = Math.min(
      lock.expiresAt + additionalTime,
      now + this.config.maxLockDuration
    );

    lock.expiresAt = newExpiration;
    lock.lastHeartbeat = now;

    // Broadcast extension
    await this.broadcastLockExtended(lock);

    // Notify listeners
    this.notifyListeners(lockKey, lock);

    return true;
  }

  /**
   * Check if entity is locked
   */
  isLocked(entityType: string, entityId: string, field?: string): boolean {
    const lockKey = this.getLockKey(entityType, entityId, field);
    const lock = this.locks.get(lockKey);
    
    if (!lock) return false;
    
    // Check if lock is expired
    if (Date.now() > lock.expiresAt) {
      this.expireLock(lockKey);
      return false;
    }

    return true;
  }

  /**
   * Get lock information
   */
  getLockInfo(entityType: string, entityId: string, field?: string): LockInfo | null {
    const lockKey = this.getLockKey(entityType, entityId, field);
    const lock = this.locks.get(lockKey);

    if (!lock) return null;

    // Check if expired
    if (Date.now() > lock.expiresAt) {
      this.expireLock(lockKey);
      return null;
    }

    return lock;
  }

  /**
   * Check if current user owns the lock
   */
  ownsLock(entityType: string, entityId: string, field?: string): boolean {
    if (!this.currentUser) return false;

    const lock = this.getLockInfo(entityType, entityId, field);
    return lock?.userId === this.currentUser.userId && 
           lock?.clientId === this.currentUser.clientId;
  }

  /**
   * Try to acquire lock with retries
   */
  async tryAcquireLock(request: LockRequest): Promise<LockResult> {
    let attempts = 0;
    
    while (attempts < this.config.maxRetries) {
      const result = await this.acquireLock(request);
      
      if (result.status === 'acquired') {
        return result;
      }

      if (result.status === 'denied' && result.retryAfter) {
        // Wait for the suggested retry time or our retry interval
        const waitTime = Math.min(result.retryAfter, this.config.retryInterval);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        // Wait for retry interval
        await new Promise(resolve => setTimeout(resolve, this.config.retryInterval));
      }

      attempts++;
    }

    return { status: 'denied', reason: 'Max retries exceeded' };
  }

  /**
   * Subscribe to lock changes
   */
  subscribe(
    entityType: string,
    entityId: string,
    field: string | undefined,
    listener: LockListener
  ): () => void {
    const lockKey = this.getLockKey(entityType, entityId, field);
    
    if (!this.listeners.has(lockKey)) {
      this.listeners.set(lockKey, new Set());
    }
    
    this.listeners.get(lockKey)!.add(listener);

    // Send current state immediately
    const lock = this.locks.get(lockKey);
    listener(lock || null);

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(lockKey);
      if (listeners) {
        listeners.delete(listener);
        if (listeners.size === 0) {
          this.listeners.delete(lockKey);
        }
      }
    };
  }

  /**
   * Generate lock key
   */
  private getLockKey(entityType: string, entityId: string, field?: string): string {
    return field ? `${entityType}:${entityId}:${field}` : `${entityType}:${entityId}`;
  }

  /**
   * Check if two lock types are compatible
   */
  private areLocksCompatible(existing: LockType, requested: LockType): boolean {
    // Exclusive locks are never compatible
    if (existing === 'exclusive' || requested === 'exclusive') {
      return false;
    }

    // Shared locks are compatible with each other
    if (existing === 'shared' && requested === 'shared') {
      return true;
    }

    // Intent locks are compatible with shared locks
    if ((existing === 'intent' && requested === 'shared') ||
        (existing === 'shared' && requested === 'intent')) {
      return true;
    }

    return false;
  }

  /**
   * Start heartbeat for lock
   */
  private startHeartbeat(lockKey: string): void {
    this.stopHeartbeat(lockKey); // Clear existing

    const interval = setInterval(() => {
      const lock = this.locks.get(lockKey);
      if (lock && this.currentUser && lock.userId === this.currentUser.userId) {
        lock.lastHeartbeat = Date.now();
        this.broadcastHeartbeat(lock);
      }
    }, this.config.heartbeatInterval);

    this.heartbeatIntervals.set(lockKey, interval);
  }

  /**
   * Stop heartbeat for lock
   */
  private stopHeartbeat(lockKey: string): void {
    const interval = this.heartbeatIntervals.get(lockKey);
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(lockKey);
    }
  }

  /**
   * Expire a lock
   */
  private expireLock(lockKey: string): void {
    const lock = this.locks.get(lockKey);
    if (lock) {
      this.locks.delete(lockKey);
      this.stopHeartbeat(lockKey);
      this.broadcastLockExpired(lock);
      this.notifyListeners(lockKey, null);
    }
  }

  /**
   * Setup realtime subscription for locks
   */
  private setupRealtimeSubscription(): void {
    // Subscribe to locks table for real-time updates
    supabaseRealtimeService.subscribeToTable(
      'entity_locks',
      (payload) => {
        this.handleRealtimeUpdate(payload);
      }
    );
  }

  /**
   * Handle realtime updates from other clients
   */
  private handleRealtimeUpdate(payload: any): void {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    switch (eventType) {
      case 'INSERT':
        this.handleRemoteLockAcquired(newRecord);
        break;
      case 'UPDATE':
        this.handleRemoteLockUpdated(newRecord);
        break;
      case 'DELETE':
        this.handleRemoteLockReleased(oldRecord);
        break;
    }
  }

  /**
   * Handle remote lock acquired
   */
  private handleRemoteLockAcquired(record: any): void {
    const lockKey = this.getLockKey(record.entity_type, record.entity_id, record.field);
    
    const lock: LockInfo = {
      lockId: record.lock_id,
      entityType: record.entity_type,
      entityId: record.entity_id,
      field: record.field,
      userId: record.user_id,
      userName: record.user_name,
      clientId: record.client_id,
      acquiredAt: new Date(record.acquired_at).getTime(),
      expiresAt: new Date(record.expires_at).getTime(),
      lastHeartbeat: new Date(record.last_heartbeat).getTime(),
      lockType: record.lock_type as LockType,
      metadata: record.metadata
    };

    this.locks.set(lockKey, lock);
    this.notifyListeners(lockKey, lock);
  }

  /**
   * Handle remote lock updated
   */
  private handleRemoteLockUpdated(record: any): void {
    const lockKey = this.getLockKey(record.entity_type, record.entity_id, record.field);
    const lock = this.locks.get(lockKey);

    if (lock) {
      lock.expiresAt = new Date(record.expires_at).getTime();
      lock.lastHeartbeat = new Date(record.last_heartbeat).getTime();
      lock.metadata = record.metadata;
      
      this.notifyListeners(lockKey, lock);
    }
  }

  /**
   * Handle remote lock released
   */
  private handleRemoteLockReleased(record: any): void {
    const lockKey = this.getLockKey(record.entity_type, record.entity_id, record.field);
    this.locks.delete(lockKey);
    this.notifyListeners(lockKey, null);
  }

  /**
   * Broadcast lock acquired
   */
  private async broadcastLockAcquired(lock: LockInfo): Promise<void> {
    console.log('Broadcasting lock acquired:', lock);
    // Implementation would send to your backend/Supabase
  }

  /**
   * Broadcast lock released
   */
  private async broadcastLockReleased(lock: LockInfo): Promise<void> {
    console.log('Broadcasting lock released:', lock);
    // Implementation would send to your backend/Supabase
  }

  /**
   * Broadcast lock extended
   */
  private async broadcastLockExtended(lock: LockInfo): Promise<void> {
    console.log('Broadcasting lock extended:', lock);
    // Implementation would send to your backend/Supabase
  }

  /**
   * Broadcast lock expired
   */
  private async broadcastLockExpired(lock: LockInfo): Promise<void> {
    console.log('Broadcasting lock expired:', lock);
    // Implementation would send to your backend/Supabase
  }

  /**
   * Broadcast heartbeat
   */
  private async broadcastHeartbeat(lock: LockInfo): Promise<void> {
    console.log('Broadcasting heartbeat:', lock.lockId);
    // Implementation would send to your backend/Supabase
  }

  /**
   * Notify listeners of lock changes
   */
  private notifyListeners(lockKey: string, lock: LockInfo | null): void {
    const listeners = this.listeners.get(lockKey);
    if (listeners) {
      listeners.forEach(listener => listener(lock));
    }
  }

  /**
   * Start cleanup timer for expired locks
   */
  private startCleanupTimer(): void {
    setInterval(() => {
      this.cleanupExpiredLocks();
    }, this.config.heartbeatInterval);
  }

  /**
   * Clean up expired locks
   */
  private cleanupExpiredLocks(): void {
    const now = Date.now();
    const expiredLocks: string[] = [];

    this.locks.forEach((lock, lockKey) => {
      if (now > lock.expiresAt) {
        expiredLocks.push(lockKey);
      }
    });

    expiredLocks.forEach(lockKey => {
      this.expireLock(lockKey);
    });
  }

  /**
   * Get all active locks (for debugging)
   */
  getActiveLocks(): LockInfo[] {
    return Array.from(this.locks.values());
  }

  /**
   * Release all locks for current user
   */
  async releaseAllLocks(): Promise<void> {
    if (!this.currentUser) return;

    const userLocks = Array.from(this.locks.entries()).filter(
      ([, lock]) => lock.userId === this.currentUser!.userId
    );

    for (const [lockKey, lock] of userLocks) {
      await this.releaseLock(lock.entityType, lock.entityId, lock.field);
    }
  }
}

export type LockListener = (lock: LockInfo | null) => void;

/**
 * Global temporary locks instance
 */
export const temporaryLocks = new TemporaryLocks();

/**
 * React hook for temporary locks
 */
export function useTemporaryLock(
  entityType: string,
  entityId: string,
  field?: string
) {
  const [lockInfo, setLockInfo] = React.useState<LockInfo | null>(null);
  const [isLocked, setIsLocked] = React.useState(false);
  const [ownsLock, setOwnsLock] = React.useState(false);

  React.useEffect(() => {
    const unsubscribe = temporaryLocks.subscribe(
      entityType,
      entityId,
      field,
      (lock) => {
        setLockInfo(lock);
        setIsLocked(!!lock);
        setOwnsLock(temporaryLocks.ownsLock(entityType, entityId, field));
      }
    );

    return unsubscribe;
  }, [entityType, entityId, field]);

  const acquireLock = React.useCallback(async (
    lockType: LockType = 'exclusive',
    timeout?: number
  ) => {
    return temporaryLocks.acquireLock({
      entityType,
      entityId,
      field,
      lockType,
      timeout
    });
  }, [entityType, entityId, field]);

  const releaseLock = React.useCallback(async () => {
    return temporaryLocks.releaseLock(entityType, entityId, field);
  }, [entityType, entityId, field]);

  const extendLock = React.useCallback(async (additionalTime: number) => {
    return temporaryLocks.extendLock(entityType, entityId, field, additionalTime);
  }, [entityType, entityId, field]);

  return {
    lockInfo,
    isLocked,
    ownsLock,
    acquireLock,
    releaseLock,
    extendLock
  };
}

// Import React for the hook
import React from 'react';