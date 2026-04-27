'use client';

import { useState, useEffect, useCallback } from 'react';

export type NotificationType =
    | 'sale'
    | 'stock_alert'
    | 'system'
    | 'order'
    | 'customer'
    | 'promotion';

export interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: Date;
    actionUrl?: string;
    metadata?: Record<string, unknown>;
}

interface UseNotificationsOptions {
    autoRefresh?: boolean;
    refreshInterval?: number;
    maxNotifications?: number;
}

export function useNotifications(options: UseNotificationsOptions = {}) {
    // Extraer primitivos — evita que un objeto nuevo en cada render
    // cause loop infinito en useCallback/useEffect
    const autoRefresh = options.autoRefresh ?? true;
    const refreshInterval = options.refreshInterval ?? 30000;
    const maxNotifications = options.maxNotifications ?? 50;

    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchNotifications = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            // TODO: Implementar consulta real a Supabase cuando tengas la tabla
            // const { data, error } = await supabase
            //   .from('notifications')
            //   .select('*')
            //   .order('created_at', { ascending: false })
            //   .limit(maxNotifications);
            // if (error) throw error;
            // setNotifications(data ?? []);

            void maxNotifications; // usado cuando se implemente Supabase
            setNotifications([]);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error fetching notifications');
            console.error('Error fetching notifications:', err);
        } finally {
            setIsLoading(false);
        }
    }, [maxNotifications]);

    const markAsRead = useCallback(async (notificationId: string) => {
        try {
            setNotifications(prev =>
                prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
            );
        } catch (err) {
            console.error('Error marking notification as read:', err);
        }
    }, []);

    const markAllAsRead = useCallback(async () => {
        try {
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        } catch (err) {
            console.error('Error marking all as read:', err);
        }
    }, []);

    const deleteNotification = useCallback(async (notificationId: string) => {
        try {
            setNotifications(prev => prev.filter(n => n.id !== notificationId));
        } catch (err) {
            console.error('Error deleting notification:', err);
        }
    }, []);

    const clearAll = useCallback(async () => {
        try {
            setNotifications([]);
        } catch (err) {
            console.error('Error clearing notifications:', err);
        }
    }, []);

    // Initial fetch
    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // Auto-refresh — usa primitivos, no el objeto options
    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(fetchNotifications, refreshInterval);
        return () => clearInterval(interval);
    }, [autoRefresh, refreshInterval, fetchNotifications]);

    const unreadCount = notifications.filter(n => !n.isRead).length;
    const hasUnread = unreadCount > 0;

    const byType = notifications.reduce((acc, notif) => {
        if (!acc[notif.type]) acc[notif.type] = [];
        acc[notif.type].push(notif);
        return acc;
    }, {} as Record<NotificationType, Notification[]>);

    return {
        notifications,
        unreadCount,
        hasUnread,
        byType,
        isLoading,
        error,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAll,
        refresh: fetchNotifications,
    };
}
