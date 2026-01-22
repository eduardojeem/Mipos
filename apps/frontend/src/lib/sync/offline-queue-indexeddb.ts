/**
 * IndexedDB-backed Offline Queue (Unified Sync Operations)
 * - Extiende OfflineQueueManager para persistir operaciones en IndexedDB
 * - Migra desde localStorage clave `sync.queue.v2` si existen datos
 * - Provee initialize(), add(), getPending() y process() con backoff
 */
import { OfflineQueueManager } from './offline-queue-manager';
import { UnifiedSyncOperation, UnifiedExecutorRegistry, UnifiedExecutor } from './queue';

type IDBOpRecord = UnifiedSyncOperation & { nextAttemptAt?: number };

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof indexedDB !== 'undefined';
}

function sleep(ms: number) { return new Promise(res => setTimeout(res, ms)); }

function jitteredBackoff(baseMs: number, maxMs: number, attempt: number, jitterMs: number): number {
  const exp = Math.min(baseMs * Math.pow(2, Math.max(0, attempt)), maxMs);
  const jitter = Math.floor(Math.random() * jitterMs);
  return exp + jitter;
}

export class IndexedDBOfflineQueue extends OfflineQueueManager {
  private db?: IDBDatabase;
  private readonly dbName = 'unified-sync-queue';
  private readonly storeName = 'ops';
  private readonly schemaVersion = 1;

  // Copia local del dispatcher/registry para usar en process() override
  private localDispatcher?: (op: UnifiedSyncOperation) => Promise<boolean>;
  private localRegistry: UnifiedExecutorRegistry = new UnifiedExecutorRegistry();

  constructor() {
    super();
  }

  override setDispatcher(dispatcher: (op: UnifiedSyncOperation) => Promise<boolean>): void {
    // Mantener compatibilidad con el manager base y nuestra copia local
    super.setDispatcher(dispatcher);
    this.localDispatcher = dispatcher;
  }

  override register(entity: string, handler: UnifiedExecutor) {
    super.register(entity, handler);
    this.localRegistry.register(entity, handler);
  }

  async initialize(): Promise<void> {
    if (!isBrowser()) return;
    this.db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(this.dbName, this.schemaVersion);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    // Migración desde localStorage (clave usada por UnifiedQueue)
    try {
      const raw = localStorage.getItem('sync.queue.v2');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const op of parsed as UnifiedSyncOperation[]) {
            await this.put({ ...(op as any) });
          }
        }
        // Limpiar localStorage tras migración
        localStorage.removeItem('sync.queue.v2');
      }
    } catch {
      // ignorar errores de migración
    }
  }

  private tx(mode: IDBTransactionMode): IDBObjectStore {
    if (!this.db) throw new Error('IndexedDB no inicializado');
    const tx = this.db.transaction(this.storeName, mode);
    return tx.objectStore(this.storeName);
  }

  private async put(op: IDBOpRecord): Promise<void> {
    const store = this.tx('readwrite');
    await new Promise<void>((resolve, reject) => {
      const req = store.put(op);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  private async delete(id: string): Promise<void> {
    const store = this.tx('readwrite');
    await new Promise<void>((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  private async getAll(): Promise<IDBOpRecord[]> {
    const store = this.tx('readonly');
    return await new Promise<IDBOpRecord[]>((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as any[]) || []);
      req.onerror = () => reject(req.error);
    });
  }

  override async add(op: UnifiedSyncOperation): Promise<void> {
    // Persistir en IndexedDB y activar procesamiento si estamos online
    await this.put({ ...(op as any) });
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      void this.process();
    }
  }

  override async getPending(): Promise<UnifiedSyncOperation[]> {
    const all = await this.getAll();
    return all as UnifiedSyncOperation[];
  }

  override async process(): Promise<void> {
    // Use parent implementation since IndexedDB operations are async
    await super.process();
  }
}

// Export conveniente
export const indexedDBOfflineQueue = new IndexedDBOfflineQueue();