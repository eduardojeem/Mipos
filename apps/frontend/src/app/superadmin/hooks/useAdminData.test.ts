/**
 * Tests for useAdminData hook
 * Feature: fix-superadmin-fetch-error
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAdminData } from './useAdminData';
import type { ErrorState } from '@/types/error-state';
import * as adminDataCache from '@/lib/admin-data-cache';

// Mock the Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({
            data: [],
            error: null,
          })),
        })),
      })),
    })),
  })),
}));

// Mock the admin data cache module
vi.mock('@/lib/admin-data-cache', () => ({
  loadAdminDataCache: vi.fn(),
  saveAdminDataCache: vi.fn(),
  clearAdminDataCache: vi.fn(),
}));

describe('useAdminData', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    // Mock fetch globally
    global.fetch = vi.fn() as any;
    // Reset cache mocks
    vi.mocked(adminDataCache.loadAdminDataCache).mockReturnValue(null);
    vi.mocked(adminDataCache.saveAdminDataCache).mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('error handling', () => {
    it('should set structured error state on fetch failure', async () => {
      // Mock fetch to reject with a network error
      (global.fetch as any).mockRejectedValue(new TypeError('fetch failed'));

      // Mock Supabase to also fail
      const { createClient } = await import('@/lib/supabase/client');
      vi.mocked(createClient).mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve({
                data: null,
                error: { code: 'PGRST116', message: 'Connection error', details: '', hint: '' },
              })),
            })),
          })),
        })),
      } as any);

      const { result } = renderHook(() => useAdminData());

      // Wait for the error to be set
      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      // Verify error is an ErrorState object
      const error = result.current.error as ErrorState;
      expect(error).toHaveProperty('type');
      expect(error).toHaveProperty('message');
      expect(error).toHaveProperty('retryable');
      expect(error).toHaveProperty('timestamp');
      expect(error.type).toBe('network');
      expect(error.retryable).toBe(true);
    });

    it('should classify 401 errors as auth errors', async () => {
      // Mock fetch to return 401
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      // Mock Supabase to also fail
      const { createClient } = await import('@/lib/supabase/client');
      vi.mocked(createClient).mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve({
                data: null,
                error: { code: 'PGRST116', message: 'Unauthorized', details: '', hint: '' },
              })),
            })),
          })),
        })),
      } as any);

      const { result } = renderHook(() => useAdminData());

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      const error = result.current.error as ErrorState;
      expect(error.type).toBe('auth');
      expect(error.statusCode).toBe(401);
      expect(error.retryable).toBe(false);
    });

    it('should classify 403 errors as permission errors', async () => {
      // Mock fetch to return 403
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 403,
        text: async () => 'Forbidden',
      });

      // Mock Supabase to also fail
      const { createClient } = await import('@/lib/supabase/client');
      vi.mocked(createClient).mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve({
                data: null,
                error: { code: 'PGRST116', message: 'Forbidden', details: '', hint: '' },
              })),
            })),
          })),
        })),
      } as any);

      const { result } = renderHook(() => useAdminData());

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      const error = result.current.error as ErrorState;
      expect(error.type).toBe('permission');
      expect(error.statusCode).toBe(403);
      expect(error.retryable).toBe(false);
    });

    it('should classify 500 errors as server errors', async () => {
      // Mock fetch to return 500
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      // Mock Supabase to also fail
      const { createClient } = await import('@/lib/supabase/client');
      vi.mocked(createClient).mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve({
                data: null,
                error: { code: 'PGRST116', message: 'Server error', details: '', hint: '' },
              })),
            })),
          })),
        })),
      } as any);

      const { result } = renderHook(() => useAdminData());

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      const error = result.current.error as ErrorState;
      expect(error.type).toBe('server');
      expect(error.statusCode).toBe(500);
      expect(error.retryable).toBe(true);
    });

    it('should clear error when clearError is called', async () => {
      // Mock fetch to reject
      (global.fetch as any).mockRejectedValue(new TypeError('fetch failed'));

      // Mock Supabase to also fail
      const { createClient } = await import('@/lib/supabase/client');
      vi.mocked(createClient).mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve({
                data: null,
                error: { code: 'PGRST116', message: 'Connection error', details: '', hint: '' },
              })),
            })),
          })),
        })),
      } as any);

      const { result } = renderHook(() => useAdminData());

      // Wait for error to be set
      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      // Clear the error
      await waitFor(() => {
        result.current.clearError();
      });

      // Verify error is cleared
      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });

    it('should call onError callback with error message', async () => {
      const onError = vi.fn();
      (global.fetch as any).mockRejectedValue(new TypeError('fetch failed'));

      // Mock Supabase to also fail
      const { createClient } = await import('@/lib/supabase/client');
      vi.mocked(createClient).mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve({
                data: null,
                error: { code: 'PGRST116', message: 'Connection error', details: '', hint: '' },
              })),
            })),
          })),
        })),
      } as any);

      renderHook(() => useAdminData({ onError }));

      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      });

      // Verify onError was called with the error message
      expect(onError).toHaveBeenCalledWith(expect.stringContaining('Network error'));
    });
  });

  describe('successful data fetch', () => {
    it('should fetch and set data successfully', async () => {
      const mockStats = {
        totalOrganizations: 10,
        totalUsers: 100,
        activeOrganizations: 8,
        totalRevenue: 5000,
        monthlyRevenue: 500,
        activeUsers: 90,
      };

      // Mock successful fetch
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockStats,
      });

      const { result } = renderHook(() => useAdminData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Verify stats are set correctly
      expect(result.current.stats.totalOrganizations).toBe(10);
      expect(result.current.stats.totalUsers).toBe(100);
      expect(result.current.error).toBeNull();
    });

    it('should call onSuccess callback on successful fetch', async () => {
      const onSuccess = vi.fn();
      const mockStats = {
        totalOrganizations: 10,
        totalUsers: 100,
        activeOrganizations: 8,
        totalRevenue: 5000,
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockStats,
      });

      renderHook(() => useAdminData({ onSuccess }));

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });
  });

  describe('abort handling', () => {
    it('should not set error when request is aborted', async () => {
      // Mock fetch to reject with AbortError
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      (global.fetch as any).mockRejectedValue(abortError);

      const { result } = renderHook(() => useAdminData());

      // Wait a bit to ensure the abort is processed
      await new Promise(resolve => setTimeout(resolve, 100));

      // Error should not be set for aborted requests
      expect(result.current.error).toBeNull();
    });
  });

  describe('caching functionality', () => {
    it('should load cached data on initialization', async () => {
      const mockCachedData = {
        organizations: [
          { id: '1', name: 'Cached Org', slug: 'cached', subscription_plan: 'pro', subscription_status: 'active', created_at: '2024-01-01' }
        ],
        stats: {
          totalOrganizations: 5,
          totalUsers: 50,
          activeSubscriptions: 4,
          totalRevenue: 2000,
        },
        timestamp: new Date('2024-01-01'),
        isStale: false,
        version: '1.0.0',
      };

      vi.mocked(adminDataCache.loadAdminDataCache).mockReturnValue(mockCachedData);

      // Mock fetch to succeed
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          totalOrganizations: 10,
          totalUsers: 100,
          activeOrganizations: 8,
          totalRevenue: 5000,
        }),
      });

      const { result } = renderHook(() => useAdminData());

      // Initially should have cached data
      expect(result.current.organizations).toEqual(mockCachedData.organizations);
      expect(result.current.stats).toEqual(mockCachedData.stats);
      expect(result.current.cachedData).toEqual(mockCachedData);

      // Wait for fresh data to load
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should save successful fetches to cache', async () => {
      const mockStats = {
        totalOrganizations: 10,
        totalUsers: 100,
        activeOrganizations: 8,
        totalRevenue: 5000,
        monthlyRevenue: 500,
        activeUsers: 90,
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockStats,
      });

      renderHook(() => useAdminData());

      await waitFor(() => {
        expect(adminDataCache.saveAdminDataCache).toHaveBeenCalled();
      });

      // Verify cache was saved with correct data
      expect(adminDataCache.saveAdminDataCache).toHaveBeenCalledWith(
        [],
        expect.objectContaining({
          totalOrganizations: 10,
          totalUsers: 100,
        })
      );
    });

    it('should display cached data when fresh data fails', async () => {
      const mockCachedData = {
        organizations: [
          { id: '1', name: 'Cached Org', slug: 'cached', subscription_plan: 'pro', subscription_status: 'active', created_at: '2024-01-01' }
        ],
        stats: {
          totalOrganizations: 5,
          totalUsers: 50,
          activeSubscriptions: 4,
          totalRevenue: 2000,
        },
        timestamp: new Date('2024-01-01'),
        isStale: false,
        version: '1.0.0',
      };

      vi.mocked(adminDataCache.loadAdminDataCache).mockReturnValue(mockCachedData);

      // Mock fetch to fail
      (global.fetch as any).mockRejectedValue(new TypeError('fetch failed'));

      // Mock Supabase to also fail
      const { createClient } = await import('@/lib/supabase/client');
      vi.mocked(createClient).mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve({
                data: null,
                error: { code: 'PGRST116', message: 'Connection error', details: '', hint: '' },
              })),
            })),
          })),
        })),
      } as any);

      const { result } = renderHook(() => useAdminData());

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      // Should display cached data
      expect(result.current.organizations).toEqual(mockCachedData.organizations);
      expect(result.current.stats).toEqual(mockCachedData.stats);
      
      // Cached data should be marked as stale
      expect(result.current.cachedData?.isStale).toBe(true);
    });

    it('should add isStale indicator to cached data when fetch fails', async () => {
      const mockCachedData = {
        organizations: [
          { id: '1', name: 'Cached Org', slug: 'cached', subscription_plan: 'pro', subscription_status: 'active', created_at: '2024-01-01' }
        ],
        stats: {
          totalOrganizations: 5,
          totalUsers: 50,
          activeSubscriptions: 4,
          totalRevenue: 2000,
        },
        timestamp: new Date('2024-01-01'),
        isStale: false,
        version: '1.0.0',
      };

      vi.mocked(adminDataCache.loadAdminDataCache).mockReturnValue(mockCachedData);

      // Mock fetch to fail
      (global.fetch as any).mockRejectedValue(new TypeError('fetch failed'));

      // Mock Supabase to also fail
      const { createClient } = await import('@/lib/supabase/client');
      vi.mocked(createClient).mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve({
                data: null,
                error: { code: 'PGRST116', message: 'Connection error', details: '', hint: '' },
              })),
            })),
          })),
        })),
      } as any);

      const { result } = renderHook(() => useAdminData());

      await waitFor(() => {
        expect(result.current.cachedData?.isStale).toBe(true);
      });
    });

    it('should return cachedData in hook result', async () => {
      const mockStats = {
        totalOrganizations: 10,
        totalUsers: 100,
        activeOrganizations: 8,
        totalRevenue: 5000,
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockStats,
      });

      const { result } = renderHook(() => useAdminData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should have cachedData property
      expect(result.current).toHaveProperty('cachedData');
    });
  });

  describe('graceful degradation for partial failures', () => {
    it('should display organizations when stats fetch fails', async () => {
      const mockOrganizations = [
        { id: '1', name: 'Org 1', slug: 'org-1', subscription_plan: 'pro', subscription_status: 'active', created_at: '2024-01-01' },
        { id: '2', name: 'Org 2', slug: 'org-2', subscription_plan: 'free', subscription_status: 'active', created_at: '2024-01-02' },
      ];

      // Mock fetch to fail for stats
      (global.fetch as any).mockRejectedValue(new TypeError('fetch failed'));

      // Mock Supabase to succeed for organizations
      const { createClient } = await import('@/lib/supabase/client');
      vi.mocked(createClient).mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve({
                data: mockOrganizations,
                error: null,
              })),
            })),
          })),
        })),
      } as any);

      const { result } = renderHook(() => useAdminData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should have organizations data
      expect(result.current.organizations).toEqual(mockOrganizations);
      
      // Should have partial failure indicator for stats
      expect(result.current.partialFailures.statsFailure).not.toBeNull();
      expect(result.current.partialFailures.organizationsFailure).toBeNull();
      
      // Should not have a global error (partial success)
      expect(result.current.error).toBeNull();
    });

    it('should display stats when organizations fetch fails', async () => {
      const mockStats = {
        totalOrganizations: 10,
        totalUsers: 100,
        activeOrganizations: 8,
        totalRevenue: 5000,
        monthlyRevenue: 500,
        activeUsers: 90,
      };

      // Mock fetch to succeed for stats
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockStats,
      });

      // Mock Supabase to fail for organizations
      const { createClient } = await import('@/lib/supabase/client');
      vi.mocked(createClient).mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve({
                data: null,
                error: { code: 'PGRST116', message: 'No rows found', details: '', hint: '' },
              })),
            })),
          })),
        })),
      } as any);

      const { result } = renderHook(() => useAdminData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should have stats data
      expect(result.current.stats).toEqual(expect.objectContaining({
        totalOrganizations: 10,
        totalUsers: 100,
      }));
      
      // Should have partial failure indicator for organizations
      expect(result.current.partialFailures.statsFailure).toBeNull();
      expect(result.current.partialFailures.organizationsFailure).not.toBeNull();
      
      // Should not have a global error (partial success)
      expect(result.current.error).toBeNull();
    });

    it('should set global error when both stats and organizations fail', async () => {
      // Mock fetch to fail for stats
      (global.fetch as any).mockRejectedValue(new TypeError('fetch failed'));

      // Mock Supabase to fail for organizations
      const { createClient } = await import('@/lib/supabase/client');
      vi.mocked(createClient).mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve({
                data: null,
                error: { code: 'PGRST116', message: 'No rows found', details: '', hint: '' },
              })),
            })),
          })),
        })),
      } as any);

      const { result } = renderHook(() => useAdminData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should have global error when both fail
      expect(result.current.error).not.toBeNull();
      
      // Should have both partial failure indicators
      expect(result.current.partialFailures.statsFailure).not.toBeNull();
      expect(result.current.partialFailures.organizationsFailure).not.toBeNull();
    });

    it('should use cached data for failed sections in partial failure', async () => {
      const mockCachedData = {
        organizations: [
          { id: '1', name: 'Cached Org', slug: 'cached', subscription_plan: 'pro', subscription_status: 'active', created_at: '2024-01-01' }
        ],
        stats: {
          totalOrganizations: 5,
          totalUsers: 50,
          activeSubscriptions: 4,
          totalRevenue: 2000,
        },
        timestamp: new Date('2024-01-01'),
        isStale: false,
        version: '1.0.0',
      };

      vi.mocked(adminDataCache.loadAdminDataCache).mockReturnValue(mockCachedData);

      const mockStats = {
        totalOrganizations: 10,
        totalUsers: 100,
        activeOrganizations: 8,
        totalRevenue: 5000,
      };

      // Mock fetch to succeed for stats
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockStats,
      });

      // Mock Supabase to fail for organizations
      const { createClient } = await import('@/lib/supabase/client');
      vi.mocked(createClient).mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve({
                data: null,
                error: { code: 'PGRST116', message: 'No rows found', details: '', hint: '' },
              })),
            })),
          })),
        })),
      } as any);

      const { result } = renderHook(() => useAdminData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should have fresh stats
      expect(result.current.stats.totalOrganizations).toBe(10);
      
      // Should have cached organizations (since fetch failed)
      expect(result.current.organizations).toEqual(mockCachedData.organizations);
      
      // Should have partial failure indicator
      expect(result.current.partialFailures.organizationsFailure).not.toBeNull();
    });

    it('should return partialFailures in hook result', async () => {
      const mockStats = {
        totalOrganizations: 10,
        totalUsers: 100,
        activeOrganizations: 8,
        totalRevenue: 5000,
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockStats,
      });

      const { result } = renderHook(() => useAdminData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should have partialFailures property
      expect(result.current).toHaveProperty('partialFailures');
      expect(result.current.partialFailures).toHaveProperty('statsFailure');
      expect(result.current.partialFailures).toHaveProperty('organizationsFailure');
    });
  });
});
