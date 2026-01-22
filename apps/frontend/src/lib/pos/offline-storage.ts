export interface OfflineCartItem {
  product_id: string;
  product_name: string;
  price: number;
  quantity: number;
  discount?: number;
  total: number;
}

export interface OfflineSale {
  id: string;
  user_id: string;
  customer_id?: string;
  total_amount: number;
  tax_amount: number;
  discount_amount: number;
  payment_method: string;
  status: string;
  created_at: string;
  updated_at: string;
  items?: Array<{
    id: string;
    sale_id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    discount_amount?: number;
  }>;
}

export interface OfflineTransaction {
  id: string;
  type: 'sale' | 'cart';
  data: OfflineCartItem[] | OfflineSale;
  timestamp: number;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'failed';
  retryCount: number;
  lastError?: string;
}

export interface OfflineStorage {
  transactions: OfflineTransaction[];
  lastSync: number | null;
  isOnline: boolean;
}

const STORAGE_KEY = 'pos-offline-transactions';
const SYNC_KEY = 'pos-offline-sync';

class OfflineStorageManager {
  private storage: OfflineStorage = {
    transactions: [],
    lastSync: null,
    isOnline: true
  };

  constructor() {
    this.loadFromStorage();
    this.setupOnlineStatusListener();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const syncData = localStorage.getItem(SYNC_KEY);
      
      if (stored) {
        this.storage.transactions = JSON.parse(stored);
      }
      
      if (syncData) {
        const sync = JSON.parse(syncData);
        this.storage.lastSync = sync.lastSync || null;
        this.storage.isOnline = sync.isOnline ?? true;
      }
    } catch (error) {
      console.error('Error loading offline storage:', error);
      this.storage = {
        transactions: [],
        lastSync: null,
        isOnline: true
      };
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.storage.transactions));
      localStorage.setItem(SYNC_KEY, JSON.stringify({
        lastSync: this.storage.lastSync,
        isOnline: this.storage.isOnline
      }));
    } catch (error) {
      console.error('Error saving offline storage:', error);
    }
  }

  private setupOnlineStatusListener(): void {
    const updateOnlineStatus = () => {
      this.storage.isOnline = navigator.onLine;
      this.saveToStorage();
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();
  }

  addTransaction(type: 'sale' | 'cart', data: OfflineCartItem[] | OfflineSale): string {
    const transaction: OfflineTransaction = {
      id: `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: Date.now(),
      syncStatus: 'pending',
      retryCount: 0
    };

    this.storage.transactions.push(transaction);
    this.saveToStorage();
    return transaction.id;
  }

  getPendingTransactions(): OfflineTransaction[] {
    return this.storage.transactions.filter(t => t.syncStatus === 'pending');
  }

  getAllTransactions(): OfflineTransaction[] {
    return [...this.storage.transactions];
  }

  updateTransactionStatus(id: string, status: OfflineTransaction['syncStatus'], error?: string): void {
    const transaction = this.storage.transactions.find(t => t.id === id);
    if (transaction) {
      transaction.syncStatus = status;
      transaction.lastError = error;
      if (status === 'failed') {
        transaction.retryCount++;
      }
      this.saveToStorage();
    }
  }

  removeTransaction(id: string): void {
    this.storage.transactions = this.storage.transactions.filter(t => t.id !== id);
    this.saveToStorage();
  }

  clearSyncedTransactions(): void {
    this.storage.transactions = this.storage.transactions.filter(t => t.syncStatus !== 'synced');
    this.saveToStorage();
  }

  clearAllTransactions(): void {
    this.storage.transactions = [];
    this.saveToStorage();
  }

  updateLastSync(): void {
    this.storage.lastSync = Date.now();
    this.saveToStorage();
  }

  getStorageInfo(): OfflineStorage {
    return { ...this.storage };
  }

  isOnline(): boolean {
    return this.storage.isOnline;
  }

  getStorageSize(): number {
    try {
      const transactionsSize = new Blob([JSON.stringify(this.storage.transactions)]).size;
      const syncSize = new Blob([JSON.stringify({
        lastSync: this.storage.lastSync,
        isOnline: this.storage.isOnline
      })]).size;
      return transactionsSize + syncSize;
    } catch {
      return 0;
    }
  }

  exportData(): string {
    return JSON.stringify({
      transactions: this.storage.transactions,
      lastSync: this.storage.lastSync,
      exportDate: Date.now()
    }, null, 2);
  }

  importData(data: string): boolean {
    try {
      const parsed = JSON.parse(data);
      if (parsed.transactions && Array.isArray(parsed.transactions)) {
        this.storage.transactions = parsed.transactions;
        this.storage.lastSync = parsed.lastSync || null;
        this.saveToStorage();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error importing offline data:', error);
      return false;
    }
  }
}

export const offlineStorage = new OfflineStorageManager();

export function getOfflineStorageStatus() {
  const info = offlineStorage.getStorageInfo();
  const pending = offlineStorage.getPendingTransactions();
  
  return {
    isOnline: info.isOnline,
    pendingTransactions: pending.length,
    lastSync: info.lastSync,
    storageSize: offlineStorage.getStorageSize(),
    oldestTransaction: pending.length > 0 ? Math.min(...pending.map(t => t.timestamp)) : null
  };
}

export function formatOfflineStorageSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}