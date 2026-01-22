'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  X, 
  Check, 
  AlertTriangle, 
  Info, 
  CheckCircle, 
  XCircle,
  Settings,
  Volume2,
  VolumeX,
  Filter,
  Archive,
  Trash2,
  Clock,
  User,
  Package,
  DollarSign,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  category: 'sales' | 'inventory' | 'system' | 'user' | 'general';
  timestamp: Date;
  read: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  actions?: NotificationAction[];
  data?: any;
}

export interface NotificationAction {
  id: string;
  label: string;
  action: () => void;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary';
}

interface NotificationSystemProps {
  className?: string;
  maxNotifications?: number;
  autoHideDelay?: number;
  enableSound?: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

// Mock notifications for demonstration
const mockNotifications: Notification[] = [
  {
    id: '1',
    title: 'Stock Bajo',
    message: 'El producto "Labial Rojo Mate" tiene solo 5 unidades restantes',
    type: 'warning',
    category: 'inventory',
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    read: false,
    priority: 'high',
    actions: [
      {
        id: 'reorder',
        label: 'Reabastecer',
        action: () => console.log('Reordering product'),
        variant: 'default'
      },
      {
        id: 'dismiss',
        label: 'Descartar',
        action: () => console.log('Dismissing notification'),
        variant: 'outline'
      }
    ]
  },
  {
    id: '2',
    title: 'Nueva Venta',
    message: 'Venta completada por $125.50 - Cliente: María García',
    type: 'success',
    category: 'sales',
    timestamp: new Date(Date.now() - 10 * 60 * 1000),
    read: false,
    priority: 'medium'
  },
  {
    id: '3',
    title: 'Actualización del Sistema',
    message: 'Nueva versión disponible con mejoras de rendimiento',
    type: 'info',
    category: 'system',
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
    read: true,
    priority: 'low'
  },
  {
    id: '4',
    title: 'Error de Conexión',
    message: 'Problema temporal con la conexión a la base de datos',
    type: 'error',
    category: 'system',
    timestamp: new Date(Date.now() - 2 * 60 * 1000),
    read: false,
    priority: 'urgent',
    actions: [
      {
        id: 'retry',
        label: 'Reintentar',
        action: () => console.log('Retrying connection'),
        variant: 'default'
      }
    ]
  }
];

const NotificationIcon = ({ type }: { type: Notification['type'] }) => {
  const iconMap = {
    info: Info,
    success: CheckCircle,
    warning: AlertTriangle,
    error: XCircle
  };
  
  const Icon = iconMap[type];
  return <Icon className="w-5 h-5" />;
};

const CategoryIcon = ({ category }: { category: Notification['category'] }) => {
  const iconMap = {
    sales: DollarSign,
    inventory: Package,
    system: Settings,
    user: User,
    general: Bell
  };
  
  const Icon = iconMap[category];
  return <Icon className="w-4 h-4" />;
};

const NotificationItem = ({ 
  notification, 
  onMarkAsRead, 
  onDismiss, 
  onArchive 
}: {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDismiss: (id: string) => void;
  onArchive: (id: string) => void;
}) => {
  const getTypeStyles = (type: Notification['type']) => {
    const styles = {
      info: 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/50',
      success: 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/50',
      warning: 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/50',
      error: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/50'
    };
    return styles[type];
  };

  const getIconStyles = (type: Notification['type']) => {
    const styles = {
      info: 'text-blue-600 dark:text-blue-400',
      success: 'text-green-600 dark:text-green-400',
      warning: 'text-yellow-600 dark:text-yellow-400',
      error: 'text-red-600 dark:text-red-400'
    };
    return styles[type];
  };

  const getPriorityBadge = (priority: Notification['priority']) => {
    const variants = {
      low: 'secondary',
      medium: 'outline',
      high: 'default',
      urgent: 'destructive'
    } as const;
    
    return (
      <Badge variant={variants[priority]} className="text-xs">
        {priority.toUpperCase()}
      </Badge>
    );
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn(
        'border rounded-lg p-4 space-y-3 transition-all duration-200',
        getTypeStyles(notification.type),
        !notification.read && 'ring-2 ring-blue-200 dark:ring-blue-800'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className={cn('p-1 rounded-full', getIconStyles(notification.type))}>
            <NotificationIcon type={notification.type} />
          </div>
          <div className="flex items-center gap-2">
            <CategoryIcon category={notification.category} />
            <span className="text-sm text-muted-foreground capitalize">
              {notification.category}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {getPriorityBadge(notification.priority)}
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatTimestamp(notification.timestamp)}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-2">
        <h4 className="font-semibold text-sm">{notification.title}</h4>
        <p className="text-sm text-muted-foreground">{notification.message}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {notification.actions?.map((action) => (
            <Button
              key={action.id}
              variant={action.variant || 'outline'}
              size="sm"
              onClick={action.action}
              className="text-xs"
            >
              {action.label}
            </Button>
          ))}
        </div>
        
        <div className="flex items-center gap-1">
          {!notification.read && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onMarkAsRead(notification.id)}
              className="h-8 w-8 p-0"
            >
              <Check className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onArchive(notification.id)}
            className="h-8 w-8 p-0"
          >
            <Archive className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDismiss(notification.id)}
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export const NotificationSystem: React.FC<NotificationSystemProps> = ({
  className,
  maxNotifications = 50,
  autoHideDelay = 5000,
  enableSound = true,
  position = 'top-right'
}) => {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'priority'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [soundEnabled, setSoundEnabled] = useState(enableSound);

  // Notification management functions
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date()
    };

    setNotifications(prev => [newNotification, ...prev.slice(0, maxNotifications - 1)]);

    // Play sound if enabled
    if (soundEnabled && notification.priority === 'urgent') {
      // You can implement sound playing here
      console.log('🔊 Playing notification sound');
    }
  }, [maxNotifications, soundEnabled]);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  }, []);

  const archiveNotification = useCallback((id: string) => {
    // In a real app, you'd move to archived notifications
    dismissNotification(id);
  }, [dismissNotification]);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    );
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Filter notifications
  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'unread' && notif.read) return false;
    if (filter === 'priority' && notif.priority === 'low') return false;
    if (categoryFilter !== 'all' && notif.category !== categoryFilter) return false;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;
  const urgentCount = notifications.filter(n => n.priority === 'urgent' && !n.read).length;

  return (
    <div className={cn('relative', className)}>
      {/* Notification Bell */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <Badge 
            variant={urgentCount > 0 ? 'destructive' : 'default'}
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs p-0"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Notification Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="absolute right-0 top-full mt-2 w-96 max-h-[600px] bg-background border rounded-lg shadow-lg z-50 overflow-hidden"
          >
            <Card className="border-0 shadow-none">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    Notificaciones
                    {unreadCount > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {unreadCount} nuevas
                      </Badge>
                    )}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSoundEnabled(!soundEnabled)}
                      className="h-8 w-8 p-0"
                    >
                      {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsOpen(false)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-2 pt-2">
                  <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
                    <SelectTrigger className="w-32 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="unread">No leídas</SelectItem>
                      <SelectItem value="priority">Prioritarias</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-32 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="sales">Ventas</SelectItem>
                      <SelectItem value="inventory">Inventario</SelectItem>
                      <SelectItem value="system">Sistema</SelectItem>
                      <SelectItem value="user">Usuario</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Actions */}
                {notifications.length > 0 && (
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={markAllAsRead}
                      className="text-xs"
                    >
                      Marcar todas como leídas
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearAll}
                      className="text-xs"
                    >
                      Limpiar todo
                    </Button>
                  </div>
                )}
              </CardHeader>

              <Separator />

              <CardContent className="p-0">
                <div className="max-h-96 overflow-y-auto">
                  {filteredNotifications.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground">
                      <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No hay notificaciones</p>
                    </div>
                  ) : (
                    <div className="p-4 space-y-3">
                      <AnimatePresence>
                        {filteredNotifications.map((notification) => (
                          <NotificationItem
                            key={notification.id}
                            notification={notification}
                            onMarkAsRead={markAsRead}
                            onDismiss={dismissNotification}
                            onArchive={archiveNotification}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Hook for using notifications
export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date()
    };
    setNotifications(prev => [newNotification, ...prev]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return {
    notifications,
    addNotification,
    removeNotification
  };
};

export default NotificationSystem;