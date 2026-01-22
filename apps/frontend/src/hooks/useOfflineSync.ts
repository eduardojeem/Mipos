import { useEffect, useState, useCallback, useRef } from 'react';
import { offlineStorage, getOfflineStorageStatus, OfflineTransaction, formatOfflineStorageSize, OfflineCartItem, OfflineSale } from '@/lib/pos/offline-storage';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface SyncOptions {
  autoSync: boolean;
  syncInterval: number;
  maxRetries: number;
  batchSize: number;
}

interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
}

interface UseOfflineSyncReturn {
  isOnline: boolean;
  pendingTransactions: number;
  lastSync: number | null;
  storageSize: string;
  isSyncing: boolean;
  syncResult: SyncResult | null;
  syncNow: () => Promise<void>;
  clearSynced: () => void;
  exportOfflineData: () => string;
  importOfflineData: (data: string) => boolean;
}

const DEFAULT_OPTIONS: SyncOptions = {
  autoSync: true,
  syncInterval: 30000, // 30 seconds
  maxRetries: 3,
  batchSize: 10
};

export function useOfflineSync(options: Partial<SyncOptions> = {}): UseOfflineSyncReturn {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingTransactions, setPendingTransactions] = useState(0);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [storageSize, setStorageSize] = useState('0 B');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const optionsRef = useRef({ ...DEFAULT_OPTIONS, ...options });

  const updateStatus = useCallback(() => {
    const status = getOfflineStorageStatus();
    setIsOnline(status.isOnline);
    setPendingTransactions(status.pendingTransactions);
    setLastSync(status.lastSync);
    setStorageSize(formatOfflineStorageSize(status.storageSize));
  }, []);

  const syncSaleTransaction = useCallback(async (transaction: OfflineTransaction & { type: 'sale' }): Promise<boolean> => {
    const supabase = createClient();
    const saleData = transaction.data as OfflineSale;
    
    const { data: existingSale } = await supabase
      .from('sales')
      .select('id')
      .eq('id', saleData.id)
      .single();

    if (existingSale) {
      offlineStorage.updateTransactionStatus(transaction.id, 'synced');
      return true;
    }

    const { error: saleError } = await supabase
      .from('sales')
      .insert([{
        id: saleData.id,
        user_id: saleData.user_id,
        customer_id: saleData.customer_id,
        total_amount: saleData.total_amount,
        tax_amount: saleData.tax_amount,
        discount_amount: saleData.discount_amount,
        payment_method: saleData.payment_method,
        status: saleData.status,
        created_at: saleData.created_at,
        updated_at: saleData.updated_at
      }]);

    if (saleError) throw saleError;

    if (saleData.items && saleData.items.length > 0) {
      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleData.items.map(item => ({
          sale_id: saleData.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          discount_amount: item.discount_amount || 0
        })));

      if (itemsError) throw itemsError;
    }

    offlineStorage.updateTransactionStatus(transaction.id, 'synced');
    return true;
  }, []);

  const syncCartTransaction = useCallback(async (transaction: OfflineTransaction & { type: 'cart' }): Promise<boolean> => {
    const cartData = transaction.data as OfflineCartItem[];
    offlineStorage.updateTransactionStatus(transaction.id, 'synced');
    return true;
  }, []);

  const syncTransaction = useCallback(async (transaction: OfflineTransaction): Promise<boolean> => {
    try {
      if (transaction.type === 'sale') {
        return await syncSaleTransaction(transaction as OfflineTransaction & { type: 'sale' });
      } else if (transaction.type === 'cart') {
        return await syncCartTransaction(transaction as OfflineTransaction & { type: 'cart' });
      }
      return false;
    } catch (error) {
      console.error('Error syncing transaction:', error);
      offlineStorage.updateTransactionStatus(
        transaction.id,
        'failed',
        error instanceof Error ? error.message : 'Unknown error'
      );
      return false;
    }
  }, [syncSaleTransaction, syncCartTransaction]);


  const syncNow = useCallback(async () => {
    if (isSyncing || !isOnline) return;
    
    setIsSyncing(true);
    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      errors: []
    };

    try {
      const pending = offlineStorage.getPendingTransactions();
      
      if (pending.length === 0) {
        toast.info('No hay transacciones pendientes para sincronizar');
        return;
      }

      // Process in batches
      const batches = [];
      for (let i = 0; i < pending.length; i += optionsRef.current.batchSize) {
        batches.push(pending.slice(i, i + optionsRef.current.batchSize));
      }

      for (const batch of batches) {
        const batchPromises = batch.map(async (transaction) => {
          if (transaction.retryCount >= optionsRef.current.maxRetries) {
            result.failed++;
            result.errors.push(`Transaction ${transaction.id} exceeded max retries`);
            return false;
          }

          offlineStorage.updateTransactionStatus(transaction.id, 'syncing');
          const success = await syncTransaction(transaction);
          
          if (success) {
            result.synced++;
          } else {
            result.failed++;
            result.errors.push(`Transaction ${transaction.id} failed to sync`);
          }
          
          return success;
        });

        await Promise.allSettled(batchPromises);
      }

      result.success = result.failed === 0;
      offlineStorage.updateLastSync();
      
      if (result.synced > 0) {
        toast.success(`Sincronizadas ${result.synced} transacciones exitosamente`);
      }
      
      if (result.failed > 0) {
        toast.error(`Fallaron ${result.failed} transacciones`);
      }

    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown sync error');
      toast.error('Error durante la sincronización');
    } finally {
      setIsSyncing(false);
      setSyncResult(result);
      updateStatus();
    }
  }, [isSyncing, isOnline, updateStatus, syncTransaction]);

  const clearSynced = () => {
    offlineStorage.clearSyncedTransactions();
    updateStatus();
    toast.info('Transacciones sincronizadas eliminadas');
  };

  const exportOfflineData = (): string => {
    return offlineStorage.exportData();
  };

  const importOfflineData = (data: string): boolean => {
    const success = offlineStorage.importData(data);
    if (success) {
      updateStatus();
      toast.success('Datos offline importados exitosamente');
    } else {
      toast.error('Error al importar datos offline');
    }
    return success;
  };

  // Setup auto-sync interval
  useEffect(() => {
    if (optionsRef.current.autoSync && isOnline && !isSyncing) {
      syncIntervalRef.current = setInterval(() => {
        const pending = offlineStorage.getPendingTransactions();
        if (pending.length > 0) {
          syncNow();
        }
      }, optionsRef.current.syncInterval);
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [isOnline, isSyncing, syncNow]);

  // Update status on mount and when storage changes
  useEffect(() => {
    updateStatus();
    
    const handleStorageChange = () => updateStatus();
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [updateStatus]);

  return {
    isOnline,
    pendingTransactions,
    lastSync,
    storageSize,
    isSyncing,
    syncResult,
    syncNow,
    clearSynced,
    exportOfflineData,
    importOfflineData
  };
}
