/**
 * Unit tests for admin data cache utility
 * 
 * Tests cover:
 * - Saving and loading cache data
 * - Cache versioning and invalidation
 * - Staleness detection
 * - Error handling
 * - Browser environment checks
 */

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import {
  saveAdminDataCache,
  loadAdminDataCache,
  clearAdminDataCache,
  isDataStale,
  getCacheAge,
  hasCachedData,
} from './admin-data-cache';
import type { Organization, AdminStats } from '@/app/superadmin/hooks/useAdminData';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

// Setup and teardown
beforeAll(() => {
  Object.defineProperty(global, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });
});

beforeEach(() => {
  localStorageMock.clear();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

// Test data
const mockOrganizations: Organization[] = [
  {
    id: '1',
    name: 'Test Org 1',
    slug: 'test-org-1',
    subscription_plan: 'pro',
    subscription_status: 'active',
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    name: 'Test Org 2',
    slug: 'test-org-2',
    subscription_plan: 'basic',
    subscription_status: 'active',
    created_at: '2024-01-02T00:00:00Z',
  },
];

const mockStats: AdminStats = {
  totalOrganizations: 2,
  totalUsers: 10,
  activeSubscriptions: 2,
  totalRevenue: 1000,
  monthlyRevenue: 200,
  activeOrganizations: 2,
  activeUsers: 8,
};

describe('admin-data-cache', () => {
  describe('saveAdminDataCache', () => {
    it('should save data to localStorage successfully', () => {
      const result = saveAdminDataCache(mockOrganizations, mockStats);

      expect(result).toBe(true);
      expect(localStorageMock.getItem('admin-data-cache')).toBeTruthy();
    });

    it('should save data with correct structure', () => {
      saveAdminDataCache(mockOrganizations, mockStats);

      const raw = localStorageMock.getItem('admin-data-cache');
      expect(raw).toBeTruthy();

      const parsed = JSON.parse(raw!);
      expect(parsed).toHaveProperty('organizations');
      expect(parsed).toHaveProperty('stats');
      expect(parsed).toHaveProperty('timestamp');
      expect(parsed).toHaveProperty('version');
      expect(parsed.organizations).toEqual(mockOrganizations);
      expect(parsed.stats).toEqual(mockStats);
    });

    it('should include current timestamp', () => {
      const beforeSave = new Date();
      saveAdminDataCache(mockOrganizations, mockStats);
      const afterSave = new Date();

      const raw = localStorageMock.getItem('admin-data-cache');
      const parsed = JSON.parse(raw!);
      const savedTimestamp = new Date(parsed.timestamp);

      expect(savedTimestamp.getTime()).toBeGreaterThanOrEqual(beforeSave.getTime());
      expect(savedTimestamp.getTime()).toBeLessThanOrEqual(afterSave.getTime());
    });

    it('should include version number', () => {
      saveAdminDataCache(mockOrganizations, mockStats);

      const raw = localStorageMock.getItem('admin-data-cache');
      const parsed = JSON.parse(raw!);

      expect(parsed.version).toBe('1.0.0');
    });

    it('should handle localStorage errors gracefully', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock setItem to throw error
      vi.spyOn(localStorageMock, 'setItem').mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      const result = saveAdminDataCache(mockOrganizations, mockStats);

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('loadAdminDataCache', () => {
    it('should return null when no cache exists', () => {
      const result = loadAdminDataCache();
      expect(result).toBeNull();
    });

    it('should load cached data successfully', () => {
      saveAdminDataCache(mockOrganizations, mockStats);

      const result = loadAdminDataCache();

      expect(result).not.toBeNull();
      expect(result?.organizations).toEqual(mockOrganizations);
      expect(result?.stats).toEqual(mockStats);
      expect(result?.version).toBe('1.0.0');
    });

    it('should include timestamp as Date object', () => {
      saveAdminDataCache(mockOrganizations, mockStats);

      const result = loadAdminDataCache();

      expect(result?.timestamp).toBeInstanceOf(Date);
    });

    it('should mark fresh data as not stale', () => {
      saveAdminDataCache(mockOrganizations, mockStats);

      const result = loadAdminDataCache();

      expect(result?.isStale).toBe(false);
    });

    it('should mark old data as stale', () => {
      // Save data with old timestamp (31 minutes ago)
      const oldTimestamp = new Date(Date.now() - 31 * 60 * 1000).toISOString();
      const oldCache = {
        organizations: mockOrganizations,
        stats: mockStats,
        timestamp: oldTimestamp,
        version: '1.0.0',
      };
      localStorageMock.setItem('admin-data-cache', JSON.stringify(oldCache));

      const result = loadAdminDataCache();

      expect(result?.isStale).toBe(true);
    });

    it('should invalidate cache with wrong version', () => {
      const oldCache = {
        organizations: mockOrganizations,
        stats: mockStats,
        timestamp: new Date().toISOString(),
        version: '0.9.0', // Old version
      };
      localStorageMock.setItem('admin-data-cache', JSON.stringify(oldCache));

      const result = loadAdminDataCache();

      expect(result).toBeNull();
      expect(localStorageMock.getItem('admin-data-cache')).toBeNull();
    });

    it('should invalidate cache with missing fields', () => {
      const invalidCache = {
        organizations: mockOrganizations,
        // Missing stats
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      };
      localStorageMock.setItem('admin-data-cache', JSON.stringify(invalidCache));

      const result = loadAdminDataCache();

      expect(result).toBeNull();
      expect(localStorageMock.getItem('admin-data-cache')).toBeNull();
    });

    it('should handle corrupted cache data', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      localStorageMock.setItem('admin-data-cache', 'invalid json{');

      const result = loadAdminDataCache();

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(localStorageMock.getItem('admin-data-cache')).toBeNull();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('clearAdminDataCache', () => {
    it('should clear cache successfully', () => {
      saveAdminDataCache(mockOrganizations, mockStats);
      expect(localStorageMock.getItem('admin-data-cache')).toBeTruthy();

      const result = clearAdminDataCache();

      expect(result).toBe(true);
      expect(localStorageMock.getItem('admin-data-cache')).toBeNull();
    });

    it('should handle errors gracefully', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      vi.spyOn(localStorageMock, 'removeItem').mockImplementation(() => {
        throw new Error('Storage error');
      });

      const result = clearAdminDataCache();

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('isDataStale', () => {
    it('should return false for fresh data (< 30 minutes)', () => {
      const freshTimestamp = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
      expect(isDataStale(freshTimestamp)).toBe(false);
    });

    it('should return true for stale data (> 30 minutes)', () => {
      const staleTimestamp = new Date(Date.now() - 35 * 60 * 1000); // 35 minutes ago
      expect(isDataStale(staleTimestamp)).toBe(true);
    });

    it('should return false for data exactly at threshold', () => {
      const thresholdTimestamp = new Date(Date.now() - 30 * 60 * 1000); // Exactly 30 minutes
      expect(isDataStale(thresholdTimestamp)).toBe(false);
    });

    it('should return false for current timestamp', () => {
      const now = new Date();
      expect(isDataStale(now)).toBe(false);
    });
  });

  describe('getCacheAge', () => {
    it('should return null when no cache exists', () => {
      const age = getCacheAge();
      expect(age).toBeNull();
    });

    it('should return age in milliseconds for existing cache', () => {
      saveAdminDataCache(mockOrganizations, mockStats);

      const age = getCacheAge();

      expect(age).not.toBeNull();
      expect(age).toBeGreaterThanOrEqual(0);
      expect(age).toBeLessThan(1000); // Should be very recent
    });

    it('should return correct age for old cache', () => {
      const oldTimestamp = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // 10 minutes ago
      const oldCache = {
        organizations: mockOrganizations,
        stats: mockStats,
        timestamp: oldTimestamp,
        version: '1.0.0',
      };
      localStorageMock.setItem('admin-data-cache', JSON.stringify(oldCache));

      const age = getCacheAge();

      expect(age).not.toBeNull();
      expect(age).toBeGreaterThanOrEqual(10 * 60 * 1000); // At least 10 minutes
      expect(age).toBeLessThan(11 * 60 * 1000); // Less than 11 minutes
    });
  });

  describe('hasCachedData', () => {
    it('should return false when no cache exists', () => {
      expect(hasCachedData()).toBe(false);
    });

    it('should return true when valid cache exists', () => {
      saveAdminDataCache(mockOrganizations, mockStats);
      expect(hasCachedData()).toBe(true);
    });

    it('should return false when cache is invalid', () => {
      localStorageMock.setItem('admin-data-cache', 'invalid json{');
      expect(hasCachedData()).toBe(false);
    });

    it('should return false when cache version is wrong', () => {
      const oldCache = {
        organizations: mockOrganizations,
        stats: mockStats,
        timestamp: new Date().toISOString(),
        version: '0.9.0',
      };
      localStorageMock.setItem('admin-data-cache', JSON.stringify(oldCache));
      expect(hasCachedData()).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle empty organizations array', () => {
      const result = saveAdminDataCache([], mockStats);
      expect(result).toBe(true);

      const loaded = loadAdminDataCache();
      expect(loaded?.organizations).toEqual([]);
    });

    it('should handle zero stats', () => {
      const zeroStats: AdminStats = {
        totalOrganizations: 0,
        totalUsers: 0,
        activeSubscriptions: 0,
        totalRevenue: 0,
      };

      const result = saveAdminDataCache(mockOrganizations, zeroStats);
      expect(result).toBe(true);

      const loaded = loadAdminDataCache();
      expect(loaded?.stats).toEqual(zeroStats);
    });

    it('should handle large datasets', () => {
      const largeOrgs: Organization[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `${i}`,
        name: `Org ${i}`,
        slug: `org-${i}`,
        subscription_plan: 'pro',
        subscription_status: 'active',
        created_at: new Date().toISOString(),
      }));

      const result = saveAdminDataCache(largeOrgs, mockStats);
      expect(result).toBe(true);

      const loaded = loadAdminDataCache();
      expect(loaded?.organizations).toHaveLength(1000);
    });
  });
});
