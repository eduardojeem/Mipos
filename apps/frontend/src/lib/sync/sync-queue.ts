/**
 * Unified shim over legacy sync-queue
 * Re-exports using the new unified queue to prevent duplication
 */
import {
  UnifiedQueue,
  UnifiedSyncOperation,
  UnifiedExecutorRegistry,
  createRegistryBackedUnifiedQueue
} from './queue';

export interface SyncOperation {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: string;
  data: any;
  timestamp: Date;
  retryCount: number;
}

export interface SyncQueue {
  add(operation: SyncOperation): Promise<void>;
  process(): Promise<void>;
  getPending(): Promise<SyncOperation[]>;
}

type SyncExecutor = (operation: SyncOperation) => Promise<void>;

export class DefaultSyncQueue implements SyncQueue {
  private q: UnifiedQueue;
  private executor: SyncExecutor;

  constructor(executor: SyncExecutor) {
    this.executor = executor;
    const dispatcher = async (op: UnifiedSyncOperation) => {
      const converted: SyncOperation = {
        id: op.id,
        type: op.action === 'INSERT' ? 'CREATE' : op.action,
        entity: op.entity,
        data: op.payload,
        timestamp: new Date(op.timestamp),
        retryCount: op.retries || 0,
      } as SyncOperation;
      await this.executor(converted);
      return true;
    };
    this.q = new UnifiedQueue(dispatcher);
  }

  async getPending(): Promise<SyncOperation[]> {
    const pending = await this.q.getPending();
    return pending.map(op => ({
      id: op.id,
      type: op.action === 'INSERT' ? 'CREATE' : op.action,
      entity: op.entity,
      data: op.payload,
      timestamp: new Date(op.timestamp),
      retryCount: op.retries || 0,
    }));
  }

  async add(operation: SyncOperation): Promise<void> {
    const unified: UnifiedSyncOperation = {
      id: operation.id,
      entity: operation.entity,
      action: operation.type === 'CREATE' ? 'INSERT' : (operation.type as any),
      payload: operation.data,
      timestamp: operation.timestamp.getTime(),
      retries: operation.retryCount || 0,
    };
    await this.q.add(unified);
  }

  async process(): Promise<void> {
    await this.q.process();
  }
}

export class SyncExecutorRegistry {
  private reg = new UnifiedExecutorRegistry();
  register(entity: string, handler: SyncExecutor) {
    // Wrap legacy handler into boolean-return unified executor
    const unified = async (op: UnifiedSyncOperation) => {
      await handler({
        id: op.id,
        type: op.action === 'INSERT' ? 'CREATE' : op.action,
        entity: op.entity,
        data: op.payload,
        timestamp: new Date(op.timestamp),
        retryCount: op.retries || 0,
      });
      return true;
    };
    this.reg.register(entity, unified);
  }
  get(entity: string): ((operation: SyncOperation) => Promise<void>) | undefined {
    const h = this.reg.get(entity);
    if (!h) return undefined;
    return async (op: SyncOperation) => {
      await h({
        id: op.id,
        entity: op.entity,
        action: op.type === 'CREATE' ? 'INSERT' : (op.type as any),
        payload: op.data,
        timestamp: op.timestamp.getTime(),
        retries: op.retryCount || 0,
      });
    };
  }
}

export function createRegistryBackedQueue(registry: SyncExecutorRegistry): DefaultSyncQueue {
  // Keep legacy factory signature but internally use unified queue
  const unified = createRegistryBackedUnifiedQueue((registry as any).reg);
  const executor: SyncExecutor = async (op) => {
    // Dispatch through unified registry
    const h = (registry as any).reg.get(op.entity);
    if (!h) throw new Error(`No sync handler registered for entity: ${op.entity}`);
    await h({
      id: op.id,
      entity: op.entity,
      action: op.type === 'CREATE' ? 'INSERT' : (op.type as any),
      payload: op.data,
      timestamp: op.timestamp.getTime(),
      retries: op.retryCount || 0,
    });
  };
  return new DefaultSyncQueue(executor);
}