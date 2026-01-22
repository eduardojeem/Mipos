'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

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
    metadata?: Record<string, any>;
}

interface UseNotificationsOptions {
    autoRefresh?: boolean;
    refreshInterval?: number;
    maxNotifications?: number;
}

const defaultOptions: UseNotificationsOptions = {
    autoRefresh: true,
    refreshInterval: 30000, // 30 segundos
    maxNotifications: 50
};

// Mock notifications for demo (se reemplazará con Supabase real)
const mockNotifications: Notification[] = [
    {
        id: '1',
        type: 'sale',
        title: 'Nueva venta registrada',
        message: 'Venta #12345 por $125.50',
        isRead: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 5), // 5 min ago
        actionUrl: '/dashboard/sales/12345'
    },
    {
        id: '2',
        type: 'stock_alert',
        title: 'Alerta de stock bajo',
        message: 'Producto "Lápiz Labial Rojo" tiene solo 3 unidades',
        isRead: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 15), // 15 min ago
        actionUrl: '/dashboard/products?filter=low-stock'
    },
    {
        id: '3',
        type: 'system',
        title: 'Actualización disponible',
        message: 'Nueva versión del sistema disponible',
        isRead: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
        actionUrl: '/dashboard/settings'
    }
];

export function useNotifications(options: UseNotificationsOptions = {}) {
    const opts = useMemo(() => ({ ...defaultOptions, ...options }), [options]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch notifications
    const fetchNotifications = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            // TODO: Implementar consulta real a Supabase cuando tengas la tabla
            // const { data, error } = await supabase
            //   .from('notifications')
            //   .select('*')
            //   .order('created_at', { ascending: false })
            //   .limit(opts.maxNotifications);

            // if (error) throw error;

            // Por ahora usar mock data
            await new Promise(resolve => setTimeout(resolve, 500)); // Simular latencia
            setNotifications(mockNotifications);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error fetching notifications');
            console.error('Error fetching notifications:', err);
        } finally {
            setIsLoading(false);
        }
    }, [opts]);

    // Mark notification as read
    const markAsRead = useCallback(async (notificationId: string) => {
        try {
            // TODO: Actualizar en Supabase
            // await supabase
            //   .from('notifications')
            //   .update({ is_read: true })
            //   .eq('id', notificationId);

            // Actualizar estado local
            setNotifications(prev =>
                prev.map(notif =>
                    notif.id === notificationId
                        ? { ...notif, isRead: true }
                        : notif
                )
            );
        } catch (err) {
            console.error('Error marking notification as read:', err);
        }
    }, []);

    // Mark all as read
    const markAllAsRead = useCallback(async () => {
        try {
            const unreadIds = notifications
                .filter(n => !n.isRead)
                .map(n => n.id);

            if (unreadIds.length === 0) return;

            // TODO: Actualizar en Supabase
            // await supabase
            //   .from('notifications')
            //   .update({ is_read: true })
            //   .in('id', unreadIds);

            // Actualizar estado local
            setNotifications(prev =>
                prev.map(notif => ({ ...notif, isRead: true }))
            );
        } catch (err) {
            console.error('Error marking all as read:', err);
        }
    }, [notifications]);

    // Delete notification
    const deleteNotification = useCallback(async (notificationId: string) => {
        try {
            // TODO: Eliminar en Supabase
            // await supabase
            //   .from('notifications')
            //   .delete()
            //   .eq('id', notificationId);

            // Actualizar estado local
            setNotifications(prev =>
                prev.filter(notif => notif.id !== notificationId)
            );
        } catch (err) {
            console.error('Error deleting notification:', err);
        }
    }, []);

    // Clear all notifications
    const clearAll = useCallback(async () => {
        try {
            // TODO: Eliminar en Supabase
            // await supabase
            //   .from('notifications')
            //   .delete()
            //   .neq('id', ''); // Delete all

            // Actualizar estado local
            setNotifications([]);
        } catch (err) {
            console.error('Error clearing notifications:', err);
        }
    }, []);

    // Initial fetch
    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // Auto-refresh
    useEffect(() => {
        if (!opts.autoRefresh) return;

        const interval = setInterval(() => {
            fetchNotifications();
        }, opts.refreshInterval);

        return () => clearInterval(interval);
    }, [opts.autoRefresh, opts.refreshInterval, fetchNotifications]);

    // Realtime subscription (cuando tengas tabla en Supabase)
    useEffect(() => {
        // TODO: Suscribirse a cambios en tiempo real
        // const subscription = supabase
        //   .channel('notifications')
        //   .on('postgres_changes', {
        //     event: '*',
        //     schema: 'public',
        //     table: 'notifications'
        //   }, (payload) => {
        //     if (payload.eventType === 'INSERT') {
        //       setNotifications(prev => [payload.new as Notification, ...prev]);
        //     } else if (payload.eventType === 'UPDATE') {
        //       setNotifications(prev => 
        //         prev.map(n => n.id === payload.new.id ? payload.new as Notification : n)
        //       );
        //     } else if (payload.eventType === 'DELETE') {
        //       setNotifications(prev => 
        //         prev.filter(n => n.id !== payload.old.id)
        //       );
        //     }
        //   })
        //   .subscribe();

        // return () => {
        //   subscription.unsubscribe();
        // };
    }, []);

    // Calculate counts
    const unreadCount = notifications.filter(n => !n.isRead).length;
    const hasUnread = unreadCount > 0;

    // Group by type
    const byType = notifications.reduce((acc, notif) => {
        if (!acc[notif.type]) {
            acc[notif.type] = [];
        }
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
        refresh: fetchNotifications
    };
}
