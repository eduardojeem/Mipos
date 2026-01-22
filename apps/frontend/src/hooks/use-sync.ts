import { useEffect, useState } from 'react';
import { inventoryActions, inventoryStore } from '../lib/sync/inventory-example';
import { SyncState } from '../lib/sync/types';

interface InventoryState {
  stock: Record<string, number>;
  lastUpdate: string;
  updatedBy: string;
}

export function useInventorySync() {
  const [inventory, setInventory] = useState<InventoryState>(inventoryStore.getData());
  const [syncState, setSyncState] = useState<SyncState<InventoryState>>(inventoryStore.getState());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Suscribirse a cambios del store
    const unsubscribe = inventoryStore.subscribe((newSyncState) => {
      setSyncState(newSyncState);
      setInventory(newSyncState.data);
      setIsLoading(false);
    });

    // Estado inicial
    setInventory(inventoryStore.getData());
    setSyncState(inventoryStore.getState());
    setIsLoading(false);

    return () => {
      unsubscribe();
    };
  }, []);

  const actions = {
    updateStock: inventoryActions.updateStock,
    incrementStock: inventoryActions.incrementStock,
    getStock: inventoryActions.getStock,
    getInventory: inventoryActions.getInventory
  };

  return {
    inventory,
    syncState,
    isLoading,
    actions
  };
}

// Hook para sincronización de estado específico
export function useSyncedState<T extends Record<string, any>>(
  store: any, // SyncedStore<T>
  selector?: (state: T) => any
) {
  const [state, setState] = useState<T>(store.getData());
  const [syncInfo, setSyncInfo] = useState(store.getState());

  useEffect(() => {
    const unsubscribe = store.subscribe((newSyncState: SyncState<T>) => {
      setState(newSyncState.data);
      setSyncInfo(newSyncState);
    });

    return () => {
      unsubscribe();
    };
  }, [store]);

  const selectedValue = selector ? selector(state) : state;

  return {
    data: selectedValue,
    fullState: state,
    syncInfo,
    setState: store.setState.bind(store)
  };
}