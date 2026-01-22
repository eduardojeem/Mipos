export type SyncEvent = {
  id?: string;
  channel: string;
  entity_id: string;
  type: string;
  payload: any;
  version?: number;
  origin: string;
  branch_id?: string | null;
  pos_id?: string | null;
  created_at?: string;
  retry_count?: number;
  max_retries?: number;
};

export type SyncStoreConfig = {
  channel: string;
  entityId: string;
  branchId?: string | null;
  posId?: string | null;
  debounceMs?: number;
};

export type SyncState<T> = {
  data: T;
  version: number;
  lastSync: string | null;
  isOnline: boolean;
};

export type SyncListener<T> = (state: SyncState<T>) => void;