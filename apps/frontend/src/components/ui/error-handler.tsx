'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, X, CheckCircle, Info, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type ErrorType = 'network' | 'validation' | 'server' | 'permission' | 'unknown';
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ErrorInfo {
  id: string;
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  details?: string;
  timestamp: Date;
  context?: Record<string, any>;
  retryable?: boolean;
  onRetry?: () => Promise<void>;
  onDismiss?: () => void;
}

interface ErrorHandlerProps {
  errors: ErrorInfo[];
  maxErrors?: number;
  autoHideDelay?: number;
  showRetryButton?: boolean;
  className?: string;
}

const ERROR_ICONS = {
  network: AlertTriangle,
  validation: AlertCircle,
  server: AlertTriangle,
  permission: X,
  unknown: AlertTriangle,
};

const ERROR_COLORS = {
  low: 'border-blue-200 bg-blue-50 text-blue-800',
  medium: 'border-yellow-200 bg-yellow-50 text-yellow-800',
  high: 'border-orange-200 bg-orange-50 text-orange-800',
  critical: 'border-red-200 bg-red-50 text-red-800',
};

const SEVERITY_BADGES = {
  low: 'bg-blue-100 text-blue-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};

export function ErrorHandler({
  errors,
  maxErrors = 5,
  autoHideDelay = 5000,
  showRetryButton = true,
  className
}: ErrorHandlerProps) {
  const [visibleErrors, setVisibleErrors] = useState<ErrorInfo[]>([]);
  const [retryingErrors, setRetryingErrors] = useState<Set<string>>(new Set());

  useEffect(() => {
    setVisibleErrors(errors.slice(0, maxErrors));
  }, [errors, maxErrors]);

  useEffect(() => {
    if (autoHideDelay > 0) {
      const timers = visibleErrors
        .filter(error => error.severity === 'low' || error.severity === 'medium')
        .map(error => 
          setTimeout(() => {
            handleDismiss(error.id);
          }, autoHideDelay)
        );

      return () => {
        timers.forEach(timer => clearTimeout(timer));
      };
    }
  }, [visibleErrors, autoHideDelay]);

  const handleRetry = async (error: ErrorInfo) => {
    if (!error.onRetry || retryingErrors.has(error.id)) return;

    setRetryingErrors(prev => new Set(prev).add(error.id));

    try {
      await error.onRetry();
      handleDismiss(error.id);
    } catch (retryError) {
      console.error('Retry failed:', retryError);
    } finally {
      setRetryingErrors(prev => {
        const newSet = new Set(prev);
        newSet.delete(error.id);
        return newSet;
      });
    }
  };

  const handleDismiss = (errorId: string) => {
    const error = visibleErrors.find(e => e.id === errorId);
    if (error?.onDismiss) {
      error.onDismiss();
    }
    setVisibleErrors(prev => prev.filter(e => e.id !== errorId));
  };

  if (visibleErrors.length === 0) return null;

  return (
    <div className={cn('space-y-2', className)}>
      {visibleErrors.map((error) => {
        const Icon = ERROR_ICONS[error.type];
        const isRetrying = retryingErrors.has(error.id);

        return (
          <Alert
            key={error.id}
            className={cn(
              'relative border-l-4 transition-all duration-200',
              ERROR_COLORS[error.severity]
            )}
          >
            <div className="flex items-start gap-3">
              <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <AlertDescription className="font-medium text-sm">
                    {error.message}
                  </AlertDescription>
                  <Badge 
                    variant="secondary" 
                    className={cn('text-xs', SEVERITY_BADGES[error.severity])}
                  >
                    {error.severity}
                  </Badge>
                </div>
                
                {error.details && (
                  <AlertDescription className="text-xs opacity-80 mt-1">
                    {error.details}
                  </AlertDescription>
                )}

                {error.context && (
                  <details className="mt-2">
                    <summary className="text-xs cursor-pointer opacity-60 hover:opacity-80">
                      Detalles técnicos
                    </summary>
                    <pre className="text-xs mt-1 p-2 bg-black/5 rounded overflow-auto max-h-20">
                      {JSON.stringify(error.context, null, 2)}
                    </pre>
                  </details>
                )}
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                {showRetryButton && error.retryable && error.onRetry && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRetry(error)}
                    disabled={isRetrying}
                    className="h-6 px-2 text-xs"
                  >
                    <RefreshCw className={cn(
                      "h-3 w-3",
                      isRetrying && "animate-spin"
                    )} />
                    {isRetrying ? 'Reintentando...' : 'Reintentar'}
                  </Button>
                )}
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDismiss(error.id)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </Alert>
        );
      })}
    </div>
  );
}

// Hook para manejar errores de forma centralizada
export function useErrorHandler() {
  const [errors, setErrors] = useState<ErrorInfo[]>([]);

  const addError = (error: Omit<ErrorInfo, 'id' | 'timestamp'>) => {
    const errorInfo: ErrorInfo = {
      ...error,
      id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };

    setErrors(prev => [...prev, errorInfo]);
    return errorInfo.id;
  };

  const removeError = (errorId: string) => {
    setErrors(prev => prev.filter(e => e.id !== errorId));
  };

  const clearErrors = () => {
    setErrors([]);
  };

  const addNetworkError = (message: string, details?: string, retryFn?: () => Promise<void>) => {
    return addError({
      type: 'network',
      severity: 'medium',
      message,
      details,
      retryable: !!retryFn,
      onRetry: retryFn,
    });
  };

  const addValidationError = (message: string, context?: Record<string, any>) => {
    return addError({
      type: 'validation',
      severity: 'low',
      message,
      context,
      retryable: false,
    });
  };

  const addServerError = (message: string, details?: string, retryFn?: () => Promise<void>) => {
    return addError({
      type: 'server',
      severity: 'high',
      message,
      details,
      retryable: !!retryFn,
      onRetry: retryFn,
    });
  };

  const addPermissionError = (message: string) => {
    return addError({
      type: 'permission',
      severity: 'critical',
      message,
      retryable: false,
    });
  };

  return {
    errors,
    addError,
    removeError,
    clearErrors,
    addNetworkError,
    addValidationError,
    addServerError,
    addPermissionError,
  };
}