'use client';

import React, { useState } from 'react';
import { 
  Bell, 
  BellRing, 
  X, 
  Check, 
  CheckCheck, 
  Trash2, 
  Settings, 
  AlertTriangle, 
  Info, 
  CheckCircle, 
  XCircle,
  Package,
  DollarSign,
  Plus,
  Eye,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications, useNotificationSettings } from '../hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ProductNotification } from '../services/NotificationService';

interface NotificationCenterProps {
  className?: string;
}

export default function NotificationCenter({ className }: NotificationCenterProps) {
  const {
    notifications,
    unreadCount,
    hasUnread,
    recentNotifications,
    criticalNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className={className}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="relative"
          >
            {hasUnread ? (
              <BellRing className="h-5 w-5" />
            ) : (
              <Bell className="h-5 w-5" />
            )}
            {unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-96 p-0" align="end">
          <NotificationPanel
            notifications={notifications}
            recentNotifications={recentNotifications}
            criticalNotifications={criticalNotifications}
            unreadCount={unreadCount}
            onMarkAsRead={markAsRead}
            onMarkAllAsRead={markAllAsRead}
            onDeleteNotification={deleteNotification}
            onClearAll={clearAllNotifications}
            onShowSettings={() => setShowSettings(true)}
          />
        </PopoverContent>
      </Popover>

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configuración de Notificaciones</DialogTitle>
            <DialogDescription>
              Personaliza cómo y cuándo recibir notificaciones
            </DialogDescription>
          </DialogHeader>
          <NotificationSettings />
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface NotificationPanelProps {
  notifications: ProductNotification[];
  recentNotifications: ProductNotification[];
  criticalNotifications: ProductNotification[];
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDeleteNotification: (id: string) => void;
  onClearAll: () => void;
  onShowSettings: () => void;
}

function NotificationPanel({
  notifications,
  recentNotifications,
  criticalNotifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotification,
  onClearAll,
  onShowSettings
}: NotificationPanelProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'recent' | 'critical'>('all');

  const getDisplayNotifications = () => {
    switch (activeTab) {
      case 'recent':
        return recentNotifications;
      case 'critical':
        return criticalNotifications;
      default:
        return notifications.slice(0, 20); // Show last 20
    }
  };

  const displayNotifications = getDisplayNotifications();

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-2">
          <h3 className="font-semibold">Notificaciones</h3>
          {unreadCount > 0 && (
            <Badge variant="secondary">{unreadCount} nuevas</Badge>
          )}
        </div>
        <div className="flex items-center space-x-1">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMarkAllAsRead}
              className="text-xs"
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Marcar todas
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onShowSettings}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex-1 px-4 py-2 text-sm font-medium ${
            activeTab === 'all'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Todas ({notifications.length})
        </button>
        <button
          onClick={() => setActiveTab('recent')}
          className={`flex-1 px-4 py-2 text-sm font-medium ${
            activeTab === 'recent'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Recientes ({recentNotifications.length})
        </button>
        <button
          onClick={() => setActiveTab('critical')}
          className={`flex-1 px-4 py-2 text-sm font-medium ${
            activeTab === 'critical'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Críticas ({criticalNotifications.length})
        </button>
      </div>

      {/* Notifications List */}
      <ScrollArea className="h-96">
        {displayNotifications.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              {activeTab === 'critical' 
                ? 'No hay notificaciones críticas'
                : activeTab === 'recent'
                ? 'No hay notificaciones recientes'
                : 'No hay notificaciones'
              }
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {displayNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={onMarkAsRead}
                onDelete={onDeleteNotification}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="p-3 border-t bg-muted/30">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="w-full text-xs text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Limpiar todas las notificaciones
          </Button>
        </div>
      )}
    </div>
  );
}

interface NotificationItemProps {
  notification: ProductNotification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

function NotificationItem({ notification, onMarkAsRead, onDelete }: NotificationItemProps) {
  const getIcon = () => {
    switch (notification.type) {
      case 'stock_low':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'stock_out':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'price_change':
        return <DollarSign className="h-4 w-4 text-blue-500" />;
      case 'new_product':
        return <Plus className="h-4 w-4 text-green-500" />;
      case 'product_updated':
        return <RefreshCw className="h-4 w-4 text-purple-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSeverityColor = () => {
    switch (notification.severity) {
      case 'error':
        return 'border-l-red-500';
      case 'warning':
        return 'border-l-orange-500';
      case 'success':
        return 'border-l-green-500';
      default:
        return 'border-l-blue-500';
    }
  };

  return (
    <div className={`p-3 border-l-4 ${getSeverityColor()} ${!notification.read ? 'bg-muted/30' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <div className="mt-0.5">
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <p className="text-sm font-medium truncate">{notification.title}</p>
              {!notification.read && (
                <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
            {notification.productName && (
              <p className="text-xs text-muted-foreground mt-1">
                Producto: {notification.productName}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              {formatDistanceToNow(notification.timestamp, { 
                addSuffix: true, 
                locale: es 
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-1 ml-2">
          {!notification.read && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onMarkAsRead(notification.id)}
              className="h-6 w-6 p-0"
            >
              <Check className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(notification.id)}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Actions */}
      {notification.actions && notification.actions.length > 0 && (
        <div className="flex items-center space-x-2 mt-3">
          {notification.actions.map((action) => (
            <Button
              key={action.id}
              variant={action.variant || 'outline'}
              size="sm"
              onClick={action.action}
              className="text-xs h-7"
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

function NotificationSettings() {
  const { settings, updateSettings, resetToDefaults } = useNotificationSettings();

  return (
    <div className="space-y-6">
      {/* Stock Alerts */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="stock-alerts">Alertas de Stock</Label>
          <Switch
            id="stock-alerts"
            checked={settings.enableStockAlerts}
            onCheckedChange={(checked) => 
              updateSettings({ enableStockAlerts: checked })
            }
          />
        </div>
        
        {settings.enableStockAlerts && (
          <div className="space-y-2">
            <Label htmlFor="stock-threshold" className="text-sm text-muted-foreground">
              Umbral de stock bajo
            </Label>
            <Input
              id="stock-threshold"
              type="number"
              min="1"
              max="100"
              value={settings.stockLowThreshold}
              onChange={(e) => 
                updateSettings({ stockLowThreshold: parseInt(e.target.value) || 5 })
              }
              className="w-20"
            />
          </div>
        )}
      </div>

      <Separator />

      {/* Other Alerts */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="price-alerts">Alertas de Precios</Label>
          <Switch
            id="price-alerts"
            checked={settings.enablePriceAlerts}
            onCheckedChange={(checked) => 
              updateSettings({ enablePriceAlerts: checked })
            }
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="new-product-alerts">Nuevos Productos</Label>
          <Switch
            id="new-product-alerts"
            checked={settings.enableNewProductAlerts}
            onCheckedChange={(checked) => 
              updateSettings({ enableNewProductAlerts: checked })
            }
          />
        </div>
      </div>

      <Separator />

      {/* Delivery Methods */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium">Métodos de Entrega</h4>
        
        <div className="flex items-center justify-between">
          <Label htmlFor="push-notifications">Notificaciones Push</Label>
          <Switch
            id="push-notifications"
            checked={settings.pushNotifications}
            onCheckedChange={(checked) => 
              updateSettings({ pushNotifications: checked })
            }
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="email-notifications">Email</Label>
          <Switch
            id="email-notifications"
            checked={settings.emailNotifications}
            onCheckedChange={(checked) => 
              updateSettings({ emailNotifications: checked })
            }
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="sound-enabled">Sonido</Label>
          <Switch
            id="sound-enabled"
            checked={settings.soundEnabled}
            onCheckedChange={(checked) => 
              updateSettings({ soundEnabled: checked })
            }
          />
        </div>
      </div>

      <Separator />

      {/* Reset */}
      <Button
        variant="outline"
        onClick={resetToDefaults}
        className="w-full"
      >
        Restaurar Configuración por Defecto
      </Button>
    </div>
  );
}