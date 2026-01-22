/**
 * Push Notifications System
 * Provides native push notifications for critical updates and system events
 */

import { EventEmitter } from 'events';
import React, { useState } from 'react';

// Types and Interfaces
export type NotificationPriority = 'low' | 'normal' | 'high' | 'critical';
export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'sync' | 'inventory' | 'sales' | 'system';
export type NotificationAction = 'view' | 'dismiss' | 'snooze' | 'acknowledge' | 'custom';

export interface PushNotificationConfig {
  enabled: boolean;
  vapidPublicKey: string;
  serviceWorkerPath: string;
  permissions: {
    requestOnLoad: boolean;
    showPrompt: boolean;
    fallbackToInApp: boolean;
  };
  categories: {
    [key in NotificationType]: {
      enabled: boolean;
      priority: NotificationPriority;
      sound: boolean;
      vibrate: boolean;
      badge: boolean;
      requireInteraction: boolean;
    };
  };
  scheduling: {
    quietHours: {
      enabled: boolean;
      start: string; // HH:MM format
      end: string;   // HH:MM format
    };
    batchDelay: number; // ms to batch similar notifications
    maxPerHour: number;
  };
}

export interface NotificationPayload {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  data?: Record<string, any>;
  actions?: NotificationActionButton[];
  timestamp: Date;
  expiresAt?: Date;
  requireInteraction?: boolean;
  silent?: boolean;
  vibrate?: number[];
  sound?: string;
}

export interface NotificationActionButton {
  action: string;
  title: string;
  icon?: string;
}

export interface NotificationSubscription {
  id: string;
  userId: string;
  deviceId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent: string;
  createdAt: Date;
  lastUsed: Date;
  active: boolean;
}

export interface NotificationStats {
  sent: number;
  delivered: number;
  clicked: number;
  dismissed: number;
  failed: number;
  subscriptions: number;
  categories: Record<NotificationType, {
    sent: number;
    clicked: number;
    dismissed: number;
  }>;
}

export interface NotificationHistory {
  id: string;
  notification: NotificationPayload;
  status: 'pending' | 'sent' | 'delivered' | 'clicked' | 'dismissed' | 'failed';
  sentAt?: Date;
  deliveredAt?: Date;
  interactedAt?: Date;
  error?: string;
}

// Push Notifications Service
export class PushNotificationService extends EventEmitter {
  private config: PushNotificationConfig;
  private registration: ServiceWorkerRegistration | null = null;
  private subscription: PushSubscription | null = null;
  private notificationQueue: NotificationPayload[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private history: Map<string, NotificationHistory> = new Map();
  private stats: NotificationStats;

  constructor(config: PushNotificationConfig) {
    super();
    this.config = config;
    this.stats = this.initializeStats();
    this.initialize();
  }

  // Initialization
  async initialize(): Promise<void> {
    if (!this.isSupported()) {
      console.warn('Push notifications are not supported in this browser');
      return;
    }

    try {
      // Register service worker
      await this.registerServiceWorker();
      
      // Request permissions if configured
      if (this.config.permissions.requestOnLoad) {
        await this.requestPermission();
      }

      // Setup message handlers
      this.setupMessageHandlers();
      
      // Load existing subscription
      await this.loadSubscription();

      this.emit('initialized');
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
      this.emit('error', error);
    }
  }

  // Permission Management
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      throw new Error('Push notifications are not supported');
    }

    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      await this.subscribe();
      this.emit('permissionGranted');
    } else if (permission === 'denied') {
      this.emit('permissionDenied');
    }

    return permission;
  }

  getPermissionStatus(): NotificationPermission {
    return Notification.permission;
  }

  isSupported(): boolean {
    return 'serviceWorker' in navigator && 
           'PushManager' in window && 
           'Notification' in window;
  }

  // Subscription Management
  async subscribe(): Promise<PushSubscription | null> {
    if (!this.registration) {
      throw new Error('Service worker not registered');
    }

    if (Notification.permission !== 'granted') {
      throw new Error('Notification permission not granted');
    }

    try {
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: (this.urlBase64ToUint8Array(this.config.vapidPublicKey) as unknown as BufferSource)
      });

      this.subscription = subscription;
      await this.saveSubscription(subscription);
      
      this.emit('subscribed', subscription);
      return subscription;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      this.emit('subscriptionError', error);
      throw error;
    }
  }

  async unsubscribe(): Promise<void> {
    if (this.subscription) {
      await this.subscription.unsubscribe();
      await this.removeSubscription();
      this.subscription = null;
      this.emit('unsubscribed');
    }
  }

  getSubscription(): PushSubscription | null {
    return this.subscription;
  }

  // Notification Sending
  async sendNotification(payload: Omit<NotificationPayload, 'id' | 'timestamp'>): Promise<string> {
    const notification: NotificationPayload = {
      ...payload,
      id: this.generateId(),
      timestamp: new Date()
    };

    // Check if notifications are enabled for this type
    if (!this.config.categories[notification.type]?.enabled) {
      console.log(`Notifications disabled for type: ${notification.type}`);
      return notification.id;
    }

    // Check quiet hours
    if (this.isQuietHours()) {
      console.log('Notifications suppressed during quiet hours');
      return notification.id;
    }

    // Check rate limiting
    if (this.isRateLimited()) {
      console.log('Notification rate limit exceeded');
      return notification.id;
    }

    // Add to history
    const historyEntry: NotificationHistory = {
      id: notification.id,
      notification,
      status: 'pending'
    };
    this.history.set(notification.id, historyEntry);

    // Queue for batching or send immediately
    if (this.config.scheduling.batchDelay > 0) {
      this.queueNotification(notification);
    } else {
      await this.deliverNotification(notification);
    }

    return notification.id;
  }

  async sendBulkNotifications(payloads: Omit<NotificationPayload, 'id' | 'timestamp'>[]): Promise<string[]> {
    const ids: string[] = [];
    
    for (const payload of payloads) {
      const id = await this.sendNotification(payload);
      ids.push(id);
    }

    return ids;
  }

  // Predefined notification types
  async notifyLowStock(productName: string, currentStock: number, minStock: number): Promise<string> {
    return this.sendNotification({
      type: 'inventory',
      priority: 'high',
      title: 'Low Stock Alert',
      body: `${productName} is running low (${currentStock}/${minStock})`,
      icon: '/icons/inventory-warning.png',
      tag: `low-stock-${productName}`,
      data: { productName, currentStock, minStock },
      actions: [
        { action: 'view', title: 'View Product', icon: '/icons/view.png' },
        { action: 'reorder', title: 'Reorder', icon: '/icons/cart.png' }
      ]
    });
  }

  async notifyNewSale(saleAmount: number, customerName?: string): Promise<string> {
    return this.sendNotification({
      type: 'sales',
      priority: 'normal',
      title: 'New Sale',
      body: `Sale completed: $${saleAmount.toFixed(2)}${customerName ? ` for ${customerName}` : ''}`,
      icon: '/icons/sale-success.png',
      tag: 'new-sale',
      data: { saleAmount, customerName },
      actions: [
        { action: 'view', title: 'View Sale', icon: '/icons/view.png' }
      ]
    });
  }

  async notifySyncError(systemName: string, error: string): Promise<string> {
    return this.sendNotification({
      type: 'sync',
      priority: 'high',
      title: 'Sync Error',
      body: `Failed to sync with ${systemName}: ${error}`,
      icon: '/icons/sync-error.png',
      tag: `sync-error-${systemName}`,
      requireInteraction: true,
      data: { systemName, error },
      actions: [
        { action: 'retry', title: 'Retry Sync', icon: '/icons/retry.png' },
        { action: 'view', title: 'View Details', icon: '/icons/view.png' }
      ]
    });
  }

  async notifySystemAlert(message: string, severity: 'warning' | 'error' = 'warning'): Promise<string> {
    return this.sendNotification({
      type: 'system',
      priority: severity === 'error' ? 'critical' : 'high',
      title: 'System Alert',
      body: message,
      icon: severity === 'error' ? '/icons/error.png' : '/icons/warning.png',
      tag: 'system-alert',
      requireInteraction: severity === 'error',
      data: { severity, message },
      actions: [
        { action: 'acknowledge', title: 'Acknowledge', icon: '/icons/check.png' }
      ]
    });
  }

  // Configuration Management
  updateConfig(updates: Partial<PushNotificationConfig>): void {
    this.config = { ...this.config, ...updates };
    this.emit('configUpdated', this.config);
  }

  getConfig(): PushNotificationConfig {
    return { ...this.config };
  }

  // Statistics and History
  getStats(): NotificationStats {
    return { ...this.stats };
  }

  getHistory(limit = 100): NotificationHistory[] {
    return Array.from(this.history.values())
      .sort((a, b) => b.notification.timestamp.getTime() - a.notification.timestamp.getTime())
      .slice(0, limit);
  }

  clearHistory(): void {
    this.history.clear();
    this.emit('historyCleared');
  }

  // Private Methods
  private async registerServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      this.registration = await navigator.serviceWorker.register(this.config.serviceWorkerPath);
      
      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
      
      console.log('Service worker registered successfully');
    }
  }

  private setupMessageHandlers(): void {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        const { type, data } = event.data;
        
        switch (type) {
          case 'notificationClick':
            this.handleNotificationClick(data);
            break;
          case 'notificationClose':
            this.handleNotificationClose(data);
            break;
          default:
            console.log('Unknown service worker message:', type, data);
        }
      });
    }
  }

  private handleNotificationClick(data: any): void {
    const { notificationId, action } = data;
    const historyEntry = this.history.get(notificationId);
    
    if (historyEntry) {
      historyEntry.status = 'clicked';
      historyEntry.interactedAt = new Date();
      this.stats.clicked++;
      this.stats.categories[historyEntry.notification.type].clicked++;
    }

    this.emit('notificationClick', { notificationId, action, data });
  }

  private handleNotificationClose(data: any): void {
    const { notificationId } = data;
    const historyEntry = this.history.get(notificationId);
    
    if (historyEntry && historyEntry.status !== 'clicked') {
      historyEntry.status = 'dismissed';
      historyEntry.interactedAt = new Date();
      this.stats.dismissed++;
      this.stats.categories[historyEntry.notification.type].dismissed++;
    }

    this.emit('notificationClose', { notificationId, data });
  }

  private queueNotification(notification: NotificationPayload): void {
    this.notificationQueue.push(notification);
    
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    this.batchTimer = setTimeout(() => {
      this.processBatchedNotifications();
    }, this.config.scheduling.batchDelay);
  }

  private async processBatchedNotifications(): Promise<void> {
    if (this.notificationQueue.length === 0) return;

    const notifications = [...this.notificationQueue];
    this.notificationQueue = [];

    // Group by type and tag for batching
    const grouped = this.groupNotifications(notifications);
    
    for (const group of grouped) {
      if (group.length === 1) {
        await this.deliverNotification(group[0]);
      } else {
        await this.deliverBatchedNotification(group);
      }
    }
  }

  private groupNotifications(notifications: NotificationPayload[]): NotificationPayload[][] {
    const groups: Map<string, NotificationPayload[]> = new Map();
    
    for (const notification of notifications) {
      const key = `${notification.type}-${notification.tag || 'default'}`;
      const group = groups.get(key) || [];
      group.push(notification);
      groups.set(key, group);
    }
    
    return Array.from(groups.values());
  }

  private async deliverBatchedNotification(notifications: NotificationPayload[]): Promise<void> {
    const first = notifications[0];
    const count = notifications.length;
    
    const batchedNotification: NotificationPayload = {
      ...first,
      id: this.generateId(),
      title: `${count} ${first.type} notifications`,
      body: `You have ${count} new ${first.type} notifications`,
      data: {
        ...first.data,
        batched: true,
        notifications: notifications.map(n => n.id)
      }
    };

    await this.deliverNotification(batchedNotification);
  }

  private async deliverNotification(notification: NotificationPayload): Promise<void> {
    try {
      const historyEntry = this.history.get(notification.id);
      if (historyEntry) {
        historyEntry.status = 'sent';
        historyEntry.sentAt = new Date();
      }

      if (this.subscription) {
        // Send via service worker for background delivery
        await this.sendPushMessage(notification);
      } else if (this.config.permissions.fallbackToInApp) {
        // Fallback to in-app notification
        await this.showInAppNotification(notification);
      }

      this.stats.sent++;
      this.stats.categories[notification.type].sent++;
      
      this.emit('notificationSent', notification);
    } catch (error) {
      console.error('Failed to deliver notification:', error);
      
      const historyEntry = this.history.get(notification.id);
      if (historyEntry) {
        historyEntry.status = 'failed';
        historyEntry.error = error instanceof Error ? error.message : 'Unknown error';
      }

      this.stats.failed++;
      this.emit('notificationError', { notification, error });
    }
  }

  private async sendPushMessage(notification: NotificationPayload): Promise<void> {
    // This would typically send to your backend server
    // which then sends the push message to the browser
    const response = await fetch('/api/notifications/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subscription: this.subscription,
        notification
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to send push notification: ${response.statusText}`);
    }
  }

  private async showInAppNotification(notification: NotificationPayload): Promise<void> {
    if (Notification.permission === 'granted') {
      const options: NotificationOptions = {
        body: notification.body,
        icon: notification.icon,
        badge: notification.badge,
        tag: notification.tag,
        data: notification.data,
        requireInteraction: notification.requireInteraction,
        silent: notification.silent
      };

      const nativeNotification = new Notification(notification.title, options);
      
      nativeNotification.onclick = () => {
        this.handleNotificationClick({
          notificationId: notification.id,
          action: 'click'
        });
      };

      nativeNotification.onclose = () => {
        this.handleNotificationClose({
          notificationId: notification.id
        });
      };
    }
  }

  private isQuietHours(): boolean {
    if (!this.config.scheduling.quietHours.enabled) return false;

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const { start, end } = this.config.scheduling.quietHours;
    
    if (start <= end) {
      return currentTime >= start && currentTime <= end;
    } else {
      // Quiet hours span midnight
      return currentTime >= start || currentTime <= end;
    }
  }

  private isRateLimited(): boolean {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentNotifications = Array.from(this.history.values())
      .filter(entry => entry.sentAt && entry.sentAt > oneHourAgo);
    
    return recentNotifications.length >= this.config.scheduling.maxPerHour;
  }

  private async loadSubscription(): Promise<void> {
    if (this.registration) {
      this.subscription = await this.registration.pushManager.getSubscription();
    }
  }

  private async saveSubscription(subscription: PushSubscription): Promise<void> {
    // Save subscription to backend
    await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subscription: subscription.toJSON()
      })
    });
  }

  private async removeSubscription(): Promise<void> {
    // Remove subscription from backend
    if (this.subscription) {
      await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          endpoint: this.subscription.endpoint
        })
      });
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  private initializeStats(): NotificationStats {
    return {
      sent: 0,
      delivered: 0,
      clicked: 0,
      dismissed: 0,
      failed: 0,
      subscriptions: 0,
      categories: {
        info: { sent: 0, clicked: 0, dismissed: 0 },
        success: { sent: 0, clicked: 0, dismissed: 0 },
        warning: { sent: 0, clicked: 0, dismissed: 0 },
        error: { sent: 0, clicked: 0, dismissed: 0 },
        sync: { sent: 0, clicked: 0, dismissed: 0 },
        inventory: { sent: 0, clicked: 0, dismissed: 0 },
        sales: { sent: 0, clicked: 0, dismissed: 0 },
        system: { sent: 0, clicked: 0, dismissed: 0 }
      }
    };
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}

// React Hook
export function usePushNotifications(config: PushNotificationConfig) {
  const [service] = useState(() => new PushNotificationService(config));
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [stats, setStats] = useState<NotificationStats>(service.getStats());

  React.useEffect(() => {
    const updatePermission = () => setPermission(service.getPermissionStatus());
    const updateSubscription = () => setSubscription(service.getSubscription());
    const updateStats = () => setStats(service.getStats());

    // Initial state
    updatePermission();
    updateSubscription();
    updateStats();

    // Event listeners
    service.on('permissionGranted', updatePermission);
    service.on('permissionDenied', updatePermission);
    service.on('subscribed', updateSubscription);
    service.on('unsubscribed', updateSubscription);
    service.on('notificationSent', updateStats);
    service.on('notificationClick', updateStats);
    service.on('notificationClose', updateStats);

    return () => {
      service.removeAllListeners();
    };
  }, [service]);

  return {
    service,
    permission,
    subscription,
    stats,
    isSupported: service.isSupported(),
    requestPermission: () => service.requestPermission(),
    subscribe: () => service.subscribe(),
    unsubscribe: () => service.unsubscribe(),
    sendNotification: (payload: Omit<NotificationPayload, 'id' | 'timestamp'>) => 
      service.sendNotification(payload),
    notifyLowStock: (productName: string, currentStock: number, minStock: number) =>
      service.notifyLowStock(productName, currentStock, minStock),
    notifyNewSale: (saleAmount: number, customerName?: string) =>
      service.notifyNewSale(saleAmount, customerName),
    notifySyncError: (systemName: string, error: string) =>
      service.notifySyncError(systemName, error),
    notifySystemAlert: (message: string, severity?: 'warning' | 'error') =>
      service.notifySystemAlert(message, severity),
    updateConfig: (updates: Partial<PushNotificationConfig>) => service.updateConfig(updates),
    getHistory: (limit?: number) => service.getHistory(limit),
    clearHistory: () => service.clearHistory()
  };
}

// Default configuration
export const defaultPushNotificationConfig: PushNotificationConfig = {
  enabled: true,
  vapidPublicKey: '', // Should be set from environment
  serviceWorkerPath: '/sw.js',
  permissions: {
    requestOnLoad: false,
    showPrompt: true,
    fallbackToInApp: true
  },
  categories: {
    info: { enabled: true, priority: 'normal', sound: false, vibrate: false, badge: true, requireInteraction: false },
    success: { enabled: true, priority: 'normal', sound: true, vibrate: false, badge: true, requireInteraction: false },
    warning: { enabled: true, priority: 'high', sound: true, vibrate: true, badge: true, requireInteraction: false },
    error: { enabled: true, priority: 'critical', sound: true, vibrate: true, badge: true, requireInteraction: true },
    sync: { enabled: true, priority: 'normal', sound: false, vibrate: false, badge: true, requireInteraction: false },
    inventory: { enabled: true, priority: 'high', sound: true, vibrate: true, badge: true, requireInteraction: false },
    sales: { enabled: true, priority: 'normal', sound: true, vibrate: false, badge: true, requireInteraction: false },
    system: { enabled: true, priority: 'critical', sound: true, vibrate: true, badge: true, requireInteraction: true }
  },
  scheduling: {
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00'
    },
    batchDelay: 5000, // 5 seconds
    maxPerHour: 50
  }
};

// Default instance
export const pushNotificationService = new PushNotificationService(defaultPushNotificationConfig);