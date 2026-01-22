'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, RefreshCw, X, CheckCircle, Info, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

// Tipos unificados para estados
export type UnifiedState = 'idle' | 'loading' | 'success' | 'error' | 'retrying';
export type ErrorType = 'network' | 'validation' | 'server' | 'permission' | 'unknown';
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface UnifiedError {
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

export interface LoadingConfig {
  showProgress?: boolean;
  progress?: number;
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'spinner' | 'skeleton' | 'overlay';
}

export interface UnifiedStateConfig {
  state: UnifiedState;
  error?: UnifiedError;
  loading?: LoadingConfig;
  onRetry?: () => Promise<void>;
  onDismiss?: () => void;
}

// Componente de spinner unificado
export function UnifiedSpinner({ 
  size = 'md', 
  className,
  message 
}: { 
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  message?: string;
}) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  return (
    <div className={cn('flex flex-col items-center justify-center gap-2', className)}>
      <Loader2 className={cn('animate-spin', sizeClasses[size])} />
      {message && (
        <p className="text-sm text-muted-foreground animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
}

// Componente de skeleton unificado
export function UnifiedSkeleton({
  className,
  variant = 'default',
  lines = 1,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  variant?: 'default' | 'card' | 'table' | 'form';
  lines?: number;
}) {
  const baseClass = "animate-pulse rounded-md bg-slate-100 dark:bg-slate-800";

  if (variant === 'card') {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <div className="p-0">
          <div className={cn(baseClass, "h-48 w-full rounded-t-lg")} />
        </div>
        <CardContent className="p-4 space-y-3">
          <div className={cn(baseClass, "h-4 w-3/4")} />
          <div className={cn(baseClass, "h-3 w-1/2")} />
          <div className="flex justify-between items-center">
            <div className={cn(baseClass, "h-6 w-20")} />
            <div className={cn(baseClass, "h-8 w-16 rounded-full")} />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === 'table') {
    return (
      <div className={cn("space-y-3", className)}>
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="flex space-x-4 p-4">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className={cn(baseClass, "h-4 flex-1")} />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'form') {
    return (
      <div className={cn("space-y-4", className)}>
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className={cn(baseClass, "h-4 w-24")} />
            <div className={cn(baseClass, "h-10 w-full")} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={cn(baseClass, "h-4 w-full")} />
      ))}
    </div>
  );
}

// Componente de overlay de carga
export function LoadingOverlay({ 
  isVisible, 
  message = "Cargando...",
  progress,
  className 
}: {
  isVisible: boolean;
  message?: string;
  progress?: number;
  className?: string;
}) {
  if (!isVisible) return null;

  return (
    <div className={cn(
      "fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center",
      className
    )}>
      <Card className="w-full max-w-sm mx-4">
        <CardContent className="p-6">
          <div className="flex flex-col items-center space-y-4">
            <UnifiedSpinner size="lg" />
            <div className="text-center space-y-2">
              <p className="text-sm font-medium">{message}</p>
              {typeof progress === 'number' && (
                <div className="space-y-1">
                  <Progress value={progress} className="w-full" />
                  <p className="text-xs text-muted-foreground">{progress}%</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Componente principal unificado
export function UnifiedStateHandler({
  state,
  error,
  loading,
  onRetry,
  onDismiss,
  children,
  className,
  fallback
}: UnifiedStateConfig & {
  children?: React.ReactNode;
  className?: string;
  fallback?: React.ReactNode;
}) {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = useCallback(async () => {
    if (!onRetry || retrying) return;

    setRetrying(true);
    try {
      await onRetry();
    } catch (error) {
      console.error('Retry failed:', error);
    } finally {
      setRetrying(false);
    }
  }, [onRetry, retrying]);

  // Estado de carga
  if (state === 'loading' || state === 'retrying') {
    const config = loading || {};
    const message = state === 'retrying' ? 'Reintentando...' : config.message;

    if (config.variant === 'overlay') {
      return (
        <>
          {children}
          <LoadingOverlay 
            isVisible={true} 
            message={message}
            progress={config.progress}
          />
        </>
      );
    }

    if (config.variant === 'skeleton') {
      return <UnifiedSkeleton className={className} />;
    }

    return (
      <div className={cn('flex items-center justify-center p-8', className)}>
        <UnifiedSpinner 
          size={config.size} 
          message={message}
        />
        {config.showProgress && typeof config.progress === 'number' && (
          <div className="mt-4 w-full max-w-xs">
            <Progress value={config.progress} />
            <p className="text-xs text-center mt-1 text-muted-foreground">
              {config.progress}%
            </p>
          </div>
        )}
      </div>
    );
  }

  // Estado de error
  if (state === 'error' && error) {
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

    const Icon = ERROR_ICONS[error.type];

    return (
      <div className={cn('p-4', className)}>
        <Alert className={cn(
          'relative border-l-4 transition-all duration-200',
          ERROR_COLORS[error.severity]
        )}>
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
              {error.retryable && (error.onRetry || onRetry) && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleRetry}
                  disabled={retrying}
                  className="h-6 px-2 text-xs"
                >
                  <RefreshCw className={cn(
                    "h-3 w-3",
                    retrying && "animate-spin"
                  )} />
                  {retrying ? 'Reintentando...' : 'Reintentar'}
                </Button>
              )}
              
              <Button
                size="sm"
                variant="ghost"
                onClick={onDismiss || error.onDismiss}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </Alert>
      </div>
    );
  }

  // Estado de éxito
  if (state === 'success') {
    return (
      <div className={cn('p-4', className)}>
        <Alert className="border-green-200 bg-green-50 text-green-800">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Operación completada exitosamente
          </AlertDescription>
        </Alert>
        {children}
      </div>
    );
  }

  // Estado idle o contenido normal
  return <>{children || fallback}</>;
}

// Hook unificado para manejo de estados
export function useUnifiedState(initialState: UnifiedState = 'idle') {
  const [state, setState] = useState<UnifiedState>(initialState);
  const [error, setError] = useState<UnifiedError | null>(null);
  const [loading, setLoading] = useState<LoadingConfig>({});

  const setLoadingState = useCallback((config?: LoadingConfig) => {
    setState('loading');
    setError(null);
    setLoading(config || {});
  }, []);

  const setErrorState = useCallback((errorInfo: Omit<UnifiedError, 'id' | 'timestamp'>) => {
    const error: UnifiedError = {
      ...errorInfo,
      id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };
    setState('error');
    setError(error);
    setLoading({});
  }, []);

  const setSuccessState = useCallback(() => {
    setState('success');
    setError(null);
    setLoading({});
  }, []);

  const setIdleState = useCallback(() => {
    setState('idle');
    setError(null);
    setLoading({});
  }, []);

  const executeWithState = useCallback(async <T,>(
    operation: () => Promise<T>,
    loadingConfig?: LoadingConfig
  ): Promise<T> => {
    try {
      setLoadingState(loadingConfig);
      const result = await operation();
      setSuccessState();
      return result;
    } catch (err: any) {
      setErrorState({
        type: 'unknown',
        severity: 'medium',
        message: err.message || 'Ha ocurrido un error',
        details: err.details,
        context: err.context,
        retryable: true,
        onRetry: async () => { await executeWithState(operation, loadingConfig); }
      });
      throw err;
    }
  }, [setLoadingState, setSuccessState, setErrorState]);

  return {
    state,
    error,
    loading,
    setState,
    setLoadingState,
    setErrorState,
    setSuccessState,
    setIdleState,
    executeWithState,
    isLoading: state === 'loading' || state === 'retrying',
    isError: state === 'error',
    isSuccess: state === 'success',
    isIdle: state === 'idle'
  };
}

// Utilidades para crear errores comunes
export const createNetworkError = (message: string, details?: string, retryFn?: () => Promise<void>): Omit<UnifiedError, 'id' | 'timestamp'> => ({
  type: 'network',
  severity: 'medium',
  message,
  details,
  retryable: !!retryFn,
  onRetry: retryFn,
});

export const createValidationError = (message: string, context?: Record<string, any>): Omit<UnifiedError, 'id' | 'timestamp'> => ({
  type: 'validation',
  severity: 'low',
  message,
  context,
  retryable: false,
});

export const createServerError = (message: string, details?: string, retryFn?: () => Promise<void>): Omit<UnifiedError, 'id' | 'timestamp'> => ({
  type: 'server',
  severity: 'high',
  message,
  details,
  retryable: !!retryFn,
  onRetry: retryFn,
});

export const createPermissionError = (message: string): Omit<UnifiedError, 'id' | 'timestamp'> => ({
  type: 'permission',
  severity: 'critical',
  message,
  retryable: false,
});