/**
 * Offline Queue Manager
 * - Persistencia local (localStorage; extensible a IndexedDB)
 * - Reintentos con backoff exponencial y jitter
 * - Idempotencia por id de operación
 */
import {
  UnifiedQueue,
  UnifiedSyncOperation,
  createRegistryBackedUnifiedQueue,
  UnifiedExecutor,
  UnifiedExecutorRegistry
} from './queue';

function sleep(ms: number) { return new Promise(res => setTimeout(res, ms)); }

export interface OfflineQueueConfig {
  baseRetryMs: number;
  maxRetryMs: number;
  jitterMs: number;
}

export class OfflineQueueManager {
  private queue: UnifiedQueue;
  private registry: UnifiedExecutorRegistry;
  private dispatcher?: (op: UnifiedSyncOperation) => Promise<boolean>;
  private processing = false;
  private config: OfflineQueueConfig = {
    baseRetryMs: 1500,
    maxRetryMs: 20000,
    jitterMs: 250
  };

  constructor(config?: Partial<OfflineQueueConfig>) {
    this.registry = new UnifiedExecutorRegistry();
    this.queue = createRegistryBackedUnifiedQueue(this.registry);
    if (config) this.config = { ...this.config, ...config };
  }

  setDispatcher(dispatcher: (op: UnifiedSyncOperation) => Promise<boolean>): void {
    this.dispatcher = dispatcher;
    // Registrar handler genérico por entidad si se conoce
  }

  register(entity: string, handler: UnifiedExecutor) {
    this.registry.register(entity, async (op) => {
      const ok = await handler(op);
      return ok;
    });
  }

  async add(op: UnifiedSyncOperation) {
    await this.queue.add(op);
  }

  async getPending(): Promise<UnifiedSyncOperation[]> { return await this.queue.getPending(); }

  async process(): Promise<void> {
    if (this.processing) return;
    this.processing = true;
    try {
      const pending = await this.queue.getPending();
      for (const op of pending) {
        let attempt = op.retries ?? 0;
        const max = op.maxRetries ?? 5;
        let success = false;
        while (attempt < max && !success) {
          const jitter = Math.floor(Math.random() * this.config.jitterMs);
          const backoff = Math.min(this.config.baseRetryMs * Math.pow(2, attempt), this.config.maxRetryMs) + jitter;
          try {
            if (this.dispatcher) {
              success = await this.dispatcher(op);
            } else {
              const handler = this.registry.get(op.entity);
              success = handler ? await handler(op) : false;
            }
          } catch (error) {
            success = false;
          }
          if (!success) {
            attempt += 1;
            await sleep(backoff);
          }
        }
        // La UnifiedQueue actualiza estado internamente en process()
      }
      await this.queue.process();
    } finally {
      this.processing = false;
    }
  }
}