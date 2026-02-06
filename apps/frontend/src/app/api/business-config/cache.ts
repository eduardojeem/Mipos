import type { BusinessConfig } from '@/types/business-config'

type CachedConfig = { config: BusinessConfig; expiresAt: number }
const configCache = new Map<string, CachedConfig>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export function getCachedConfig(orgId: string): BusinessConfig | null {
  const cached = configCache.get(orgId)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.config
  }
  configCache.delete(orgId)
  return null
}

export function setCachedConfig(orgId: string, config: BusinessConfig): void {
  configCache.set(orgId, {
    config,
    expiresAt: Date.now() + CACHE_TTL
  })
}

export function invalidateCachedConfig(orgId: string): void {
  configCache.delete(orgId)
}

export function clearBusinessConfigCache(): void {
  configCache.clear()
}

export const cacheTtlMs = CACHE_TTL

