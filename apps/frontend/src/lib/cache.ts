type Json = string | number | boolean | null | Json[] | { [k: string]: Json }

export type CacheOptions = {
  ttl: number
  key: string
  persist?: boolean
}

export type CacheRecord<T = any> = {
  key: string
  value: T
  timestamp: number
  ttl: number
}

const STORAGE_PREFIX = 'beautypos:cache:'

export const Cache = {
  set<T extends Json>(value: T, opts: CacheOptions) {
    const record: CacheRecord<T> = {
      key: opts.key,
      value,
      ttl: opts.ttl,
      timestamp: Date.now(),
    }
    if (opts.persist) {
      try {
        localStorage.setItem(STORAGE_PREFIX + opts.key, JSON.stringify(record))
      } catch {}
    }
    return record
  },
  get<T>(key: string): T | undefined {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + key)
      if (!raw) return undefined
      const record = JSON.parse(raw) as CacheRecord<T>
      const expired = Date.now() - record.timestamp > record.ttl
      return expired ? undefined : record.value
    } catch {
      return undefined
    }
  },
  invalidate(key: string) {
    try { localStorage.removeItem(STORAGE_PREFIX + key) } catch {}
  },
  clear() {
    try {
      const keys = Object.keys(localStorage)
      keys.forEach(k => { if (k.startsWith(STORAGE_PREFIX)) localStorage.removeItem(k) })
    } catch {}
  },
}

export async function offlineFirst<T>(fetcher: () => Promise<T>, opts: CacheOptions): Promise<T> {
  const cached = Cache.get<T>(opts.key)
  const online = typeof navigator !== 'undefined' ? navigator.onLine : true
  if (cached && (!online)) return cached
  try {
    const value = await fetcher()
    Cache.set(value as any, { ...opts, persist: true })
    return value
  } catch (e) {
    if (cached) return cached
    throw e
  }
}