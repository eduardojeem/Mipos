'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Bell, 
  BellOff, 
  Settings, 
  Clock, 
  Volume2, 
  VolumeX, 
  Smartphone, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Info,
  Package,
  DollarSign,
  RefreshCw,
  Monitor,
  History,
  Trash2,
  Download,
  Upload
} from 'lucide-react';
import { 
  usePushNotifications, 
  defaultPushNotificationConfig,
  type PushNotificationConfig,
  type NotificationType,
  type NotificationPriority,
  type NotificationHistory
} from '@/lib/notifications/push-notifications';

interface NotificationSettingsProps {
  initialConfig?: Partial<PushNotificationConfig>;
  onConfigChange?: (config: PushNotificationConfig) => void;
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
  low: 'bg-gray-100 text-gray-800',
  normal: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800'
};

export function NotificationSettings({ initialConfig, onConfigChange }: NotificationSettingsProps) {
  const [config, setConfig] = useState<PushNotificationConfig>({
    ...defaultPushNotificationConfig,
    ...initialConfig
  });

  const {
    service,
    permission,
    subscription,
    stats,
    isSupported,
    requestPermission,
    subscribe,
    unsubscribe,
    updateConfig,
    getHistory,
    clearHistory
  } = usePushNotifications(config);

  const [history, setHistory] = useState<NotificationHistory[]>([]);
  const [testNotificationSent, setTestNotificationSent] = useState(false);

  useEffect(() => {
    setHistory(getHistory(50));
  }, [stats]);

  useEffect(() => {
    updateConfig(config);
    onConfigChange?.(config);
  }, [config, updateConfig, onConfigChange]);

  const handlePermissionRequest = async () => {
    try {
      await requestPermission();
    } catch (error) {
      console.error('Failed to request permission:', error);
    }
  };

  const handleSubscribe = async () => {
    try {
      await subscribe();
    } catch (error) {
      console.error('Failed to subscribe:', error);
    }
  };

  const handleUnsubscribe = async () => {
    try {
      await unsubscribe();
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
    }
  };

  const handleTestNotification = async () => {
    try {
      await service.sendNotification({
        type: 'info',
        priority: 'normal',
        title: 'Test Notification',
        body: 'This is a test notification to verify your settings are working correctly.',
        icon: '/icons/notification-icon.png',
        tag: 'test-notification'
      });
      setTestNotificationSent(true);
      setTimeout(() => setTestNotificationSent(false), 3000);
    } catch (error) {
      console.error('Failed to send test notification:', error);
    }
  };

  const updateCategoryConfig = (type: NotificationType, updates: any) => {
    setConfig(prev => ({
      ...prev,
      categories: {
        ...prev.categories,
        [type]: {
          ...prev.categories[type],
          ...updates
        }
      }
    }));
  };

  const updateSchedulingConfig = (updates: any) => {
    setConfig(prev => ({
      ...prev,
      scheduling: {
        ...prev.scheduling,
        ...updates
      }
    }));
  };

  const updateQuietHoursConfig = (updates: any) => {
    setConfig(prev => ({
      ...prev,
      scheduling: {
        ...prev.scheduling,
        quietHours: {
          ...prev.scheduling.quietHours,
          ...updates
        }
      }
    }));
  };

  const exportSettings = () => {
    const dataStr = JSON.stringify(config, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'notification-settings.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const importSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedConfig = JSON.parse(e.target?.result as string);
          setConfig({ ...defaultPushNotificationConfig, ...importedConfig });
        } catch (error) {
          console.error('Failed to import settings:', error);
        }
      };
      reader.readAsText(file);
    }
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Push Notifications Not Supported
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Your browser doesn't support push notifications. Please use a modern browser like Chrome, Firefox, or Safari.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Permission Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Status
          </CardTitle>
          <CardDescription>
            Manage your push notification permissions and subscription
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Permission Status</Label>
              <div className="flex items-center gap-2">
                <Badge variant={permission === 'granted' ? 'default' : 'secondary'}>
                  {permission === 'granted' && <CheckCircle className="h-3 w-3 mr-1" />}
                  {permission === 'denied' && <XCircle className="h-3 w-3 mr-1" />}
                  {permission === 'default' && <AlertTriangle className="h-3 w-3 mr-1" />}
                  {permission}
                </Badge>
              </div>
            </div>
            {permission !== 'granted' && (
              <Button onClick={handlePermissionRequest}>
                Enable Notifications
              </Button>
            )}
          </div>

          {permission === 'granted' && (
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Subscription Status</Label>
                <div className="flex items-center gap-2">
                  <Badge variant={subscription ? 'default' : 'secondary'}>
                    {subscription ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                    {subscription ? 'Subscribed' : 'Not Subscribed'}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-2">
                {!subscription ? (
                  <Button onClick={handleSubscribe}>
                    Subscribe
                  </Button>
                ) : (
                  <Button variant="outline" onClick={handleUnsubscribe}>
                    Unsubscribe
                  </Button>
                )}
                <Button variant="outline" onClick={handleTestNotification} disabled={!subscription}>
                  {testNotificationSent ? <CheckCircle className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                  Test
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.sent}</div>
              <div className="text-sm text-muted-foreground">Sent</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.delivered}</div>
              <div className="text-sm text-muted-foreground">Delivered</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.clicked}</div>
              <div className="text-sm text-muted-foreground">Clicked</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.dismissed}</div>
              <div className="text-sm text-muted-foreground">Dismissed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
              <div className="text-sm text-muted-foreground">Failed</div>
            </div>
          </div>
          
          {stats.sent > 0 && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Click Rate</span>
                <span>{((stats.clicked / stats.sent) * 100).toFixed(1)}%</span>
              </div>
              <Progress value={(stats.clicked / stats.sent) * 100} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settings Tabs */}
      <Tabs defaultValue="categories" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="scheduling">Scheduling</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        {/* Categories Tab */}
        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>Notification Categories</CardTitle>
              <CardDescription>
                Configure settings for different types of notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(config.categories).map(([type, categoryConfig]) => {
                const Icon = notificationTypeIcons[type as NotificationType];
                return (
                  <div key={type} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5" />
                        <div>
                          <Label className="capitalize">{type}</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={priorityColors[categoryConfig.priority]}>
                              {categoryConfig.priority}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <Switch
                        checked={categoryConfig.enabled}
                        onCheckedChange={(enabled) => updateCategoryConfig(type as NotificationType, { enabled })}
                      />
                    </div>
                    
                    {categoryConfig.enabled && (
                      <div className="ml-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm">Priority</Label>
                          <Select
                            value={categoryConfig.priority}
                            onValueChange={(priority) => updateCategoryConfig(type as NotificationType, { priority })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="critical">Critical</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Switch
                            id={`sound-${type}`}
                            checked={categoryConfig.sound}
                            onCheckedChange={(sound) => updateCategoryConfig(type as NotificationType, { sound })}
                          />
                          <Label htmlFor={`sound-${type}`} className="text-sm">Sound</Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Switch
                            id={`vibrate-${type}`}
                            checked={categoryConfig.vibrate}
                            onCheckedChange={(vibrate) => updateCategoryConfig(type as NotificationType, { vibrate })}
                          />
                          <Label htmlFor={`vibrate-${type}`} className="text-sm">Vibrate</Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Switch
                            id={`interaction-${type}`}
                            checked={categoryConfig.requireInteraction}
                            onCheckedChange={(requireInteraction) => updateCategoryConfig(type as NotificationType, { requireInteraction })}
                          />
                          <Label htmlFor={`interaction-${type}`} className="text-sm">Require Action</Label>
                        </div>
                      </div>
                    )}
                    
                    <Separator />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scheduling Tab */}
        <TabsContent value="scheduling">
          <div className="space-y-6">
            {/* Quiet Hours */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Quiet Hours
                </CardTitle>
                <CardDescription>
                  Suppress notifications during specified hours
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="quiet-hours"
                    checked={config.scheduling.quietHours.enabled}
                    onCheckedChange={(enabled) => updateQuietHoursConfig({ enabled })}
                  />
                  <Label htmlFor="quiet-hours">Enable Quiet Hours</Label>
                </div>
                
                {config.scheduling.quietHours.enabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Time</Label>
                      <Input
                        type="time"
                        value={config.scheduling.quietHours.start}
                        onChange={(e) => updateQuietHoursConfig({ start: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Time</Label>
                      <Input
                        type="time"
                        value={config.scheduling.quietHours.end}
                        onChange={(e) => updateQuietHoursConfig({ end: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Rate Limiting */}
            <Card>
              <CardHeader>
                <CardTitle>Rate Limiting</CardTitle>
                <CardDescription>
                  Control notification frequency to avoid spam
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Batch Delay (seconds)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="60"
                    value={config.scheduling.batchDelay / 1000}
                    onChange={(e) => updateSchedulingConfig({ batchDelay: parseInt(e.target.value) * 1000 })}
                  />
                  <p className="text-sm text-muted-foreground">
                    Similar notifications will be batched together within this time window
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label>Maximum per Hour</Label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={config.scheduling.maxPerHour}
                    onChange={(e) => updateSchedulingConfig({ maxPerHour: parseInt(e.target.value) })}
                  />
                  <p className="text-sm text-muted-foreground">
                    Maximum number of notifications allowed per hour
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Notification History
                </div>
                <Button variant="outline" size="sm" onClick={clearHistory}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear History
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No notifications in history
                </div>
              ) : (
                <div className="space-y-4">
                  {history.map((entry) => {
                    const Icon = notificationTypeIcons[entry.notification.type];
                    return (
                      <div key={entry.id} className="flex items-start gap-3 p-3 border rounded-lg">
                        <Icon className="h-5 w-5 mt-0.5" />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{entry.notification.title}</span>
                            <Badge variant="outline" className={priorityColors[entry.notification.priority]}>
                              {entry.notification.priority}
                            </Badge>
                            <Badge variant={
                              entry.status === 'delivered' ? 'default' :
                              entry.status === 'clicked' ? 'default' :
                              entry.status === 'failed' ? 'destructive' : 'secondary'
                            }>
                              {entry.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{entry.notification.body}</p>
                          <p className="text-xs text-muted-foreground">
                            {entry.notification.timestamp.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Tab */}
        <TabsContent value="advanced">
          <div className="space-y-6">
            {/* General Settings */}
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="fallback"
                    checked={config.permissions.fallbackToInApp}
                    onCheckedChange={(fallbackToInApp) => 
                      setConfig(prev => ({
                        ...prev,
                        permissions: { ...prev.permissions, fallbackToInApp }
                      }))
                    }
                  />
                  <Label htmlFor="fallback">Fallback to in-app notifications</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="prompt"
                    checked={config.permissions.showPrompt}
                    onCheckedChange={(showPrompt) => 
                      setConfig(prev => ({
                        ...prev,
                        permissions: { ...prev.permissions, showPrompt }
                      }))
                    }
                  />
                  <Label htmlFor="prompt">Show permission prompt</Label>
                </div>
              </CardContent>
            </Card>

            {/* Import/Export */}
            <Card>
              <CardHeader>
                <CardTitle>Import/Export Settings</CardTitle>
                <CardDescription>
                  Backup or restore your notification preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button variant="outline" onClick={exportSettings}>
                    <Download className="h-4 w-4 mr-2" />
                    Export Settings
                  </Button>
                  <div>
                    <input
                      type="file"
                      accept=".json"
                      onChange={importSettings}
                      className="hidden"
                      id="import-settings"
                    />
                    <Button variant="outline" asChild>
                      <label htmlFor="import-settings" className="cursor-pointer">
                        <Upload className="h-4 w-4 mr-2" />
                        Import Settings
                      </label>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Debug Information */}
            <Card>
              <CardHeader>
                <CardTitle>Debug Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label>Service Worker</Label>
                    <p className="text-muted-foreground">
                      {navigator.serviceWorker ? 'Supported' : 'Not Supported'}
                    </p>
                  </div>
                  <div>
                    <Label>Push Manager</Label>
                    <p className="text-muted-foreground">
                      {'PushManager' in window ? 'Supported' : 'Not Supported'}
                    </p>
                  </div>
                  <div>
                    <Label>Notification API</Label>
                    <p className="text-muted-foreground">
                      {'Notification' in window ? 'Supported' : 'Not Supported'}
                    </p>
                  </div>
                  <div>
                    <Label>User Agent</Label>
                    <p className="text-muted-foreground text-xs">
                      {navigator.userAgent.split(' ').slice(-2).join(' ')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}