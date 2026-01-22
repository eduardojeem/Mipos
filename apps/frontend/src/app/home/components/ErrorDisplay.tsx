/**
 * Reusable ErrorDisplay component
 * Displays error messages with optional retry functionality
 */

'use client';

import { memo } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

export interface ErrorDisplayProps {
  error: Error | null;
  onRetry?: () => void;
  message?: string;
  title?: string;
}

function ErrorDisplayComponent({
  error,
  onRetry,
  message,
  title = 'Error',
}: ErrorDisplayProps) {
  // Don't render if no error
  if (!error) {
    return null;
  }

  const displayMessage = message || error.message || 'Ocurrió un error inesperado';

  return (
    <Alert variant="destructive" className="my-4 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800">
      <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" aria-hidden="true" />
      <AlertTitle className="text-red-800 dark:text-red-300">{title}</AlertTitle>
      <AlertDescription className="mt-2 text-red-700 dark:text-red-400">
        <p className="mb-3">{displayMessage}</p>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="bg-white hover:bg-gray-100 dark:bg-slate-800 dark:hover:bg-slate-700 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300"
          >
            <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />
            Reintentar
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

export const ErrorDisplay = memo(ErrorDisplayComponent);
