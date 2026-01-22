import { SyncedStore, startRealtimeSync, attachOnlineResync, stopRealtimeSync } from '@/lib/sync';
import { SyncEvent, SyncState } from '@/lib/sync/types';

// Estado de inventario para ejemplo
interface InventoryState {
  stock: Record<string, number>;
  lastUpdate: string;
  updatedBy: string;
}

// Configuración del store para inventario
const inventoryConfig = {
  channel: 'inventory',
  entityId: 'store:main-inventory',
  branchId: 'store-01',
  posId: 'pos-01',
  debounceMs: 500 // 500ms de debounce para reducir escrituras
};

// Estrategia de merge para inventario (suma deltas para stock)
function inventoryMerge(local: InventoryState, remote: InventoryState, type: string): InventoryState {
  if (type.includes('stock.delta')) {
    // Para deltas de stock, sumar los cambios
    const mergedStock = { ...local.stock };
    Object.entries(remote.stock).forEach(([sku, delta]) => {
      mergedStock[sku] = (mergedStock[sku] || 0) + delta;
    });
    return {
      ...remote,
      stock: mergedStock
    };
  }
  
  // Para cambios completos, usar el estado remoto
  return remote;
}

// Crear store sincronizado
export const inventoryStore = new SyncedStore<InventoryState>(
  'inventory:main',
  {
    stock: {},
    lastUpdate: new Date().toISOString(),
    updatedBy: 'system'
  },
  inventoryConfig,
  inventoryMerge
);

// Funciones de utilidad para el inventario
export const inventoryActions = {
  // Actualizar stock de un producto
  updateStock: (sku: string, quantity: number, updatedBy?: string) => {
    const patch = {
      stock: { [sku]: quantity },
      lastUpdate: new Date().toISOString(),
      updatedBy: updatedBy || 'current-user'
    };
    inventoryStore.setState(patch, 'stock.update');
  },

  // Incrementar stock (delta)
  incrementStock: (sku: string, delta: number, updatedBy?: string) => {
    const currentStock = inventoryStore.getData().stock[sku] || 0;
    const newStock = currentStock + delta;
    
    const patch = {
      stock: { [sku]: newStock },
      lastUpdate: new Date().toISOString(),
      updatedBy: updatedBy || 'current-user'
    };
    inventoryStore.setState(patch, 'stock.delta');
  },

  // Obtener stock de un producto
  getStock: (sku: string): number => {
    return inventoryStore.getData().stock[sku] || 0;
  },

  // Obtener todo el inventario
  getInventory: (): Record<string, number> => {
    return inventoryStore.getData().stock;
  },

  // Suscribirse a cambios de inventario
  subscribe: (callback: (state: InventoryState) => void) => {
    return inventoryStore.subscribe((syncState: SyncState<InventoryState>) => {
      callback(syncState.data);
    });
  }
};

// Inicializar sincronización en tiempo real
let realtimeSubscription: any = null;
let resyncHandler: (() => void) | null = null;

export function startInventorySync() {
  // Sincronización en tiempo real
  realtimeSubscription = startRealtimeSync(
    inventoryConfig.channel,
    inventoryConfig.entityId,
    (event: SyncEvent) => {
      console.log('📡 Realtime inventory update:', event);
      const patch = event.payload as Partial<InventoryState>;
      inventoryStore.setState(patch, event.type);
    },
    (error: Error) => {
      console.error('❌ Realtime sync error:', error);
    }
  );

  // Re-sincronización al volver online
  resyncHandler = attachOnlineResync(
    inventoryConfig.channel,
    inventoryConfig.entityId,
    (event: SyncEvent) => {
      console.log('🔄 Resync inventory update:', event);
      const patch = event.payload as Partial<InventoryState>;
      inventoryStore.setState(patch, event.type);
    },
    (error: Error) => {
      console.error('❌ Resync error:', error);
    }
  );

  console.log('✅ Inventory sync started');
}

export function stopInventorySync() {
  if (realtimeSubscription) {
    stopRealtimeSync(realtimeSubscription);
    realtimeSubscription = null;
  }
  
  if (resyncHandler) {
    resyncHandler();
    resyncHandler = null;
  }
  
  console.log('⏹️ Inventory sync stopped');
}

// Auto-iniciar sincronización si estamos en el browser
if (typeof window !== 'undefined') {
  startInventorySync();
  
  // Cleanup al cerrar la página
  window.addEventListener('beforeunload', () => {
    stopInventorySync();
  });
}