'use client';

/**
 * ErrorDisplay component for displaying user-friendly error messages
 * with actionable guidance in the superadmin area.
 * 
 * Feature: fix-superadmin-fetch-error
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */

import React from 'react';
import { 
  AlertTriangle, 
  WifiOff, 
  Lock, 
  Shield, 
  Clock, 
  ServerCrash, 
  HelpCircle,
  RefreshCw,
  LogIn,
  Mail,
  X
} from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ErrorState, ErrorType } from '@/types/error-state';

/**
 * Props for the ErrorDisplay component
 */
export interface ErrorDisplayProps {
  /** The error state to display */
  error: ErrorState;
  /** Callback when the retry button is clicked */
  onRetry?: () => void;
  /** Callback when the dismiss button is clicked */
  onDismiss?: () => void;
  /** Whether to show a warning that cached data is being displayed */
  showCachedDataWarning?: boolean;
  /** Timestamp of the cached data */
  cachedDataTimestamp?: Date;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Maps error types to their corresponding icons
 */
const ERROR_ICONS: Record<ErrorType, React.ComponentType<{ className?: string }>> = {
  network: WifiOff,
  auth: Lock,
  permission: Shield,
  timeout: Clock,
  server: ServerCrash,
  unknown: HelpCircle,
};

/**
 * Maps error types to their display titles
 */
const ERROR_TITLES: Record<ErrorType, string> = {
  network: 'Network Error',
  auth: 'Authentication Required',
  permission: 'Access Denied',
  timeout: 'Request Timeout',
  server: 'Server Error',
  unknown: 'Error',
};

/**
 * Maps error types to their alert variants
 */
const ERROR_VARIANTS: Record<ErrorType, 'default' | 'destructive'> = {
  network: 'destructive',
  auth: 'destructive',
  permission: 'destructive',
  timeout: 'destructive',
  server: 'destructive',
  unknown: 'destructive',
};

/**
 * Formats a timestamp as a relative time string
 */
function formatRelativeTime(timestamp: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - timestamp.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

/**
 * ErrorDisplay component displays user-friendly error messages with appropriate
 * actions based on the error type.
 * 
 * @example
 * ```tsx
 * <ErrorDisplay
 *   error={errorState}
 *   onRetry={() => refetch()}
 *   onDismiss={() => clearError()}
 *   showCachedDataWarning={true}
 *   cachedDataTimestamp={lastFetchTime}
 * />
 * ```
 */
export function ErrorDisplay({
  error,
  onRetry,
  onDismiss,
  showCachedDataWarning = false,
  cachedDataTimestamp,
  className,
}: ErrorDisplayProps) {
  const Icon = ERROR_ICONS[error.type];
  const title = ERROR_TITLES[error.type];
  const variant = ERROR_VARIANTS[error.type];

  /**
   * Handles the login redirect for authentication errors
   */
  const handleLogin = () => {
    window.location.href = '/login';
  };

  /**
   * Handles the contact support action
   */
  const handleContactSupport = () => {
    // In a real application, this would open a support dialog or redirect to a support page
    window.location.href = 'mailto:support@example.com?subject=Superadmin Access Issue';
  };

  return (
    <Alert variant={variant} className={cn('border-l-4', className)}>
      <Icon className="h-5 w-5" />
      <AlertTitle className="flex items-center gap-2">
        {title}
        {error.statusCode && (
          <Badge variant="outline" className="text-xs font-mono">
            {error.statusCode}
          </Badge>
        )}
      </AlertTitle>
      <AlertDescription className="space-y-3">
        {/* Error message */}
        <p className="text-sm">{error.message}</p>

        {/* Cached data warning */}
        {showCachedDataWarning && cachedDataTimestamp && (
          <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-yellow-800 dark:text-yellow-200">
              <p className="font-medium mb-1">Showing cached data</p>
              <p className="opacity-80">
                Last updated {formatRelativeTime(cachedDataTimestamp)}. 
                The data shown may be outdated.
              </p>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {/* Retry button for retryable errors */}
          {error.retryable && onRetry && (
            <Button
              size="sm"
              variant="default"
              onClick={onRetry}
              className="gap-2"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </Button>
          )}

          {/* Login button for auth errors */}
          {error.type === 'auth' && (
            <Button
              size="sm"
              variant="default"
              onClick={handleLogin}
              className="gap-2"
            >
              <LogIn className="h-3.5 w-3.5" />
              Log In
            </Button>
          )}

          {/* Contact support button for permission errors */}
          {error.type === 'permission' && (
            <Button
              size="sm"
              variant="default"
              onClick={handleContactSupport}
              className="gap-2"
            >
              <Mail className="h-3.5 w-3.5" />
              Contact Support
            </Button>
          )}

          {/* Dismiss button */}
          {onDismiss && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onDismiss}
              className="gap-2"
            >
              <X className="h-3.5 w-3.5" />
              Dismiss
            </Button>
          )}
        </div>

        {/* Technical details for debugging (only in development) */}
        {process.env.NODE_ENV === 'development' && error.context && (
          <details className="mt-2">
            <summary className="text-xs cursor-pointer opacity-60 hover:opacity-80">
              Technical Details
            </summary>
            <pre className="text-xs mt-2 p-2 bg-black/5 dark:bg-white/5 rounded overflow-auto max-h-32">
              {JSON.stringify(
                {
                  type: error.type,
                  statusCode: error.statusCode,
                  timestamp: error.timestamp,
                  context: error.context,
                },
                null,
                2
              )}
            </pre>
          </details>
        )}
      </AlertDescription>
    </Alert>
  );
}

/**
 * Compact version of ErrorDisplay for inline use
 */
export function ErrorDisplayCompact({
  error,
  onRetry,
  className,
}: Pick<ErrorDisplayProps, 'error' | 'onRetry' | 'className'>) {
  const Icon = ERROR_ICONS[error.type];

  return (
    <div className={cn('flex items-center gap-2 text-sm text-destructive', className)}>
      <Icon className="h-4 w-4 flex-shrink-0" />
      <span className="flex-1">{error.message}</span>
      {error.retryable && onRetry && (
        <Button
          size="sm"
          variant="ghost"
          onClick={onRetry}
          className="h-7 px-2 gap-1"
        >
          <RefreshCw className="h-3 w-3" />
          Retry
        </Button>
      )}
    </div>
  );
}
