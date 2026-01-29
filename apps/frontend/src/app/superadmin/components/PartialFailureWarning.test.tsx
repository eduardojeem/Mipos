/**
 * Tests for PartialFailureWarning component
 * Feature: fix-superadmin-fetch-error
 * Requirements: 10.1, 10.2, 10.3, 10.5
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { PartialFailureWarning } from './PartialFailureWarning';
import type { ErrorState } from '@/types/error-state';

describe('PartialFailureWarning', () => {
  const mockStatsFailure: ErrorState = {
    type: 'network',
    message: 'Network error. Please check your connection and try again.',
    retryable: true,
    timestamp: new Date(),
    context: {
      url: '/api/superadmin/stats',
      method: 'GET',
    },
  };

  const mockOrganizationsFailure: ErrorState = {
    type: 'server',
    message: 'Server error. Please try again in a moment.',
    statusCode: 500,
    retryable: true,
    timestamp: new Date(),
    context: {
      url: 'supabase:organizations',
      method: 'SELECT',
    },
  };

  describe('rendering', () => {
    it('should not render when there are no partial failures', () => {
      const { container } = render(
        <PartialFailureWarning
          statsFailure={null}
          organizationsFailure={null}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should render when stats fetch fails', () => {
      render(
        <PartialFailureWarning
          statsFailure={mockStatsFailure}
          organizationsFailure={null}
        />
      );

      expect(screen.getByText('Partial Data Available')).toBeInTheDocument();
      expect(screen.getByText(/Statistics.*currently unavailable/)).toBeInTheDocument();
    });

    it('should render when organizations fetch fails', () => {
      render(
        <PartialFailureWarning
          statsFailure={null}
          organizationsFailure={mockOrganizationsFailure}
        />
      );

      expect(screen.getByText('Partial Data Available')).toBeInTheDocument();
      expect(screen.getByText(/Organizations.*currently unavailable/)).toBeInTheDocument();
    });

    it('should render when both stats and organizations fail', () => {
      render(
        <PartialFailureWarning
          statsFailure={mockStatsFailure}
          organizationsFailure={mockOrganizationsFailure}
        />
      );

      expect(screen.getByText('Partial Data Available')).toBeInTheDocument();
      expect(screen.getByText(/Statistics and Organizations.*currently unavailable/)).toBeInTheDocument();
    });
  });

  describe('error details', () => {
    it('should display stats error message', () => {
      render(
        <PartialFailureWarning
          statsFailure={mockStatsFailure}
          organizationsFailure={null}
        />
      );

      expect(screen.getByText('Statistics')).toBeInTheDocument();
      expect(screen.getByText(mockStatsFailure.message)).toBeInTheDocument();
    });

    it('should display organizations error message', () => {
      render(
        <PartialFailureWarning
          statsFailure={null}
          organizationsFailure={mockOrganizationsFailure}
        />
      );

      expect(screen.getByText('Organizations')).toBeInTheDocument();
      expect(screen.getByText(mockOrganizationsFailure.message)).toBeInTheDocument();
    });

    it('should display both error messages when both fail', () => {
      render(
        <PartialFailureWarning
          statsFailure={mockStatsFailure}
          organizationsFailure={mockOrganizationsFailure}
        />
      );

      expect(screen.getByText(mockStatsFailure.message)).toBeInTheDocument();
      expect(screen.getByText(mockOrganizationsFailure.message)).toBeInTheDocument();
    });
  });

  describe('retry functionality', () => {
    it('should show retry button when error is retryable', () => {
      render(
        <PartialFailureWarning
          statsFailure={mockStatsFailure}
          organizationsFailure={null}
          onRetry={vi.fn()}
        />
      );

      expect(screen.getByRole('button', { name: /Retry Failed Sections/i })).toBeInTheDocument();
    });

    it('should not show retry button when onRetry is not provided', () => {
      render(
        <PartialFailureWarning
          statsFailure={mockStatsFailure}
          organizationsFailure={null}
        />
      );

      expect(screen.queryByRole('button', { name: /Retry Failed Sections/i })).not.toBeInTheDocument();
    });

    it('should not show retry button when errors are not retryable', () => {
      const nonRetryableError: ErrorState = {
        type: 'permission',
        message: "You don't have permission to access this resource.",
        statusCode: 403,
        retryable: false,
        timestamp: new Date(),
      };

      render(
        <PartialFailureWarning
          statsFailure={nonRetryableError}
          organizationsFailure={null}
          onRetry={vi.fn()}
        />
      );

      expect(screen.queryByRole('button', { name: /Retry Failed Sections/i })).not.toBeInTheDocument();
    });

    it('should call onRetry when retry button is clicked', async () => {
      const user = userEvent.setup();
      const onRetry = vi.fn();

      render(
        <PartialFailureWarning
          statsFailure={mockStatsFailure}
          organizationsFailure={null}
          onRetry={onRetry}
        />
      );

      const retryButton = screen.getByRole('button', { name: /Retry Failed Sections/i });
      await user.click(retryButton);

      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('should show retry button when at least one error is retryable', () => {
      const nonRetryableError: ErrorState = {
        type: 'permission',
        message: "You don't have permission to access this resource.",
        statusCode: 403,
        retryable: false,
        timestamp: new Date(),
      };

      render(
        <PartialFailureWarning
          statsFailure={mockStatsFailure}
          organizationsFailure={nonRetryableError}
          onRetry={vi.fn()}
        />
      );

      // Should show retry button because stats error is retryable
      expect(screen.getByRole('button', { name: /Retry Failed Sections/i })).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <PartialFailureWarning
          statsFailure={mockStatsFailure}
          organizationsFailure={null}
          className="custom-class"
        />
      );

      const alert = container.querySelector('.custom-class');
      expect(alert).toBeInTheDocument();
    });

    it('should have warning styling', () => {
      const { container } = render(
        <PartialFailureWarning
          statsFailure={mockStatsFailure}
          organizationsFailure={null}
        />
      );

      const alert = container.querySelector('[class*="border-l-yellow"]');
      expect(alert).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <PartialFailureWarning
          statsFailure={mockStatsFailure}
          organizationsFailure={null}
          onRetry={vi.fn()}
        />
      );

      // Alert should be accessible
      expect(screen.getByRole('alert')).toBeInTheDocument();
      
      // Button should be accessible
      expect(screen.getByRole('button', { name: /Retry Failed Sections/i })).toBeInTheDocument();
    });
  });
});
