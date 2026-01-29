/**
 * Unit tests for ErrorDisplay component
 * 
 * Tests rendering for each error type, action buttons, and stale data warnings
 * according to requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { ErrorDisplay, ErrorDisplayCompact } from './ErrorDisplay';
import { ErrorState } from '@/types/error-state';

describe('ErrorDisplay', () => {
  describe('rendering for each error type', () => {
    it('should render network error with correct icon and title', () => {
      const error: ErrorState = {
        type: 'network',
        message: 'Network error. Please check your connection and try again.',
        retryable: true,
        timestamp: new Date(),
      };

      render(<ErrorDisplay error={error} />);

      expect(screen.getByText('Network Error')).toBeTruthy();
      expect(screen.getByText(error.message)).toBeTruthy();
    });

    it('should render auth error with correct icon and title', () => {
      const error: ErrorState = {
        type: 'auth',
        message: 'Your session has expired. Please log in again.',
        statusCode: 401,
        retryable: false,
        timestamp: new Date(),
      };

      render(<ErrorDisplay error={error} />);

      expect(screen.getByText('Authentication Required')).toBeTruthy();
      expect(screen.getByText(error.message)).toBeTruthy();
      expect(screen.getByText('401')).toBeTruthy();
    });

    it('should render permission error with correct icon and title', () => {
      const error: ErrorState = {
        type: 'permission',
        message: "You don't have permission to access this resource.",
        statusCode: 403,
        retryable: false,
        timestamp: new Date(),
      };

      render(<ErrorDisplay error={error} />);

      expect(screen.getByText('Access Denied')).toBeTruthy();
      expect(screen.getByText(error.message)).toBeTruthy();
      expect(screen.getByText('403')).toBeTruthy();
    });

    it('should render timeout error with correct icon and title', () => {
      const error: ErrorState = {
        type: 'timeout',
        message: 'The request timed out. Please try again.',
        retryable: true,
        timestamp: new Date(),
      };

      render(<ErrorDisplay error={error} />);

      expect(screen.getByText('Request Timeout')).toBeTruthy();
      expect(screen.getByText(error.message)).toBeTruthy();
    });

    it('should render server error with correct icon and title', () => {
      const error: ErrorState = {
        type: 'server',
        message: 'Server error. Please try again in a moment.',
        statusCode: 500,
        retryable: true,
        timestamp: new Date(),
      };

      render(<ErrorDisplay error={error} />);

      expect(screen.getByText('Server Error')).toBeTruthy();
      expect(screen.getByText(error.message)).toBeTruthy();
      expect(screen.getByText('500')).toBeTruthy();
    });

    it('should render unknown error with correct icon and title', () => {
      const error: ErrorState = {
        type: 'unknown',
        message: 'An unexpected error occurred. Please try again.',
        retryable: true,
        timestamp: new Date(),
      };

      render(<ErrorDisplay error={error} />);

      expect(screen.getByText('Error')).toBeTruthy();
      expect(screen.getByText(error.message)).toBeTruthy();
    });
  });

  describe('action buttons', () => {
    describe('retry button', () => {
      it('should display retry button for retryable errors when onRetry is provided', () => {
        const error: ErrorState = {
          type: 'network',
          message: 'Network error',
          retryable: true,
          timestamp: new Date(),
        };
        const onRetry = vi.fn();

        render(<ErrorDisplay error={error} onRetry={onRetry} />);

        const retryButton = screen.getByRole('button', { name: /retry/i });
        expect(retryButton).toBeTruthy();
      });

      it('should call onRetry when retry button is clicked', () => {
        const error: ErrorState = {
          type: 'network',
          message: 'Network error',
          retryable: true,
          timestamp: new Date(),
        };
        const onRetry = vi.fn();

        render(<ErrorDisplay error={error} onRetry={onRetry} />);

        const retryButton = screen.getByRole('button', { name: /retry/i });
        fireEvent.click(retryButton);

        expect(onRetry).toHaveBeenCalledTimes(1);
      });

      it('should not display retry button for non-retryable errors', () => {
        const error: ErrorState = {
          type: 'auth',
          message: 'Authentication required',
          retryable: false,
          timestamp: new Date(),
        };
        const onRetry = vi.fn();

        render(<ErrorDisplay error={error} onRetry={onRetry} />);

        expect(screen.queryByRole('button', { name: /retry/i })).toBeNull();
      });

      it('should not display retry button when onRetry is not provided', () => {
        const error: ErrorState = {
          type: 'network',
          message: 'Network error',
          retryable: true,
          timestamp: new Date(),
        };

        render(<ErrorDisplay error={error} />);

        expect(screen.queryByRole('button', { name: /retry/i })).toBeNull();
      });
    });

    describe('login button', () => {
      beforeEach(() => {
        // Mock window.location.href
        delete (window as any).location;
        window.location = { href: '' } as any;
      });

      it('should display login button for auth errors', () => {
        const error: ErrorState = {
          type: 'auth',
          message: 'Authentication required',
          retryable: false,
          timestamp: new Date(),
        };

        render(<ErrorDisplay error={error} />);

        const loginButton = screen.getByRole('button', { name: /log in/i });
        expect(loginButton).toBeTruthy();
      });

      it('should redirect to login page when login button is clicked', () => {
        const error: ErrorState = {
          type: 'auth',
          message: 'Authentication required',
          retryable: false,
          timestamp: new Date(),
        };

        render(<ErrorDisplay error={error} />);

        const loginButton = screen.getByRole('button', { name: /log in/i });
        fireEvent.click(loginButton);

        expect(window.location.href).toBe('/login');
      });

      it('should not display login button for non-auth errors', () => {
        const error: ErrorState = {
          type: 'network',
          message: 'Network error',
          retryable: true,
          timestamp: new Date(),
        };

        render(<ErrorDisplay error={error} />);

        expect(screen.queryByRole('button', { name: /log in/i })).toBeNull();
      });
    });

    describe('contact support button', () => {
      beforeEach(() => {
        // Mock window.location.href
        delete (window as any).location;
        window.location = { href: '' } as any;
      });

      it('should display contact support button for permission errors', () => {
        const error: ErrorState = {
          type: 'permission',
          message: 'Access denied',
          retryable: false,
          timestamp: new Date(),
        };

        render(<ErrorDisplay error={error} />);

        const supportButton = screen.getByRole('button', { name: /contact support/i });
        expect(supportButton).toBeTruthy();
      });

      it('should open mailto link when contact support button is clicked', () => {
        const error: ErrorState = {
          type: 'permission',
          message: 'Access denied',
          retryable: false,
          timestamp: new Date(),
        };

        render(<ErrorDisplay error={error} />);

        const supportButton = screen.getByRole('button', { name: /contact support/i });
        fireEvent.click(supportButton);

        expect(window.location.href).toContain('mailto:');
        expect(window.location.href).toContain('support@example.com');
      });

      it('should not display contact support button for non-permission errors', () => {
        const error: ErrorState = {
          type: 'network',
          message: 'Network error',
          retryable: true,
          timestamp: new Date(),
        };

        render(<ErrorDisplay error={error} />);

        expect(screen.queryByRole('button', { name: /contact support/i })).toBeNull();
      });
    });

    describe('dismiss button', () => {
      it('should display dismiss button when onDismiss is provided', () => {
        const error: ErrorState = {
          type: 'network',
          message: 'Network error',
          retryable: true,
          timestamp: new Date(),
        };
        const onDismiss = vi.fn();

        render(<ErrorDisplay error={error} onDismiss={onDismiss} />);

        const dismissButton = screen.getByRole('button', { name: /dismiss/i });
        expect(dismissButton).toBeTruthy();
      });

      it('should call onDismiss when dismiss button is clicked', () => {
        const error: ErrorState = {
          type: 'network',
          message: 'Network error',
          retryable: true,
          timestamp: new Date(),
        };
        const onDismiss = vi.fn();

        render(<ErrorDisplay error={error} onDismiss={onDismiss} />);

        const dismissButton = screen.getByRole('button', { name: /dismiss/i });
        fireEvent.click(dismissButton);

        expect(onDismiss).toHaveBeenCalledTimes(1);
      });

      it('should not display dismiss button when onDismiss is not provided', () => {
        const error: ErrorState = {
          type: 'network',
          message: 'Network error',
          retryable: true,
          timestamp: new Date(),
        };

        render(<ErrorDisplay error={error} />);

        expect(screen.queryByRole('button', { name: /dismiss/i })).toBeNull();
      });
    });
  });

  describe('stale data warning', () => {
    it('should display stale data warning when showCachedDataWarning is true', () => {
      const error: ErrorState = {
        type: 'network',
        message: 'Network error',
        retryable: true,
        timestamp: new Date(),
      };
      const cachedDataTimestamp = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago

      render(
        <ErrorDisplay
          error={error}
          showCachedDataWarning={true}
          cachedDataTimestamp={cachedDataTimestamp}
        />
      );

      expect(screen.getByText('Showing cached data')).toBeTruthy();
      expect(screen.getByText(/last updated/i)).toBeTruthy();
    });

    it('should not display stale data warning when showCachedDataWarning is false', () => {
      const error: ErrorState = {
        type: 'network',
        message: 'Network error',
        retryable: true,
        timestamp: new Date(),
      };
      const cachedDataTimestamp = new Date(Date.now() - 5 * 60 * 1000);

      render(
        <ErrorDisplay
          error={error}
          showCachedDataWarning={false}
          cachedDataTimestamp={cachedDataTimestamp}
        />
      );

      expect(screen.queryByText('Showing cached data')).toBeNull();
    });

    it('should not display stale data warning when cachedDataTimestamp is not provided', () => {
      const error: ErrorState = {
        type: 'network',
        message: 'Network error',
        retryable: true,
        timestamp: new Date(),
      };

      render(<ErrorDisplay error={error} showCachedDataWarning={true} />);

      expect(screen.queryByText('Showing cached data')).toBeNull();
    });

    it('should format relative time correctly for minutes', () => {
      const error: ErrorState = {
        type: 'network',
        message: 'Network error',
        retryable: true,
        timestamp: new Date(),
      };
      const cachedDataTimestamp = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago

      render(
        <ErrorDisplay
          error={error}
          showCachedDataWarning={true}
          cachedDataTimestamp={cachedDataTimestamp}
        />
      );

      expect(screen.getByText(/5 minutes ago/i)).toBeTruthy();
    });
  });

  describe('integration scenarios', () => {
    it('should render complete error display with all features', () => {
      const error: ErrorState = {
        type: 'network',
        message: 'Network error. Please check your connection and try again.',
        retryable: true,
        timestamp: new Date(),
        context: {
          url: '/api/superadmin/stats',
          method: 'GET',
          attempt: 2,
        },
      };
      const onRetry = vi.fn();
      const onDismiss = vi.fn();
      const cachedDataTimestamp = new Date(Date.now() - 5 * 60 * 1000);

      render(
        <ErrorDisplay
          error={error}
          onRetry={onRetry}
          onDismiss={onDismiss}
          showCachedDataWarning={true}
          cachedDataTimestamp={cachedDataTimestamp}
        />
      );

      // Check all elements are present
      expect(screen.getByText('Network Error')).toBeTruthy();
      expect(screen.getByText(error.message)).toBeTruthy();
      expect(screen.getByText('Showing cached data')).toBeTruthy();
      expect(screen.getByRole('button', { name: /retry/i })).toBeTruthy();
      expect(screen.getByRole('button', { name: /dismiss/i })).toBeTruthy();
    });

    it('should handle auth error scenario correctly', () => {
      const error: ErrorState = {
        type: 'auth',
        message: 'Your session has expired. Please log in again.',
        statusCode: 401,
        retryable: false,
        timestamp: new Date(),
      };

      delete (window as any).location;
      window.location = { href: '' } as any;

      render(<ErrorDisplay error={error} />);

      expect(screen.getByText('Authentication Required')).toBeTruthy();
      expect(screen.getByText('401')).toBeTruthy();
      expect(screen.getByRole('button', { name: /log in/i })).toBeTruthy();
      expect(screen.queryByRole('button', { name: /retry/i })).toBeNull();
    });

    it('should handle permission error scenario correctly', () => {
      const error: ErrorState = {
        type: 'permission',
        message: "You don't have permission to access this resource.",
        statusCode: 403,
        retryable: false,
        timestamp: new Date(),
      };

      delete (window as any).location;
      window.location = { href: '' } as any;

      render(<ErrorDisplay error={error} />);

      expect(screen.getByText('Access Denied')).toBeTruthy();
      expect(screen.getByText('403')).toBeTruthy();
      expect(screen.getByRole('button', { name: /contact support/i })).toBeTruthy();
      expect(screen.queryByRole('button', { name: /retry/i })).toBeNull();
    });
  });
});

describe('ErrorDisplayCompact', () => {
  it('should render compact error display', () => {
    const error: ErrorState = {
      type: 'network',
      message: 'Network error',
      retryable: true,
      timestamp: new Date(),
    };

    render(<ErrorDisplayCompact error={error} />);

    expect(screen.getByText(error.message)).toBeTruthy();
  });

  it('should display retry button for retryable errors', () => {
    const error: ErrorState = {
      type: 'network',
      message: 'Network error',
      retryable: true,
      timestamp: new Date(),
    };
    const onRetry = vi.fn();

    render(<ErrorDisplayCompact error={error} onRetry={onRetry} />);

    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeTruthy();
  });

  it('should call onRetry when retry button is clicked', () => {
    const error: ErrorState = {
      type: 'network',
      message: 'Network error',
      retryable: true,
      timestamp: new Date(),
    };
    const onRetry = vi.fn();

    render(<ErrorDisplayCompact error={error} onRetry={onRetry} />);

    const retryButton = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryButton);

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('should not display retry button for non-retryable errors', () => {
    const error: ErrorState = {
      type: 'auth',
      message: 'Authentication required',
      retryable: false,
      timestamp: new Date(),
    };
    const onRetry = vi.fn();

    render(<ErrorDisplayCompact error={error} onRetry={onRetry} />);

    expect(screen.queryByRole('button', { name: /retry/i })).toBeNull();
  });
});
