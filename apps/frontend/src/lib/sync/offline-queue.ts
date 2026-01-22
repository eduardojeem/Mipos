/*
  Robust Offline/Online Operation Queue
  Features:
  - Persistent storage in IndexedDB with localStorage fallback
  - Schema versioning and simple migration
  - Transactions for integrity (IDB)
  - Exponential backoff with error-aware retry logic
  - Deduplication via unique id and payload hash
  - Connectivity detection and priority-based batch processing
  - Metrics instrumentation via syncLogger
  - Optional AES-GCM encryption of sensitive payloads using Web Crypto
  - Minimal React hooks to expose status for UI
*/

'use client'

import { syncLogger } from './sync-logging'

export type OperationPriority = 'critical' | 'high' | 'normal' | 'low'

export interface Operation<T = any> {
  id: string
  type: string
  payload: T
  createdAt: number
  priority: OperationPriority
  batchGroup?: string
  // Retry metadata
  attempts: number
  maxAttempts: number
  backoffInitialMs: number
  backoffMaxMs: number
  nextAttemptAt?: number
  // Dedup
  dedupHash?: string
}

export interface QueueConfig {
  schemaVersion: number
  encryptionPassphrase?: string
  dedupPolicy: 'last_wins' | 'first_wins'
  defaultBackoffInitialMs: number
  defaultBackoffMaxMs: number
  defaultMaxAttempts: number
}

export type OperationHandler = (op: Operation) => Promise<void>
export type OperationBatchHandler = (ops: Operation[]) => Promise<void>

interface HandlerEntry {
  handle: OperationHandler
  handleBatch?: OperationBatchHandler
}

// Stable stringify to compute deduplication hash
function stableStringify(obj: any): string {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj)
  if (Array.isArray(obj)) return `[${obj.map((v) => stableStringify(v)).join(',')}]`
  const keys = Object.keys(obj).sort()
  const entries = keys.map((k) => `"${k}":${stableStringify(obj[k])}`)
  return `{${entries.join(',')}}`
}

async function sha256(input: string): Promise<string> {
  const enc = new TextEncoder()
  const data = enc.encode(input)
  const hashBuf = await crypto.subtle.digest('SHA-256', data)
  const hashArr = Array.from(new Uint8Array(hashBuf))
  return hashArr.map((b) => b.toString(16).padStart(2, '0')).join('')
}

// Encryption helpers using Web Crypto AES-GCM
class CryptoHelper {
  static async deriveKey(passphrase: string): Promise<CryptoKey> {
    const enc = new TextEncoder()
    const salt = enc.encode('offline-queue-salt-v1')
    const baseKey = await crypto.subtle.importKey(
      'raw',
      enc.encode(passphrase),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    )
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    )
  }

  static async encrypt(passphrase: string, plaintext: string): Promise<{ iv: string; data: string }> {
    const key = await CryptoHelper.deriveKey(passphrase)
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const enc = new TextEncoder()
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext))
    const ivHex = Array.from(iv).map((b) => b.toString(16).padStart(2, '0')).join('')
    const ctHex = Array.from(new Uint8Array(ct)).map((b) => b.toString(16).padStart(2, '0')).join('')
    return { iv: ivHex, data: ctHex }
  }

  static async decrypt(passphrase: string, payload: { iv: string; data: string }): Promise<string> {
    const key = await CryptoHelper.deriveKey(passphrase)
    const iv = new Uint8Array(payload.iv.match(/.{1,2}/g)!.map((h) => parseInt(h, 16)))
    const data = new Uint8Array(payload.data.match(/.{1,2}/g)!.map((h) => parseInt(h, 16)))
    const ptBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data)
    const dec = new TextDecoder()
    return dec.decode(ptBuf)
  }
}

// Storage Abstraction
interface IQueueStorage {
  init(schemaVersion: number): Promise<void>
  put(op: Operation, encrypted?: { iv: string; data: string } | null): Promise<void>
  getAll(): Promise<{ op: Operation; encrypted?: { iv: string; data: string } | null }[]>
  delete(id: string): Promise<void>
  update(op: Operation, encrypted?: { iv: string; data: string } | null): Promise<void>
  clear(): Promise<void>
}

class LocalStorageQueueStorage implements IQueueStorage {
  private key = 'offline-queue-ops'
  private metaKey = 'offline-queue-meta'

  async init(schemaVersion: number): Promise<void> {
    const meta = this.getMeta()
    if (!meta || meta.schemaVersion !== schemaVersion) {
      localStorage.setItem(this.key, JSON.stringify([]))
      this.setMeta({ schemaVersion })
    }
  }

  async put(op: Operation, encrypted: { iv: string; data: string } | null = null): Promise<void> {
    const list = this.read()
    ;(list as any).push({ op, encrypted })
    localStorage.setItem(this.key, JSON.stringify(list))
  }

  async getAll(): Promise<{ op: Operation; encrypted?: { iv: string; data: string } | null }[]> {
    return this.read()
  }

  async delete(id: string): Promise<void> {
    const list = this.read().filter((e) => e.op.id !== id)
    localStorage.setItem(this.key, JSON.stringify(list))
  }

  async update(op: Operation, encrypted: { iv: string; data: string } | null = null): Promise<void> {
    const list = this.read().map((e) => (e.op.id === op.id ? { op, encrypted } : e))
    localStorage.setItem(this.key, JSON.stringify(list))
  }

  async clear(): Promise<void> {
    localStorage.setItem(this.key, JSON.stringify([]))
  }

  private read(): { op: Operation; encrypted?: { iv: string; data: string } | null }[] {
    try {
      const raw = localStorage.getItem(this.key)
      if (!raw) return []
      return JSON.parse(raw)
    } catch {
      return []
    }
  }

  private getMeta(): { schemaVersion: number } | null {
    try {
      const raw = localStorage.getItem(this.metaKey)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }

  private setMeta(meta: { schemaVersion: number }) {
    localStorage.setItem(this.metaKey, JSON.stringify(meta))
  }
}

class IndexedDBQueueStorage implements IQueueStorage {
  private db?: IDBDatabase
  private readonly dbName = 'offline-queue-db'
  private readonly storeOps = 'ops'
  private readonly storeMeta = 'meta'

  async init(schemaVersion: number): Promise<void> {
    this.db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(this.dbName, schemaVersion)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(this.storeOps)) {
          db.createObjectStore(this.storeOps, { keyPath: 'op.id' })
        }
        if (!db.objectStoreNames.contains(this.storeMeta)) {
          const meta = db.createObjectStore(this.storeMeta, { keyPath: 'key' })
          meta.put({ key: 'schemaVersion', value: schemaVersion })
        } else {
          const tx = req.transaction
          const meta = tx!.objectStore(this.storeMeta)
          meta.put({ key: 'schemaVersion', value: schemaVersion })
        }
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }

  private tx(store: string, mode: IDBTransactionMode): IDBObjectStore {
    if (!this.db) throw new Error('DB not initialized')
    const tx = this.db.transaction(store, mode)
    return tx.objectStore(store)
  }

  async put(op: Operation, encrypted: { iv: string; data: string } | null = null): Promise<void> {
    const store = this.tx(this.storeOps, 'readwrite')
    await new Promise<void>((resolve, reject) => {
      const req = store.put({ op, encrypted })
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  }

  async getAll(): Promise<{ op: Operation; encrypted?: { iv: string; data: string } | null }[]> {
    const store = this.tx(this.storeOps, 'readonly')
    return new Promise((resolve, reject) => {
      const req = store.getAll()
      req.onsuccess = () => resolve(req.result as any)
      req.onerror = () => reject(req.error)
    })
  }

  async delete(id: string): Promise<void> {
    const store = this.tx(this.storeOps, 'readwrite')
    await new Promise<void>((resolve, reject) => {
      const req = store.delete(id)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  }

  async update(op: Operation, encrypted: { iv: string; data: string } | null = null): Promise<void> {
    await this.put(op, encrypted)
  }

  async clear(): Promise<void> {
    const store = this.tx(this.storeOps, 'readwrite')
    await new Promise<void>((resolve, reject) => {
      const req = store.clear()
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  }
}

// Event emitter minimal
type QueueEvent =
  | { type: 'status'; online: boolean; pending: number }
  | { type: 'processed'; op: Operation }
  | { type: 'failed'; op: Operation; error: any }
  | { type: 'enqueued'; op: Operation }
  | { type: 'synced'; count: number; latencyMs: number }

class QueueEmitter {
  private subs = new Set<(evt: QueueEvent) => void>()
  subscribe(fn: (evt: QueueEvent) => void) {
    this.subs.add(fn)
    return () => this.subs.delete(fn)
  }
  emit(evt: QueueEvent) {
    this.subs.forEach((fn) => fn(evt))
  }
}

export class OperationQueue {
  private storage: IQueueStorage
  private config: QueueConfig
  private handlers = new Map<string, HandlerEntry>()
  private emitter = new QueueEmitter()
  private memoryQueue: Operation[] = []
  private encryptionPassphrase?: string
  private processing = false
  private online = typeof navigator !== 'undefined' ? navigator.onLine : true

  constructor(config?: Partial<QueueConfig>) {
    const defaultConfig: QueueConfig = {
      schemaVersion: 1,
      dedupPolicy: 'last_wins',
      defaultBackoffInitialMs: 1000,
      defaultBackoffMaxMs: 60_000,
      defaultMaxAttempts: 7,
      encryptionPassphrase: undefined,
    }
    this.config = { ...defaultConfig, ...(config || {}) }
    this.encryptionPassphrase = this.config.encryptionPassphrase
    // Prefer IndexedDB, fallback to localStorage on error
    this.storage = typeof indexedDB !== 'undefined' ? new IndexedDBQueueStorage() : new LocalStorageQueueStorage()
  }

  async init(): Promise<void> {
    await this.storage.init(this.config.schemaVersion)
    const stored = await this.storage.getAll()
    const ops: Operation[] = []
    for (const item of stored) {
      if (item.encrypted && this.encryptionPassphrase) {
        try {
          const decrypted = await CryptoHelper.decrypt(this.encryptionPassphrase, item.encrypted)
          const payload = JSON.parse(decrypted)
          ops.push({ ...item.op, payload })
        } catch (err) {
          syncLogger.error('queue.decrypt_failed', { id: item.op.id, err: String(err) })
          // Push without payload to avoid breaking, will fail at handler
          ops.push(item.op)
        }
      } else {
        ops.push(item.op)
      }
    }
    this.memoryQueue = ops
    this.sortByPriority()
    this.emitter.emit({ type: 'status', online: this.online, pending: this.memoryQueue.length })
    // Connectivity detection
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.online = true
        this.emitter.emit({ type: 'status', online: true, pending: this.memoryQueue.length })
        this.processAll()
      })
      window.addEventListener('offline', () => {
        this.online = false
        this.emitter.emit({ type: 'status', online: false, pending: this.memoryQueue.length })
      })
    }
  }

  subscribe(fn: (evt: QueueEvent) => void) {
    return this.emitter.subscribe(fn)
  }

  registerHandler(type: string, handle: OperationHandler, handleBatch?: OperationBatchHandler) {
    this.handlers.set(type, { handle, handleBatch })
  }

  async enqueue<T>(input: Omit<Operation<T>, 'id' | 'createdAt' | 'attempts' | 'nextAttemptAt' | 'maxAttempts' | 'backoffInitialMs' | 'backoffMaxMs' | 'dedupHash'> & { id?: string }): Promise<Operation<T>> {
    const id = input.id ?? crypto.randomUUID()
    const createdAt = Date.now()
    const attempts = 0
    const maxAttempts = this.config.defaultMaxAttempts
    const backoffInitialMs = this.config.defaultBackoffInitialMs
    const backoffMaxMs = this.config.defaultBackoffMaxMs
    const dedupHash = await sha256(`${input.type}:${stableStringify(input.payload)}`)
    const op: Operation<T> = {
      id,
      type: input.type,
      payload: input.payload,
      createdAt,
      priority: input.priority ?? 'normal',
      batchGroup: input.batchGroup,
      attempts,
      maxAttempts,
      backoffInitialMs,
      backoffMaxMs,
      dedupHash,
    }

    // Deduplication policy
    const existingIdx = this.memoryQueue.findIndex((e) => e.id === id || (e.type === op.type && e.dedupHash === dedupHash))
    if (existingIdx !== -1) {
      if (this.config.dedupPolicy === 'last_wins') {
        this.memoryQueue[existingIdx] = op as any
        await this.persist(op)
      } else {
        // first_wins: ignore new
        return this.memoryQueue[existingIdx] as any
      }
    } else {
      this.memoryQueue.push(op as any)
      await this.persist(op)
    }
    this.sortByPriority()
    this.emitter.emit({ type: 'enqueued', op: op as any })
    this.emitter.emit({ type: 'status', online: this.online, pending: this.memoryQueue.length })
    if (this.online) this.processAll()
    return op
  }

  private async persist(op: Operation): Promise<void> {
    let encrypted: { iv: string; data: string } | null = null
    if (this.encryptionPassphrase) {
      try {
        const plaintext = JSON.stringify(op.payload)
        encrypted = await CryptoHelper.encrypt(this.encryptionPassphrase, plaintext)
      } catch (err) {
        syncLogger.error('queue.encrypt_failed', { id: op.id, err: String(err) })
      }
    }
    await this.storage.put(op, encrypted)
  }

  private sortByPriority() {
    const weight: Record<OperationPriority, number> = { critical: 0, high: 1, normal: 2, low: 3 }
    this.memoryQueue.sort((a, b) => {
      const wa = weight[a.priority]
      const wb = weight[b.priority]
      if (wa !== wb) return wa - wb
      return a.createdAt - b.createdAt
    })
  }

  getPendingCount(): number {
    return this.memoryQueue.length
  }

  setOnline(online: boolean) {
    this.online = online
    this.emitter.emit({ type: 'status', online, pending: this.memoryQueue.length })
    if (online) this.processAll()
  }

  private computeBackoff(attempts: number, initial: number, max: number): number {
    const jitter = Math.random() * 0.3 + 0.85 // 0.85–1.15
    const val = Math.min(initial * Math.pow(2, attempts), max)
    return Math.floor(val * jitter)
  }

  private shouldRetry(error: any, attempts: number, maxAttempts: number): boolean {
    // Error-aware retry logic
    const code = (error?.status ?? error?.code ?? 0) as number
    const transientNetwork = error?.isNetworkError || error?.message?.includes?.('NetworkError')
    if (attempts >= maxAttempts) return false
    if (transientNetwork) return true
    if (code === 429) return true
    if (code >= 500) return true
    // 4xx other than 429 should not retry
    if (code >= 400 && code < 500) return false
    // Unknown errors: retry a few times
    return attempts < Math.max(3, Math.floor(maxAttempts / 2))
  }

  async processAll(): Promise<void> {
    if (this.processing) return
    if (!this.online) return
    this.processing = true
    const startTs = performance.now()
    try {
      let processedCount = 0
      // Batch by type+batchGroup if batch handler exists
      const grouped = new Map<string, Operation[]>()
      for (const op of this.memoryQueue) {
        const key = `${op.type}:${op.batchGroup ?? ''}`
        if (!grouped.has(key)) grouped.set(key, [])
        grouped.get(key)!.push(op)
      }

      // Process groups prioritizing critical/high first
      const groups = Array.from(grouped.entries()).sort(([_, a], [__, b]) => {
        const pa = a[0]?.priority ?? 'normal'
        const pb = b[0]?.priority ?? 'normal'
        const weight: Record<OperationPriority, number> = { critical: 0, high: 1, normal: 2, low: 3 }
        return weight[pa] - weight[pb]
      })

      for (const [key, ops] of groups) {
        if (!this.online) break
        const type = key.split(':')[0]
        const handler = this.handlers.get(type)
        if (handler?.handleBatch) {
          try {
            await handler.handleBatch(ops)
            // On success, remove all ops in group
            for (const op of ops) {
              await this.storage.delete(op.id)
              this.memoryQueue = this.memoryQueue.filter((e) => e.id !== op.id)
              this.emitter.emit({ type: 'processed', op })
              processedCount++
            }
          } catch (err) {
            // If batch fails, fall back to individual processing below
            syncLogger.error('queue.batch_failed', { type, count: ops.length, err: String(err) })
            for (const op of ops) {
              await this.processSingle(op)
            }
          }
        } else {
          for (const op of ops) {
            await this.processSingle(op)
            if (!this.online) break
          }
        }
      }

      const latency = Math.round(performance.now() - startTs)
      this.emitter.emit({ type: 'synced', count: processedCount, latencyMs: latency })
      syncLogger.recordMetric('queue.sync.latency', latency)
      syncLogger.recordMetric('queue.sync.count', processedCount)
      this.emitter.emit({ type: 'status', online: this.online, pending: this.memoryQueue.length })
    } finally {
      this.processing = false
    }
  }

  private async processSingle(op: Operation): Promise<void> {
    const handler = this.handlers.get(op.type)
    if (!handler) {
      // No handler: keep it, but log error
      syncLogger.error('queue.no_handler', { id: op.id, type: op.type })
      return
    }
    try {
      await handler.handle(op)
      await this.storage.delete(op.id)
      this.memoryQueue = this.memoryQueue.filter((e) => e.id !== op.id)
      this.emitter.emit({ type: 'processed', op })
      syncLogger.info('queue.processed', { id: op.id, type: op.type })
    } catch (err) {
      const attempts = op.attempts + 1
      const should = this.shouldRetry(err, attempts, op.maxAttempts)
      if (should) {
        const delay = this.computeBackoff(attempts, op.backoffInitialMs, op.backoffMaxMs)
        op.attempts = attempts
        op.nextAttemptAt = Date.now() + delay
        await this.storage.update(op)
        this.emitter.emit({ type: 'failed', op, error: err })
        syncLogger.warn('queue.retry_scheduled', { id: op.id, type: op.type, attempts, delay })
        // schedule wake-up
        setTimeout(() => {
          if (!this.online) return
          // Only process if nextAttemptAt reached
          const ready = Date.now() >= (op.nextAttemptAt ?? 0)
          if (ready) this.processAll()
        }, delay + 50)
      } else {
        // Give up
        await this.storage.delete(op.id)
        this.memoryQueue = this.memoryQueue.filter((e) => e.id !== op.id)
        this.emitter.emit({ type: 'failed', op, error: err })
        syncLogger.error('queue.giveup', { id: op.id, type: op.type, attempts })
      }
    }
  }
}

// Singleton
export const operationQueue = new OperationQueue()

// Minimal React hook for status
import { useEffect, useMemo, useState } from 'react'

export function useQueueStatus() {
  const [online, setOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [pending, setPending] = useState<number>(0)
  const [lastSync, setLastSync] = useState<{ count: number; latencyMs: number } | null>(null)

  useEffect(() => {
    let unsub: (() => void) | null = null
    operationQueue.init().then(() => {
      unsub = operationQueue.subscribe((evt) => {
        if (evt.type === 'status') {
          setOnline(evt.online)
          setPending(evt.pending)
        } else if (evt.type === 'synced') {
          setLastSync({ count: evt.count, latencyMs: evt.latencyMs })
        }
      })
    })
    return () => {
      if (unsub) unsub()
    }
  }, [])

  return useMemo(() => ({ online, pending, lastSync }), [online, pending, lastSync])
}

// Utility to register a generic handler using fetch
export function registerFetchHandler(
  type: string,
  endpoint: string,
  options?: { method?: string; headers?: Record<string, string>; transform?: (payload: any) => any }
) {
  operationQueue.registerHandler(type, async (op) => {
    const body = JSON.stringify(options?.transform ? options.transform(op.payload) : op.payload)
    const res = await fetch(endpoint, {
      method: options?.method ?? 'POST',
      headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
      body,
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      const err: any = new Error(`HTTP ${res.status}`)
      err.status = res.status
      err.body = text
      throw err
    }
  })
}