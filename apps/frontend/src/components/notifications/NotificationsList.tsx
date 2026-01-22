'use client';

import React from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    Bell,
    ShoppingCart,
    AlertTriangle,
    Settings,
    Package,
    Users,
    Tag,
    X,
    Check,
    Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Notification, NotificationType } from '@/hooks/use-notifications';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

const typeIcons: Record<NotificationType, any> = {
    sale: ShoppingCart,
    stock_alert: AlertTriangle,
    system: Settings,
    order: Package,
    customer: Users,
    promotion: Tag
};

const typeColors: Record<NotificationType, string> = {
    sale: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20',
    stock_alert: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20',
    system: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20',
    order: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20',
    customer: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20',
    promotion: 'text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-900/20'
};

interface NotificationItemProps {
    notification: Notification;
    onMarkAsRead: (id: string) => void;
    onDelete: (id: string) => void;
    onClose: () => void;
}

const NotificationItem = React.memo<NotificationItemProps>(({
    notification,
    onMarkAsRead,
    onDelete,
    onClose
}) => {
    const Icon = typeIcons[notification.type];
    const colorClass = typeColors[notification.type];

    const timeAgo = formatDistanceToNow(notification.createdAt, {
        addSuffix: true,
        locale: es
    });

    const handleClick = () => {
        if (!notification.isRead) {
            onMarkAsRead(notification.id);
        }
        onClose();
    };

    const content = (
        <div
            className={cn(
                "group relative flex gap-3 p-3 rounded-lg transition-colors",
                notification.isRead
                    ? "bg-transparent hover:bg-muted/50"
                    : "bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            )}
        >
            {/* Icon */}
            <div className={cn(
                "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
                colorClass
            )}>
                <Icon className="w-5 h-5" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                        <p className={cn(
                            "text-sm font-medium",
                            !notification.isRead && "font-semibold"
                        )}>
                            {notification.title}
                        </p>
                        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                            {notification.message}
                        </p>
                    </div>

                    {/* Unread indicator */}
                    {!notification.isRead && (
                        <div className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400" />
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">
                        {timeAgo}
                    </span>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!notification.isRead && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onMarkAsRead(notification.id);
                                }}
                            >
                                <Check className="w-3 h-3 mr-1" />
                                <span className="text-xs">Marcar leído</span>
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onDelete(notification.id);
                            }}
                        >
                            <Trash2 className="w-3 h-3" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );

    if (notification.actionUrl) {
        return (
            <Link
                href={notification.actionUrl}
                onClick={handleClick}
                className="block hover:no-underline"
            >
                {content}
            </Link>
        );
    }

    return <div>{content}</div>;
});

NotificationItem.displayName = 'NotificationItem';

interface NotificationsListProps {
    notifications: Notification[];
    isLoading: boolean;
    unreadCount: number;
    onMarkAsRead: (id: string) => void;
    onMarkAllAsRead: () => void;
    onDelete: (id: string) => void;
    onClearAll: () => void;
    onClose: () => void;
}

export function NotificationsList({
    notifications,
    isLoading,
    unreadCount,
    onMarkAsRead,
    onMarkAllAsRead,
    onDelete,
    onClearAll,
    onClose
}: NotificationsListProps) {
    if (isLoading) {
        return (
            <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Cargando notificaciones...</p>
            </div>
        );
    }

    if (notifications.length === 0) {
        return (
            <div className="p-8 text-center">
                <Bell className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm font-medium text-foreground mb-1">
                    No hay notificaciones
                </p>
                <p className="text-xs text-muted-foreground">
                    Te avisaremos cuando haya algo nuevo
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col max-h-[500px]">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2">
                    <h3 className="font-semibold">Notificaciones</h3>
                    {unreadCount > 0 && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-blue-600 text-white rounded-full">
                            {unreadCount}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1">
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onMarkAllAsRead}
                            className="text-xs"
                        >
                            <Check className="w-3 h-3 mr-1" />
                            Marcar todas
                        </Button>
                    )}
                    {notifications.length > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClearAll}
                            className="text-xs text-muted-foreground"
                        >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Limpiar
                        </Button>
                    )}
                </div>
            </div>

            {/* List */}
            <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                    {notifications.map((notification) => (
                        <NotificationItem
                            key={notification.id}
                            notification={notification}
                            onMarkAsRead={onMarkAsRead}
                            onDelete={onDelete}
                            onClose={onClose}
                        />
                    ))}
                </div>
            </ScrollArea>

            {/* Footer */}
            <div className="p-3 border-t bg-muted/30">
                <Link
                    href="/dashboard/notifications"
                    onClick={onClose}
                    className="block text-center text-sm text-primary hover:underline"
                >
                    Ver todas las notificaciones →
                </Link>
            </div>
        </div>
    );
}
