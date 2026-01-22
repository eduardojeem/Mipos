/**
 * Unified Sync Queue
 * - Canonical interface for offline/online operations
 * - Adapters for legacy queues
 * - LocalStorage persistence with exponential backoff and jitter
 */

export type SyncAction = 'INSERT' | 'UPDATE' | 'DELETE';

export interface UnifiedSyncOperation<T = any> {
  id: string;
  entity: string;
  action: SyncAction;
  payload: T;
  timestamp: number;
  retries: number;
  maxRetries?: number;
}

export interface UnifiedSyncQueue {
  add<T = any>(op: UnifiedSyncOperation<T>): Promise<void>;
  process(): Promise<void>;
  getPending(): Promise<UnifiedSyncOperation[]>;
  getFailed(): UnifiedSyncOperation[];
  clearFailed(): void;
  setDispatcher(dispatcher: (op: UnifiedSyncOperation) => Promise<boolean>): void;
}

const STORAGE_KEY = 'sync.queue.v2';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function jitteredBackoff(retries: number): number {
  const base = 800;
  const exp = base * Math.pow(2, Math.max(0, retries));
  const jitter = Math.random() * (exp * 0.35);
  return Math.min(30_000, exp + jitter);
}

function load(): UnifiedSyncOperation[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as UnifiedSyncOperation[];
  } catch {
    return [];
  }
}

function save(ops: UnifiedSyncOperation[]) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ops));
  } catch {
    // ignore
  }
}

export class UnifiedQueue implements UnifiedSyncQueue {
  private pending: UnifiedSyncOperation[] = [];
  private failed: UnifiedSyncOperation[] = [];
  private processing = false;
  private dispatcher?: (op: UnifiedSyncOperation) => Promise<boolean>;

  constructor(dispatcher?: (op: UnifiedSyncOperation) => Promise<boolean>) {
    this.pending = load();
    this.dispatcher = dispatcher;
    if (isBrowser()) {
      window.addEventListener('online', () => {
        this.process().catch(() => {/* no-op */});
      });
    }
  }

  setDispatcher(dispatcher: (op: UnifiedSyncOperation) => Promise<boolean>): void {
    this.dispatcher = dispatcher;
  }

  async getPending(): Promise<UnifiedSyncOperation[]> {
    return [...this.pending];
  }

  getFailed(): UnifiedSyncOperation[] {
    return [...this.failed];
  }

  clearFailed(): void {
    this.failed = [];
  }

  async add<T = any>(op: UnifiedSyncOperation<T>): Promise<void> {
    // Deduplicate by id and collapse UPDATEs
    const existingIdx = this.pending.findIndex(o => o.id === op.id);
    if (existingIdx >= 0) {
      const existing = this.pending[existingIdx];
      if (op.action === 'UPDATE') {
        this.pending[existingIdx] = { ...existing, payload: op.payload, timestamp: op.timestamp };
      } // else ignore duplicate INSERT/DELETE
    } else {
      this.pending.push(op as UnifiedSyncOperation);
    }
    save(this.pending);

    if (isBrowser() && navigator.onLine && !this.processing) {
      void this.process();
    }
  }

  async process(): Promise<void> {
    if (this.processing) return;
    if (this.pending.length === 0) return;
    if (!this.dispatcher) return; // nothing to do
    this.processing = true;

    try {
      for (let i = 0; i < this.pending.length;) {
        const op = this.pending[i];
        try {
          const ok = await this.dispatcher(op);
          if (ok) {
            // remove from queue
            this.pending.splice(i, 1);
            save(this.pending);
          } else {
            // failure path
            op.retries = (op.retries ?? 0) + 1;
            this.failed.push({ ...op });
            save(this.pending);

            // offline short-circuit
            if (isBrowser() && !navigator.onLine) break;

            // backoff
            const delay = jitteredBackoff(op.retries);
            await new Promise(res => setTimeout(res, delay));
            i++; // advance to avoid hot-loop
          }
        } catch (err) {
          op.retries = (op.retries ?? 0) + 1;
          this.failed.push({ ...op });
          save(this.pending);
          if (isBrowser() && !navigator.onLine) break;
          const delay = jitteredBackoff(op.retries);
          await new Promise(res => setTimeout(res, delay));
          i++;
        }
      }
    } finally {
      this.processing = false;
    }
  }
}

// Registry adapter for entity-specific handlers
export type UnifiedExecutor = (op: UnifiedSyncOperation) => Promise<boolean>;

export class UnifiedExecutorRegistry {
  private handlers = new Map<string, UnifiedExecutor>();
  register(entity: string, handler: UnifiedExecutor) {
    this.handlers.set(entity, handler);
  }
  get(entity: string): UnifiedExecutor | undefined {
    return this.handlers.get(entity);
  }
}

export function createRegistryBackedUnifiedQueue(registry: UnifiedExecutorRegistry): UnifiedQueue {
  const dispatcher = async (op: UnifiedSyncOperation) => {
    const handler = registry.get(op.entity);
    if (!handler) throw new Error(`No unified handler for entity: ${op.entity}`);
    return await handler(op);
  };
  return new UnifiedQueue(dispatcher);
}