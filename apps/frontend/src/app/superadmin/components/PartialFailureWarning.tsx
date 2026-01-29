'use client';

/**
 * PartialFailureWarning component for displaying warnings when some data sources fail
 * but others succeed, allowing graceful degradation.
 * 
 * Feature: fix-superadmin-fetch-error
 * Requirements: 10.1, 10.2, 10.3, 10.5
 */

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ErrorState } from '@/types/error-state';

/**
 * Props for the PartialFailureWarning component
 */
export interface PartialFailureWarningProps {
  /** Error state for stats fetch failure (if any) */
  statsFailure: ErrorState | null;
  /** Error state for organizations fetch failure (if any) */
  organizationsFailure: ErrorState | null;
  /** Callback when the retry button is clicked */
  onRetry?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * PartialFailureWarning component displays a warning when partial data is available
 * due to one or more data sources failing.
 * 
 * @example
 * ```tsx
 * <PartialFailureWarning
 *   statsFailure={statsError}
 *   organizationsFailure={null}
 *   onRetry={() => refetch()}
 * />
 * ```
 */
export function PartialFailureWarning({
  statsFailure,
  organizationsFailure,
  onRetry,
  className,
}: PartialFailureWarningProps) {
  // Don't render if there are no partial failures
  if (!statsFailure && !organizationsFailure) {
    return null;
  }

  // Determine which sections failed
  const failedSections: string[] = [];
  if (statsFailure) {
    failedSections.push('Statistics');
  }
  if (organizationsFailure) {
    failedSections.push('Organizations');
  }

  // Build the warning message
  const failedSectionsText = failedSections.join(' and ');
  const message = `${failedSectionsText} ${failedSections.length > 1 ? 'are' : 'is'} currently unavailable. Showing available data.`;

  return (
    <Alert variant="default" className={cn('border-l-4 border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20', className)}>
      <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
      <AlertTitle className="text-yellow-800 dark:text-yellow-200">
        Partial Data Available
      </AlertTitle>
      <AlertDescription className="space-y-3">
        {/* Warning message */}
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          {message}
        </p>

        {/* Failed sections details */}
        <div className="space-y-2">
          {statsFailure && (
            <div className="flex items-start gap-2 text-xs">
              <Badge variant="outline" className="bg-white dark:bg-gray-900 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700">
                Statistics
              </Badge>
              <span className="text-yellow-700 dark:text-yellow-300 flex-1">
                {statsFailure.message}
              </span>
            </div>
          )}
          {organizationsFailure && (
            <div className="flex items-start gap-2 text-xs">
              <Badge variant="outline" className="bg-white dark:bg-gray-900 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700">
                Organizations
              </Badge>
              <span className="text-yellow-700 dark:text-yellow-300 flex-1">
                {organizationsFailure.message}
              </span>
            </div>
          )}
        </div>

        {/* Retry button */}
        {onRetry && (statsFailure?.retryable || organizationsFailure?.retryable) && (
          <div className="pt-1">
            <Button
              size="sm"
              variant="outline"
              onClick={onRetry}
              className="gap-2 bg-white dark:bg-gray-900 hover:bg-yellow-100 dark:hover:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry Failed Sections
            </Button>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}
