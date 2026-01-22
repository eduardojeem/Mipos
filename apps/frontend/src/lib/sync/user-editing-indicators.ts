/**
 * User Editing Indicators System
 * Shows real-time indicators of which users are currently editing specific entities
 */

import { supabaseRealtimeService } from '../supabase-realtime';

export interface EditingUser {
  userId: string;
  userName: string;
  userAvatar?: string;
  startedAt: number;
  lastActivity: number;
  cursor?: {
    field: string;
    position: number;
  };
}

export interface EditingSession {
  entityType: string;
  entityId: string;
  field?: string;
  users: Map<string, EditingUser>;
  createdAt: number;
  updatedAt: number;
}

export interface EditingIndicatorConfig {
  sessionTimeout: number; // ms
  heartbeatInterval: number; // ms
  maxConcurrentEditors: number;
  showCursors: boolean;
  showUserAvatars: boolean;
}

/**
 * Manages real-time editing indicators across multiple devices
 */
export class UserEditingIndicators {
  private sessions: Map<string, EditingSession> = new Map();
  private currentUser: EditingUser | null = null;
  private heartbeatIntervals: Map<string, NodeJS.Timeout> = new Map();
  private config: EditingIndicatorConfig;
  private listeners: Map<string, Set<EditingIndicatorListener>> = new Map();

  constructor(config: Partial<EditingIndicatorConfig> = {}) {
    this.config = {
      sessionTimeout: 30000, // 30 seconds
      heartbeatInterval: 5000, // 5 seconds
      maxConcurrentEditors: 10,
      showCursors: true,
      showUserAvatars: true,
      ...config
    };

    this.setupRealtimeSubscription();
    this.startCleanupTimer();
  }

  /**
   * Start editing session for current user
   */
  startEditing(
    entityType: string,
    entityId: string,
    field: string | undefined,
    user: Omit<EditingUser, 'startedAt' | 'lastActivity'>
  ): void {
    const sessionKey = this.getSessionKey(entityType, entityId, field);
    const now = Date.now();

    this.currentUser = {
      ...user,
      startedAt: now,
      lastActivity: now
    };

    // Get or create session
    let session = this.sessions.get(sessionKey);
    if (!session) {
      session = {
        entityType,
        entityId,
        field,
        users: new Map(),
        createdAt: now,
        updatedAt: now
      };
      this.sessions.set(sessionKey, session);
    }

    // Add current user to session
    session.users.set(user.userId, this.currentUser);
    session.updatedAt = now;

    // Start heartbeat
    this.startHeartbeat(sessionKey);

    // Broadcast to other users
    this.broadcastEditingStatus(sessionKey, 'start');

    // Notify listeners
    this.notifyListeners(sessionKey, session);
  }

  /**
   * Stop editing session for current user
   */
  stopEditing(entityType: string, entityId: string, field?: string): void {
    const sessionKey = this.getSessionKey(entityType, entityId, field);
    const session = this.sessions.get(sessionKey);

    if (session && this.currentUser) {
      // Remove current user from session
      session.users.delete(this.currentUser.userId);
      session.updatedAt = Date.now();

      // Stop heartbeat
      this.stopHeartbeat(sessionKey);

      // Broadcast to other users
      this.broadcastEditingStatus(sessionKey, 'stop');

      // Clean up empty sessions
      if (session.users.size === 0) {
        this.sessions.delete(sessionKey);
      }

      // Notify listeners
      this.notifyListeners(sessionKey, session.users.size > 0 ? session : null);

      this.currentUser = null;
    }
  }

  /**
   * Update cursor position for current user
   */
  updateCursor(
    entityType: string,
    entityId: string,
    field: string,
    position: number
  ): void {
    const sessionKey = this.getSessionKey(entityType, entityId, field);
    const session = this.sessions.get(sessionKey);

    if (session && this.currentUser) {
      this.currentUser.cursor = { field, position };
      this.currentUser.lastActivity = Date.now();
      session.updatedAt = Date.now();

      // Broadcast cursor update
      this.broadcastCursorUpdate(sessionKey);

      // Notify listeners
      this.notifyListeners(sessionKey, session);
    }
  }

  /**
   * Get editing users for a specific entity
   */
  getEditingUsers(entityType: string, entityId: string, field?: string): EditingUser[] {
    const sessionKey = this.getSessionKey(entityType, entityId, field);
    const session = this.sessions.get(sessionKey);

    if (!session) return [];

    return Array.from(session.users.values()).filter(user => 
      this.currentUser ? user.userId !== this.currentUser.userId : true
    );
  }

  /**
   * Check if entity is being edited by others
   */
  isBeingEdited(entityType: string, entityId: string, field?: string): boolean {
    const users = this.getEditingUsers(entityType, entityId, field);
    return users.length > 0;
  }

  /**
   * Get total number of editors for entity
   */
  getEditorCount(entityType: string, entityId: string, field?: string): number {
    const sessionKey = this.getSessionKey(entityType, entityId, field);
    const session = this.sessions.get(sessionKey);
    return session ? session.users.size : 0;
  }

  /**
   * Subscribe to editing status changes
   */
  subscribe(
    entityType: string,
    entityId: string,
    field: string | undefined,
    listener: EditingIndicatorListener
  ): () => void {
    const sessionKey = this.getSessionKey(entityType, entityId, field);
    
    if (!this.listeners.has(sessionKey)) {
      this.listeners.set(sessionKey, new Set());
    }
    
    this.listeners.get(sessionKey)!.add(listener);

    // Send current state immediately
    const session = this.sessions.get(sessionKey);
    if (session) {
      listener(Array.from(session.users.values()));
    }

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(sessionKey);
      if (listeners) {
        listeners.delete(listener);
        if (listeners.size === 0) {
          this.listeners.delete(sessionKey);
        }
      }
    };
  }

  /**
   * Generate session key
   */
  private getSessionKey(entityType: string, entityId: string, field?: string): string {
    return field ? `${entityType}:${entityId}:${field}` : `${entityType}:${entityId}`;
  }

  /**
   * Start heartbeat for session
   */
  private startHeartbeat(sessionKey: string): void {
    this.stopHeartbeat(sessionKey); // Clear existing

    const interval = setInterval(() => {
      if (this.currentUser) {
        this.currentUser.lastActivity = Date.now();
        this.broadcastHeartbeat(sessionKey);
      }
    }, this.config.heartbeatInterval);

    this.heartbeatIntervals.set(sessionKey, interval);
  }

  /**
   * Stop heartbeat for session
   */
  private stopHeartbeat(sessionKey: string): void {
    const interval = this.heartbeatIntervals.get(sessionKey);
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(sessionKey);
    }
  }

  /**
   * Setup realtime subscription for editing indicators
   */
  private setupRealtimeSubscription(): void {
    // Subscribe to editing_sessions table for real-time updates
    supabaseRealtimeService.subscribeToTable(
      'editing_sessions',
      (payload) => {
        this.handleRealtimeUpdate(payload);
      }
    );
  }

  /**
   * Handle realtime updates from other users
   */
  private handleRealtimeUpdate(payload: any): void {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    switch (eventType) {
      case 'INSERT':
      case 'UPDATE':
        this.handleRemoteEditingStart(newRecord);
        break;
      case 'DELETE':
        this.handleRemoteEditingStop(oldRecord);
        break;
    }
  }

  /**
   * Handle remote user starting to edit
   */
  private handleRemoteEditingStart(record: any): void {
    const sessionKey = this.getSessionKey(record.entity_type, record.entity_id, record.field);
    
    let session = this.sessions.get(sessionKey);
    if (!session) {
      session = {
        entityType: record.entity_type,
        entityId: record.entity_id,
        field: record.field,
        users: new Map(),
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      this.sessions.set(sessionKey, session);
    }

    const user: EditingUser = {
      userId: record.user_id,
      userName: record.user_name,
      userAvatar: record.user_avatar,
      startedAt: new Date(record.started_at).getTime(),
      lastActivity: new Date(record.last_activity).getTime(),
      cursor: record.cursor_field ? {
        field: record.cursor_field,
        position: record.cursor_position
      } : undefined
    };

    session.users.set(user.userId, user);
    session.updatedAt = Date.now();

    this.notifyListeners(sessionKey, session);
  }

  /**
   * Handle remote user stopping editing
   */
  private handleRemoteEditingStop(record: any): void {
    const sessionKey = this.getSessionKey(record.entity_type, record.entity_id, record.field);
    const session = this.sessions.get(sessionKey);

    if (session) {
      session.users.delete(record.user_id);
      session.updatedAt = Date.now();

      if (session.users.size === 0) {
        this.sessions.delete(sessionKey);
        this.notifyListeners(sessionKey, null);
      } else {
        this.notifyListeners(sessionKey, session);
      }
    }
  }

  /**
   * Broadcast editing status to other users
   */
  private broadcastEditingStatus(sessionKey: string, action: 'start' | 'stop'): void {
    if (!this.currentUser) return;

    const [entityType, entityId, field] = sessionKey.split(':');
    
    // This would typically send to your backend/Supabase
    // Implementation depends on your real-time infrastructure
    console.log(`Broadcasting ${action} editing for ${sessionKey}`, this.currentUser);
  }

  /**
   * Broadcast cursor update
   */
  private broadcastCursorUpdate(sessionKey: string): void {
    if (!this.currentUser?.cursor) return;

    console.log(`Broadcasting cursor update for ${sessionKey}`, this.currentUser.cursor);
  }

  /**
   * Broadcast heartbeat
   */
  private broadcastHeartbeat(sessionKey: string): void {
    if (!this.currentUser) return;

    console.log(`Broadcasting heartbeat for ${sessionKey}`, this.currentUser.lastActivity);
  }

  /**
   * Notify listeners of changes
   */
  private notifyListeners(sessionKey: string, session: EditingSession | null): void {
    const listeners = this.listeners.get(sessionKey);
    if (listeners) {
      const users = session ? Array.from(session.users.values()) : [];
      listeners.forEach(listener => listener(users));
    }
  }

  /**
   * Start cleanup timer for expired sessions
   */
  private startCleanupTimer(): void {
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, this.config.sessionTimeout / 2);
  }

  /**
   * Clean up expired editing sessions
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    const expiredSessions: string[] = [];

    this.sessions.forEach((session, sessionKey) => {
      const expiredUsers: string[] = [];

      session.users.forEach((user, userId) => {
        if (now - user.lastActivity > this.config.sessionTimeout) {
          expiredUsers.push(userId);
        }
      });

      // Remove expired users
      expiredUsers.forEach(userId => {
        session.users.delete(userId);
      });

      // Mark session for removal if empty
      if (session.users.size === 0) {
        expiredSessions.push(sessionKey);
      } else if (expiredUsers.length > 0) {
        session.updatedAt = now;
        this.notifyListeners(sessionKey, session);
      }
    });

    // Remove expired sessions
    expiredSessions.forEach(sessionKey => {
      this.sessions.delete(sessionKey);
      this.stopHeartbeat(sessionKey);
      this.notifyListeners(sessionKey, null);
    });
  }

  /**
   * Get all active sessions (for debugging)
   */
  getActiveSessions(): EditingSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Clear all sessions (for cleanup)
   */
  clearAllSessions(): void {
    this.sessions.clear();
    this.heartbeatIntervals.forEach(interval => clearInterval(interval));
    this.heartbeatIntervals.clear();
    this.currentUser = null;
  }
}

export type EditingIndicatorListener = (users: EditingUser[]) => void;

/**
 * Global editing indicators instance
 */
export const userEditingIndicators = new UserEditingIndicators();

/**
 * React hook for editing indicators
 */
export function useEditingIndicators(
  entityType: string,
  entityId: string,
  field?: string
) {
  const [editingUsers, setEditingUsers] = React.useState<EditingUser[]>([]);

  React.useEffect(() => {
    const unsubscribe = userEditingIndicators.subscribe(
      entityType,
      entityId,
      field,
      setEditingUsers
    );

    return unsubscribe;
  }, [entityType, entityId, field]);

  const startEditing = React.useCallback((user: Omit<EditingUser, 'startedAt' | 'lastActivity'>) => {
    userEditingIndicators.startEditing(entityType, entityId, field, user);
  }, [entityType, entityId, field]);

  const stopEditing = React.useCallback(() => {
    userEditingIndicators.stopEditing(entityType, entityId, field);
  }, [entityType, entityId, field]);

  const updateCursor = React.useCallback((cursorField: string, position: number) => {
    userEditingIndicators.updateCursor(entityType, entityId, cursorField, position);
  }, [entityType, entityId]);

  return {
    editingUsers,
    isBeingEdited: editingUsers.length > 0,
    editorCount: editingUsers.length,
    startEditing,
    stopEditing,
    updateCursor
  };
}

// Import React for the hook
import React from 'react';