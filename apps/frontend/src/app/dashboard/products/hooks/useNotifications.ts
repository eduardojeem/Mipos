'use client';

import { useState, useEffect, useCallback } from 'react';
import NotificationService, { 
  type ProductNotification, 
  type NotificationSettings 
} from '../services/NotificationService';

interface UseNotificationsReturn {
  notifications: ProductNotification[];
  unreadCount: number;
  settings: NotificationSettings;
  loading: boolean;
  
  // Actions
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAllNotifications: () => void;
  updateSettings: (settings: Partial<NotificationSettings>) => void;
  
  // Computed
  hasUnread: boolean;
  recentNotifications: ProductNotification[];
  criticalNotifications: ProductNotification[];
}

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<ProductNotification[]>([]);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const notificationService = NotificationService.getInstance();

  // Initialize and subscribe to notifications
  useEffect(() => {
    // Load initial data
    const initialNotifications = notificationService.getNotifications();
    const initialSettings = notificationService.getSettings();
    
    setNotifications(initialNotifications);
    setSettings(initialSettings);
    setLoading(false);

    // Subscribe to real-time updates
    const unsubscribe = notificationService.subscribe((updatedNotifications) => {
      setNotifications(updatedNotifications);
    });

    return unsubscribe;
  }, []);

  // Actions
  const markAsRead = useCallback((id: string) => {
    notificationService.markAsRead(id);
  }, []);

  const markAllAsRead = useCallback(() => {
    notificationService.markAllAsRead();
  }, []);

  const deleteNotification = useCallback((id: string) => {
    notificationService.deleteNotification(id);
  }, []);

  const clearAllNotifications = useCallback(() => {
    notificationService.clearAllNotifications();
  }, []);

  const updateSettings = useCallback((newSettings: Partial<NotificationSettings>) => {
    notificationService.updateSettings(newSettings);
    setSettings(notificationService.getSettings());
  }, []);

  // Computed values
  const unreadCount = notifications.filter(n => !n.read).length;
  const hasUnread = unreadCount > 0;
  
  const recentNotifications = notifications
    .filter(n => {
      const hoursSinceCreated = (Date.now() - n.timestamp.getTime()) / (1000 * 60 * 60);
      return hoursSinceCreated <= 24; // Last 24 hours
    })
    .slice(0, 10);

  const criticalNotifications = notifications.filter(n => 
    n.severity === 'error' && !n.read
  );

  return {
    notifications,
    unreadCount,
    settings: settings || notificationService.getSettings(),
    loading,
    
    // Actions
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    updateSettings,
    
    // Computed
    hasUnread,
    recentNotifications,
    criticalNotifications
  };
}

// Hook for adding notifications from components
export function useNotificationActions() {
  const notificationService = NotificationService.getInstance();

  const addNotification = useCallback((
    notification: Omit<ProductNotification, 'id' | 'timestamp' | 'read'>
  ) => {
    notificationService.addNotification(notification);
  }, []);

  const addStockAlert = useCallback((productId: string, productName: string, stock: number) => {
    addNotification({
      type: 'stock_low',
      severity: 'warning',
      title: 'Stock Bajo',
      message: `${productName} tiene solo ${stock} unidades disponibles`,
      productId,
      productName,
      actions: [
        {
          id: 'restock',
          label: 'Reabastecer',
          action: () => {
            // Navigate to restock page or open dialog
            console.log('Restock product:', productId);
          }
        }
      ]
    });
  }, [addNotification]);

  const addOutOfStockAlert = useCallback((productId: string, productName: string) => {
    addNotification({
      type: 'stock_out',
      severity: 'error',
      title: 'Sin Stock',
      message: `${productName} está completamente sin stock`,
      productId,
      productName,
      actions: [
        {
          id: 'restock',
          label: 'Reabastecer Urgente',
          action: () => {
            console.log('Urgent restock:', productId);
          },
          variant: 'destructive'
        }
      ]
    });
  }, [addNotification]);

  const addPriceChangeAlert = useCallback((
    productId: string, 
    productName: string, 
    oldPrice: number, 
    newPrice: number
  ) => {
    addNotification({
      type: 'price_change',
      severity: 'info',
      title: 'Cambio de Precio',
      message: `${productName}: $${oldPrice.toLocaleString()} → $${newPrice.toLocaleString()}`,
      productId,
      productName
    });
  }, [addNotification]);

  const addNewProductAlert = useCallback((productId: string, productName: string) => {
    addNotification({
      type: 'new_product',
      severity: 'success',
      title: 'Nuevo Producto',
      message: `${productName} ha sido agregado al catálogo`,
      productId,
      productName
    });
  }, [addNotification]);

  return {
    addNotification,
    addStockAlert,
    addOutOfStockAlert,
    addPriceChangeAlert,
    addNewProductAlert
  };
}

// Hook for notification settings management
export function useNotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const notificationService = NotificationService.getInstance();

  useEffect(() => {
    const currentSettings = notificationService.getSettings();
    setSettings(currentSettings);
    setLoading(false);
  }, []);

  const updateSettings = useCallback((newSettings: Partial<NotificationSettings>) => {
    notificationService.updateSettings(newSettings);
    setSettings(notificationService.getSettings());
  }, []);

  const resetToDefaults = useCallback(() => {
    const defaultSettings = {
      stockLowThreshold: 5,
      enableStockAlerts: true,
      enablePriceAlerts: true,
      enableNewProductAlerts: true,
      emailNotifications: false,
      pushNotifications: true,
      soundEnabled: true
    };
    updateSettings(defaultSettings);
  }, [updateSettings]);

  return {
    settings: settings || notificationService.getSettings(),
    loading,
    updateSettings,
    resetToDefaults
  };
}