/**
 * Admin Data Cache Utility
 * 
 * Provides caching functionality for superadmin data with:
 * - localStorage persistence
 * - Cache versioning for invalidation
 * - Staleness detection based on timestamp
 * - Type-safe interfaces
 * 
 * Requirements: 10.4
 */

import type { Organization, AdminStats } from '@/app/superadmin/hooks/useAdminData';

/**
 * Cache version for invalidation when schema changes
 * Increment this when the data structure changes
 */
const CACHE_VERSION = '1.0.0';

/**
 * localStorage key for admin data cache
 */
const CACHE_KEY = 'admin-data-cache';

/**
 * Maximum age of cached data in milliseconds (30 minutes)
 */
const MAX_CACHE_AGE_MS = 30 * 60 * 1000;

/**
 * Interface for cached admin data
 */
export interface CachedData {
  organizations: Organization[];
  stats: AdminStats;
  timestamp: Date;
  isStale: boolean;
  version: string;
}

/**
 * Internal storage format for localStorage
 */
interface CachedDataStorage {
  organizations: Organization[];
  stats: AdminStats;
  timestamp: string; // ISO string for JSON serialization
  version: string;
}

/**
 * Check if code is running in browser environment
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

/**
 * Calculate if cached data is stale based on timestamp
 * 
 * @param timestamp - The timestamp when data was cached
 * @returns true if data is older than MAX_CACHE_AGE_MS
 */
export function isDataStale(timestamp: Date): boolean {
  const now = new Date();
  const ageMs = now.getTime() - timestamp.getTime();
  return ageMs > MAX_CACHE_AGE_MS;
}

/**
 * Save admin data to localStorage cache
 * 
 * @param organizations - Array of organizations to cache
 * @param stats - Admin statistics to cache
 * @returns true if save was successful, false otherwise
 */
export function saveAdminDataCache(
  organizations: Organization[],
  stats: AdminStats
): boolean {
  if (!isBrowser()) {
    console.warn('⚠️ [admin-data-cache] Cannot save cache: not in browser environment');
    return false;
  }

  try {
    const cacheData: CachedDataStorage = {
      organizations,
      stats,
      timestamp: new Date().toISOString(),
      version: CACHE_VERSION,
    };

    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    console.log('✅ [admin-data-cache] Cache saved successfully', {
      organizationCount: organizations.length,
      timestamp: cacheData.timestamp,
      version: cacheData.version,
    });
    return true;
  } catch (error) {
    console.error('❌ [admin-data-cache] Failed to save cache:', error);
    return false;
  }
}

/**
 * Load admin data from localStorage cache
 * 
 * @returns Cached data with staleness indicator, or null if no valid cache exists
 */
export function loadAdminDataCache(): CachedData | null {
  if (!isBrowser()) {
    console.warn('⚠️ [admin-data-cache] Cannot load cache: not in browser environment');
    return null;
  }

  try {
    const raw = localStorage.getItem(CACHE_KEY);
    
    if (!raw) {
      console.log('ℹ️ [admin-data-cache] No cache found');
      return null;
    }

    const stored: CachedDataStorage = JSON.parse(raw);

    // Validate cache version
    if (stored.version !== CACHE_VERSION) {
      console.warn('⚠️ [admin-data-cache] Cache version mismatch, invalidating cache', {
        storedVersion: stored.version,
        currentVersion: CACHE_VERSION,
      });
      clearAdminDataCache();
      return null;
    }

    // Validate required fields
    if (!stored.organizations || !stored.stats || !stored.timestamp) {
      console.warn('⚠️ [admin-data-cache] Invalid cache structure, clearing cache');
      clearAdminDataCache();
      return null;
    }

    const timestamp = new Date(stored.timestamp);
    const isStale = isDataStale(timestamp);

    console.log('✅ [admin-data-cache] Cache loaded successfully', {
      organizationCount: stored.organizations.length,
      timestamp: stored.timestamp,
      isStale,
      ageMinutes: Math.round((new Date().getTime() - timestamp.getTime()) / 60000),
    });

    return {
      organizations: stored.organizations,
      stats: stored.stats,
      timestamp,
      isStale,
      version: stored.version,
    };
  } catch (error) {
    console.error('❌ [admin-data-cache] Failed to load cache:', error);
    clearAdminDataCache();
    return null;
  }
}

/**
 * Clear admin data cache from localStorage
 * 
 * @returns true if clear was successful, false otherwise
 */
export function clearAdminDataCache(): boolean {
  if (!isBrowser()) {
    console.warn('⚠️ [admin-data-cache] Cannot clear cache: not in browser environment');
    return false;
  }

  try {
    localStorage.removeItem(CACHE_KEY);
    console.log('✅ [admin-data-cache] Cache cleared successfully');
    return true;
  } catch (error) {
    console.error('❌ [admin-data-cache] Failed to clear cache:', error);
    return false;
  }
}

/**
 * Get the age of cached data in milliseconds
 * 
 * @returns Age in milliseconds, or null if no cache exists
 */
export function getCacheAge(): number | null {
  const cached = loadAdminDataCache();
  if (!cached) {
    return null;
  }

  const now = new Date();
  return now.getTime() - cached.timestamp.getTime();
}

/**
 * Check if cache exists and is valid (not expired due to version mismatch)
 * 
 * @returns true if valid cache exists, false otherwise
 */
export function hasCachedData(): boolean {
  const cached = loadAdminDataCache();
  return cached !== null;
}
