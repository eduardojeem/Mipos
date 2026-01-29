/**
 * Integration tests for SuperAdmin page
 * 
 * Tests that the page properly integrates ErrorDisplay component
 * according to Task 7.1 requirements
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import SuperAdminPage from './page';

// Mock the useAdminData hook
vi.mock('@/app/superadmin/hooks/useAdminData', () => ({
  useAdminData: vi.fn(),
}));

// Mock the components
vi.mock('@/app/superadmin/components/AdminStats', () => ({
  AdminStats: ({ stats }: any) => <div data-testid="admin-stats">Stats: {stats.totalOrganizations}</div>,
}));

vi.mock('@/app/superadmin/components/OrganizationsTable', () => ({
  OrganizationsTable: ({ organizations }: any) => (
    <div data-testid="organizations-table">Organizations: {organizations.length}</div>
  ),
}));

vi.mock('@/app/superadmin/components/SystemOverview', () => ({
  SystemOverview: () => <div data-testid="system-overview">System Overview</div>,
}));

vi.mock('@/app/superadmin/components/ErrorDisplay', () => ({
  ErrorDisplay: ({ error, onRetry, onDismiss, showCachedDataWarning, cachedDataTimestamp }: any) => (
    <div data-testid="error-display">
      <div data-testid="error-type">{error.type}</div>
      <div data-testid="error-message">{error.message}</div>
      {showCachedDataWarning && <div data-testid="cached-warning">Cached data warning</div>}
      {cachedDataTimestamp && <div data-testid="cached-timestamp">{cachedDataTimestamp.toISOString()}</div>}
      {onRetry && <button onClick={onRetry} data-testid="retry-button">Retry</button>}
      {onDismiss && <button onClick={onDismiss} data-testid="dismiss-button">Dismiss</button>}
    </div>
  ),
}));

vi.mock('@/app/superadmin/components/PartialFailureWarning', () => ({
  PartialFailureWarning: ({ statsFailure, organizationsFailure }: any) => (
    <div data-testid="partial-failure-warning">
      {statsFailure && <div>Stats failure</div>}
      {organizationsFailure && <div>Organizations failure</div>}
    </div>
  ),
}));

vi.mock('@/components/auth/UnifiedPermissionGuard', () => ({
  UnifiedPermissionGuard: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

import { useAdminData } from '@/app/superadmin/hooks/useAdminData';

describe('SuperAdminPage - ErrorDisplay Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Task 7.1: ErrorDisplay Integration', () => {
    it('should display ErrorDisplay component when there is an error', async () => {
      const mockError = {
        type: 'network' as const,
        message: 'Network error occurred',
        retryable: true,
        timestamp: new Date(),
      };

      (useAdminData as any).mockReturnValue({
        organizations: [],
        stats: { totalOrganizations: 0, totalUsers: 0, activeSubscriptions: 0, totalRevenue: 0 },
        loading: false,
        refreshing: false,
        error: mockError,
        partialFailures: { statsFailure: null, organizationsFailure: null },
        lastFetch: null,
        cachedData: null,
        refresh: vi.fn(),
        clearError: vi.fn(),
      });

      render(<SuperAdminPage />);

      await waitFor(() => {
        expect(screen.getByTestId('error-display')).toBeTruthy();
        expect(screen.getByTestId('error-type')).toHaveTextContent('network');
        expect(screen.getByTestId('error-message')).toHaveTextContent('Network error occurred');
      });
    });

    it('should pass retry handler to ErrorDisplay', async () => {
      const mockRefresh = vi.fn();
      const mockError = {
        type: 'network' as const,
        message: 'Network error',
        retryable: true,
        timestamp: new Date(),
      };

      (useAdminData as any).mockReturnValue({
        organizations: [],
        stats: { totalOrganizations: 0, totalUsers: 0, activeSubscriptions: 0, totalRevenue: 0 },
        loading: false,
        refreshing: false,
        error: mockError,
        partialFailures: { statsFailure: null, organizationsFailure: null },
        lastFetch: null,
        cachedData: null,
        refresh: mockRefresh,
        clearError: vi.fn(),
      });

      render(<SuperAdminPage />);

      await waitFor(() => {
        const retryButton = screen.getByTestId('retry-button');
        expect(retryButton).toBeTruthy();
        retryButton.click();
        expect(mockRefresh).toHaveBeenCalledTimes(1);
      });
    });

    it('should pass dismiss handler to ErrorDisplay', async () => {
      const mockClearError = vi.fn();
      const mockError = {
        type: 'network' as const,
        message: 'Network error',
        retryable: true,
        timestamp: new Date(),
      };

      (useAdminData as any).mockReturnValue({
        organizations: [],
        stats: { totalOrganizations: 0, totalUsers: 0, activeSubscriptions: 0, totalRevenue: 0 },
        loading: false,
        refreshing: false,
        error: mockError,
        partialFailures: { statsFailure: null, organizationsFailure: null },
        lastFetch: null,
        cachedData: null,
        refresh: vi.fn(),
        clearError: mockClearError,
      });

      render(<SuperAdminPage />);

      await waitFor(() => {
        const dismissButton = screen.getByTestId('dismiss-button');
        expect(dismissButton).toBeTruthy();
        dismissButton.click();
        expect(mockClearError).toHaveBeenCalledTimes(1);
      });
    });

    it('should show cached data warning when cached data is stale', async () => {
      const cachedTimestamp = new Date('2024-01-01T12:00:00Z');
      const mockError = {
        type: 'network' as const,
        message: 'Network error',
        retryable: true,
        timestamp: new Date(),
      };

      (useAdminData as any).mockReturnValue({
        organizations: [],
        stats: { totalOrganizations: 0, totalUsers: 0, activeSubscriptions: 0, totalRevenue: 0 },
        loading: false,
        refreshing: false,
        error: mockError,
        partialFailures: { statsFailure: null, organizationsFailure: null },
        lastFetch: null,
        cachedData: {
          organizations: [{ id: '1', name: 'Test Org' }],
          stats: { totalOrganizations: 1, totalUsers: 5, activeSubscriptions: 1, totalRevenue: 1000 },
          timestamp: cachedTimestamp,
          isStale: true,
          version: '1.0.0',
        },
        refresh: vi.fn(),
        clearError: vi.fn(),
      });

      render(<SuperAdminPage />);

      await waitFor(() => {
        expect(screen.getByTestId('error-display')).toBeTruthy();
        expect(screen.getByTestId('cached-warning')).toBeTruthy();
        expect(screen.getByTestId('cached-timestamp')).toHaveTextContent(cachedTimestamp.toISOString());
      });
    });

    it('should display cached data when error occurs and cached data is available', async () => {
      const mockError = {
        type: 'network' as const,
        message: 'Network error',
        retryable: true,
        timestamp: new Date(),
      };

      const cachedOrganizations = [
        { id: '1', name: 'Org 1' },
        { id: '2', name: 'Org 2' },
      ];

      const cachedStats = {
        totalOrganizations: 2,
        totalUsers: 10,
        activeSubscriptions: 2,
        totalRevenue: 2000,
      };

      (useAdminData as any).mockReturnValue({
        organizations: [],
        stats: { totalOrganizations: 0, totalUsers: 0, activeSubscriptions: 0, totalRevenue: 0 },
        loading: false,
        refreshing: false,
        error: mockError,
        partialFailures: { statsFailure: null, organizationsFailure: null },
        lastFetch: null,
        cachedData: {
          organizations: cachedOrganizations,
          stats: cachedStats,
          timestamp: new Date(),
          isStale: true,
          version: '1.0.0',
        },
        refresh: vi.fn(),
        clearError: vi.fn(),
      });

      render(<SuperAdminPage />);

      await waitFor(() => {
        // Error display should be shown
        expect(screen.getByTestId('error-display')).toBeTruthy();
        
        // Cached data should be displayed
        expect(screen.getByTestId('admin-stats')).toBeTruthy();
        expect(screen.getByTestId('organizations-table')).toBeTruthy();
      });
    });

    it('should not show ErrorDisplay when there is no error', async () => {
      (useAdminData as any).mockReturnValue({
        organizations: [{ id: '1', name: 'Test Org' }],
        stats: { totalOrganizations: 1, totalUsers: 5, activeSubscriptions: 1, totalRevenue: 1000 },
        loading: false,
        refreshing: false,
        error: null,
        partialFailures: { statsFailure: null, organizationsFailure: null },
        lastFetch: new Date(),
        cachedData: null,
        refresh: vi.fn(),
        clearError: vi.fn(),
      });

      render(<SuperAdminPage />);

      await waitFor(() => {
        expect(screen.queryByTestId('error-display')).toBeNull();
        expect(screen.getByTestId('admin-stats')).toBeTruthy();
      });
    });

    it('should show partial failure warning when there are partial failures', async () => {
      const statsFailure = {
        type: 'network' as const,
        message: 'Stats fetch failed',
        retryable: true,
        timestamp: new Date(),
      };

      (useAdminData as any).mockReturnValue({
        organizations: [{ id: '1', name: 'Test Org' }],
        stats: { totalOrganizations: 0, totalUsers: 0, activeSubscriptions: 0, totalRevenue: 0 },
        loading: false,
        refreshing: false,
        error: null,
        partialFailures: { statsFailure, organizationsFailure: null },
        lastFetch: new Date(),
        cachedData: null,
        refresh: vi.fn(),
        clearError: vi.fn(),
      });

      render(<SuperAdminPage />);

      await waitFor(() => {
        expect(screen.getByTestId('partial-failure-warning')).toBeTruthy();
        expect(screen.queryByTestId('error-display')).toBeNull();
      });
    });
  });
});
