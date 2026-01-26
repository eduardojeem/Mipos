import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';

export interface ProductNotification {
  id: string;
  type: 'stock_low' | 'stock_out' | 'price_change' | 'new_product' | 'product_updated';
  severity: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  productId?: string;
  productName?: string;
  timestamp: Date;
  read: boolean;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  id: string;
  label: string;
  action: () => void;
  variant?: 'default' | 'destructive' | 'outline';
}

export interface NotificationSettings {
  stockLowThreshold: number;
  enableStockAlerts: boolean;
  enablePriceAlerts: boolean;
  enableNewProductAlerts: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  soundEnabled: boolean;
}

const logger = createLogger('NotificationService');

class NotificationService {
  private static instance: NotificationService;
  private notifications: ProductNotification[] = [];
  private listeners: ((notifications: ProductNotification[]) => void)[] = [];
  private settings: NotificationSettings;
  private websocket: WebSocket | null = null;

  private constructor() {
    this.settings = this.loadSettings();
    this.loadNotifications();
    this.initializeWebSocket();
  }

  static getInstance(): NotificationService {
    if (!this.instance) {
      this.instance = new NotificationService();
    }
    return this.instance;
  }

  // WebSocket connection for real-time updates
  private initializeWebSocket() {
    try {
      // In a real implementation, this would connect to your WebSocket server
      // this.websocket = new WebSocket('ws://localhost:3000/products');

      // Simulate real-time notifications for demo
      this.simulateRealTimeNotifications();
    } catch (error) {
      logger.error('Failed to initialize WebSocket:', error);
    }
  }

  private simulateRealTimeNotifications() {
    // Simulate periodic stock checks
    setInterval(() => {
      if (this.settings.enableStockAlerts) {
        this.checkStockLevels();
      }
    }, 30000); // Check every 30 seconds

    // Simulate random product updates
    setInterval(() => {
      if (Math.random() < 0.1) { // 10% chance every minute
        this.simulateProductUpdate();
      }
    }, 60000);
  }

  private checkStockLevels() {
    // This would normally fetch from your API
    // For demo, we'll simulate some low stock notifications
    const mockLowStockProducts = [
      { id: '1', name: 'Labial Rojo Intenso', stock: 2, minStock: 5 },
      { id: '2', name: 'Base Líquida Natural', stock: 0, minStock: 3 }
    ];

    mockLowStockProducts.forEach(product => {
      if (product.stock === 0) {
        this.addNotification({
          type: 'stock_out',
          severity: 'error',
          title: 'Producto sin stock',
          message: `${product.name} está completamente sin stock`,
          productId: product.id,
          productName: product.name,
          actions: [
            {
              id: 'restock',
              label: 'Reabastecer',
              action: () => this.handleRestock(product.id),
              variant: 'default'
            },
            {
              id: 'view',
              label: 'Ver producto',
              action: () => this.handleViewProduct(product.id),
              variant: 'outline'
            }
          ]
        });
      } else if (product.stock <= product.minStock) {
        this.addNotification({
          type: 'stock_low',
          severity: 'warning',
          title: 'Stock bajo',
          message: `${product.name} tiene solo ${product.stock} unidades`,
          productId: product.id,
          productName: product.name,
          actions: [
            {
              id: 'restock',
              label: 'Reabastecer',
              action: () => this.handleRestock(product.id),
              variant: 'default'
            }
          ]
        });
      }
    });
  }

  private simulateProductUpdate() {
    const mockUpdates = [
      { id: '3', name: 'Máscara de Pestañas', action: 'price_change', oldPrice: 45000, newPrice: 42000 },
      { id: '4', name: 'Crema Hidratante', action: 'new_product' }
    ];

    const update = mockUpdates[Math.floor(Math.random() * mockUpdates.length)];

    if (update.action === 'price_change') {
      this.addNotification({
        type: 'price_change',
        severity: 'info',
        title: 'Cambio de precio',
        message: `${update.name}: ${update.oldPrice} → ${update.newPrice}`,
        productId: update.id,
        productName: update.name
      });
    } else if (update.action === 'new_product') {
      this.addNotification({
        type: 'new_product',
        severity: 'success',
        title: 'Nuevo producto',
        message: `${update.name} ha sido agregado al catálogo`,
        productId: update.id,
        productName: update.name
      });
    }
  }

  // Public methods
  addNotification(notification: Omit<ProductNotification, 'id' | 'timestamp' | 'read'>) {
    const newNotification: ProductNotification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false
    };

    this.notifications.unshift(newNotification);

    // Keep only last 100 notifications
    if (this.notifications.length > 100) {
      this.notifications = this.notifications.slice(0, 100);
    }

    this.saveNotifications();
    this.notifyListeners();

    // Show toast notification
    this.showToastNotification(newNotification);

    // Play sound if enabled
    if (this.settings.soundEnabled) {
      this.playNotificationSound(newNotification.severity);
    }
  }

  private showToastNotification(notification: ProductNotification) {
    const duration = notification.severity === 'error' ? 10000 : 5000;

    switch (notification.severity) {
      case 'error':
        toast.error(notification.message);
        break;
      case 'warning':
        toast.warning?.(notification.message) || toast.error(notification.message);
        break;
      case 'success':
        toast.success(notification.message);
        break;
      default:
        toast.info?.(notification.message) || toast(notification.message);
    }
  }

  private playNotificationSound(severity: string) {
    try {
      const audio = new Audio();
      switch (severity) {
        case 'error':
          audio.src = '/sounds/error.mp3';
          break;
        case 'warning':
          audio.src = '/sounds/warning.mp3';
          break;
        case 'success':
          audio.src = '/sounds/success.mp3';
          break;
        default:
          audio.src = '/sounds/info.mp3';
      }
      audio.play().catch(() => {
        // Ignore audio play errors (user interaction required)
      });
    } catch (error) {
      // Ignore audio errors
    }
  }

  getNotifications(): ProductNotification[] {
    return [...this.notifications];
  }

  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  markAsRead(notificationId: string) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      this.saveNotifications();
      this.notifyListeners();
    }
  }

  markAllAsRead() {
    this.notifications.forEach(n => n.read = true);
    this.saveNotifications();
    this.notifyListeners();
  }

  deleteNotification(notificationId: string) {
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    this.saveNotifications();
    this.notifyListeners();
  }

  clearAllNotifications() {
    this.notifications = [];
    this.saveNotifications();
    this.notifyListeners();
  }

  // Settings management
  getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  updateSettings(newSettings: Partial<NotificationSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
  }

  // Listeners for real-time updates
  subscribe(listener: (notifications: ProductNotification[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener([...this.notifications]));
  }

  // Persistence
  private loadNotifications() {
    try {
      const stored = localStorage.getItem('product-notifications');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.notifications = parsed.map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp)
        }));
      }
    } catch (error) {
      logger.error('Failed to load notifications:', error);
      this.notifications = [];
    }
  }

  private saveNotifications() {
    try {
      localStorage.setItem('product-notifications', JSON.stringify(this.notifications));
    } catch (error) {
      logger.error('Failed to save notifications:', error);
    }
  }

  private loadSettings(): NotificationSettings {
    try {
      const stored = localStorage.getItem('notification-settings');
      if (stored) {
        return { ...this.getDefaultSettings(), ...JSON.parse(stored) };
      }
    } catch (error) {
      logger.error('Failed to load notification settings:', error);
    }
    return this.getDefaultSettings();
  }

  private saveSettings() {
    try {
      localStorage.setItem('notification-settings', JSON.stringify(this.settings));
    } catch (error) {
      logger.error('Failed to save notification settings:', error);
    }
  }

  private getDefaultSettings(): NotificationSettings {
    return {
      stockLowThreshold: 5,
      enableStockAlerts: true,
      enablePriceAlerts: true,
      enableNewProductAlerts: true,
      emailNotifications: false,
      pushNotifications: true,
      soundEnabled: true
    };
  }

  // Action handlers
  private handleRestock(productId: string) {
    // This would navigate to restock page or open restock dialog
    logger.log('Restock product:', productId);
    toast.info('Función de reabastecimiento próximamente...');
  }

  private handleViewProduct(productId: string) {
    // This would navigate to product details
    window.location.href = `/dashboard/products/view/${productId}`;
  }

  // Cleanup
  destroy() {
    if (this.websocket) {
      this.websocket.close();
    }
    this.listeners = [];
  }
}

export default NotificationService;