'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Bell, 
  BellOff, 
  Search, 
  Filter, 
  MoreVertical, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Info,
  Package,
  DollarSign,
  RefreshCw,
  Monitor,
  Trash2,
  Archive,
  Star,
  Clock,
  Eye,
  EyeOff
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  usePushNotifications, 
  defaultPushNotificationConfig,
  type NotificationHistory,
  type NotificationType,
  type NotificationPriority
} from '@/lib/notifications/push-notifications';
import { formatDistanceToNow } from 'date-fns';

interface NotificationCenterProps {
  className?: string;
  maxHeight?: string;
}

const notificationTypeIcons: Record<NotificationType, React.ComponentType<any>> = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
  sync: RefreshCw,
  inventory: Package,
  sales: DollarSign,
  system: Monitor
};

const priorityColors: Record<NotificationPriority, string> = {
  low: 'bg-gray-100 text-gray-800 border-gray-200',
  normal: 'bg-blue-100 text-blue-800 border-blue-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  critical: 'bg-red-100 text-red-800 border-red-200'
};

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  sent: 'bg-blue-100 text-blue-800',
  delivered: 'bg-green-100 text-green-800',
  clicked: 'bg-purple-100 text-purple-800',
  dismissed: 'bg-gray-100 text-gray-800',
  failed: 'bg-red-100 text-red-800'
};

export function NotificationCenter({ className, maxHeight = '600px' }: NotificationCenterProps) {
  const {
    service,
    stats,
    getHistory,
    clearHistory
  } = usePushNotifications(defaultPushNotificationConfig);

  const [notifications, setNotifications] = useState<NotificationHistory[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<NotificationHistory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<NotificationType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<NotificationPriority | 'all'>('all');
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  useEffect(() => {
    const loadNotifications = () => {
      const history = getHistory(100);
      setNotifications(history);
    };

    loadNotifications();
    
    // Listen for new notifications
    const handleNotificationSent = () => loadNotifications();
    const handleNotificationClick = () => loadNotifications();
    const handleNotificationClose = () => loadNotifications();

    service.on('notificationSent', handleNotificationSent);
    service.on('notificationClick', handleNotificationClick);
    service.on('notificationClose', handleNotificationClose);

    return () => {
      service.off('notificationSent', handleNotificationSent);
      service.off('notificationClick', handleNotificationClick);
      service.off('notificationClose', handleNotificationClose);
    };
  }, [service, getHistory]);

  useEffect(() => {
    let filtered = notifications;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(notification =>
        notification.notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        notification.notification.body.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(notification => notification.notification.type === typeFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(notification => notification.status === statusFilter);
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(notification => notification.notification.priority === priorityFilter);
    }

    // Unread filter
    if (showUnreadOnly) {
      filtered = filtered.filter(notification => 
        notification.status !== 'clicked' && notification.status !== 'dismissed'
      );
    }

    setFilteredNotifications(filtered);
  }, [notifications, searchQuery, typeFilter, statusFilter, priorityFilter, showUnreadOnly]);

  const handleSelectNotification = (id: string) => {
    const newSelected = new Set(selectedNotifications);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedNotifications(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedNotifications.size === filteredNotifications.length) {
      setSelectedNotifications(new Set());
    } else {
      setSelectedNotifications(new Set(filteredNotifications.map(n => n.id)));
    }
  };

  const handleBulkAction = (action: string) => {
    // In a real implementation, these would update the notification status
    console.log(`Bulk action: ${action} on notifications:`, Array.from(selectedNotifications));
    setSelectedNotifications(new Set());
  };

  const handleMarkAsRead = (id: string) => {
    // In a real implementation, this would update the notification status
    console.log('Mark as read:', id);
  };

  const handleMarkAsUnread = (id: string) => {
    // In a real implementation, this would update the notification status
    console.log('Mark as unread:', id);
  };

  const handleArchive = (id: string) => {
    // In a real implementation, this would archive the notification
    console.log('Archive:', id);
  };

  const handleDelete = (id: string) => {
    // In a real implementation, this would delete the notification
    console.log('Delete:', id);
  };

  const getUnreadCount = () => {
    return notifications.filter(n => n.status !== 'clicked' && n.status !== 'dismissed').length;
  };

  const renderNotificationItem = (notification: NotificationHistory) => {
    const Icon = notificationTypeIcons[notification.notification.type];
    const isUnread = notification.status !== 'clicked' && notification.status !== 'dismissed';
    const isSelected = selectedNotifications.has(notification.id);

    return (
      <div
        key={notification.id}
        className={`p-4 border rounded-lg transition-colors ${
          isSelected ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
        } ${isUnread ? 'border-l-4 border-l-blue-500' : ''}`}
      >
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => handleSelectNotification(notification.id)}
            className="mt-1"
          />
          
          <div className={`p-2 rounded-full ${priorityColors[notification.notification.priority]}`}>
            <Icon className="h-4 w-4" />
          </div>
          
          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h4 className={`font-medium ${isUnread ? 'font-semibold' : ''}`}>
                  {notification.notification.title}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {notification.notification.body}
                </p>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isUnread ? (
                    <DropdownMenuItem onClick={() => handleMarkAsRead(notification.id)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Mark as Read
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => handleMarkAsUnread(notification.id)}>
                      <EyeOff className="h-4 w-4 mr-2" />
                      Mark as Unread
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => handleArchive(notification.id)}>
                    <Archive className="h-4 w-4 mr-2" />
                    Archive
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => handleDelete(notification.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            <div className="flex items-center gap-2 text-xs">
              <Badge variant="outline" className={priorityColors[notification.notification.priority]}>
                {notification.notification.priority}
              </Badge>
              <Badge variant="outline" className={statusColors[notification.status]}>
                {notification.status}
              </Badge>
              <span className="text-muted-foreground">
                {formatDistanceToNow(notification.notification.timestamp, { addSuffix: true })}
              </span>
            </div>
            
            {notification.notification.actions && notification.notification.actions.length > 0 && (
              <div className="flex gap-2 mt-2">
                {notification.notification.actions.map((action, index) => (
                  <Button key={index} variant="outline" size="sm">
                    {action.title}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Center
            {getUnreadCount() > 0 && (
              <Badge variant="destructive" className="ml-2">
                {getUnreadCount()}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUnreadOnly(!showUnreadOnly)}
            >
              {showUnreadOnly ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
              {showUnreadOnly ? 'Show All' : 'Unread Only'}
            </Button>
            <Button variant="outline" size="sm" onClick={clearHistory}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as any)}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="sync">Sync</SelectItem>
                <SelectItem value="inventory">Inventory</SelectItem>
                <SelectItem value="sales">Sales</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="clicked">Clicked</SelectItem>
                <SelectItem value="dismissed">Dismissed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={priorityFilter} onValueChange={(value) => setPriorityFilter(value as any)}>
              <SelectTrigger>
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setTypeFilter('all');
                setStatusFilter('all');
                setPriorityFilter('all');
                setShowUnreadOnly(false);
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedNotifications.size > 0 && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
            <span className="text-sm font-medium">
              {selectedNotifications.size} selected
            </span>
            <Separator orientation="vertical" className="h-4" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction('markRead')}
            >
              <Eye className="h-4 w-4 mr-2" />
              Mark as Read
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction('archive')}
            >
              <Archive className="h-4 w-4 mr-2" />
              Archive
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction('delete')}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
            >
              {selectedNotifications.size === filteredNotifications.length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="text-lg font-semibold text-blue-600">{stats.sent}</div>
            <div className="text-xs text-muted-foreground">Total Sent</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-green-600">{stats.clicked}</div>
            <div className="text-xs text-muted-foreground">Clicked</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-orange-600">{getUnreadCount()}</div>
            <div className="text-xs text-muted-foreground">Unread</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-red-600">{stats.failed}</div>
            <div className="text-xs text-muted-foreground">Failed</div>
          </div>
        </div>

        {/* Notifications List */}
        <ScrollArea style={{ height: maxHeight }}>
          <div className="space-y-3">
            {filteredNotifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {notifications.length === 0 ? (
                  <div className="space-y-2">
                    <Bell className="h-12 w-12 mx-auto text-muted-foreground/50" />
                    <p>No notifications yet</p>
                    <p className="text-sm">Notifications will appear here when they arrive</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Search className="h-12 w-12 mx-auto text-muted-foreground/50" />
                    <p>No notifications match your filters</p>
                    <p className="text-sm">Try adjusting your search or filter criteria</p>
                  </div>
                )}
              </div>
            ) : (
              filteredNotifications.map(renderNotificationItem)
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}