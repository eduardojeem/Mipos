import React from 'react';
import { AlertTriangle, Loader2, RefreshCw, CheckCircle, Info, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// Tipos para los componentes de estado
export interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showSpinner?: boolean;
}

export interface ErrorStateProps {
  error: string;
  title?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
  variant?: 'default' | 'destructive' | 'warning';
}

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export interface ValidationErrorsProps {
  errors: string[];
  warnings?: string[];
  title?: string;
  onClose?: () => void;
  className?: string;
}

/**
 * Componente para mostrar estado de carga
 */
export const LoadingState: React.FC<LoadingStateProps> = ({
  message = "Cargando...",
  size = 'md',
  className,
  showSpinner = true
}) => {
  const sizeClasses = {
    sm: 'py-6',
    md: 'py-12',
    lg: 'py-20'
  };

  const spinnerSizes = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className={cn(
      "flex flex-col items-center justify-center space-y-4",
      sizeClasses[size],
      className
    )}>
      {showSpinner && (
        <div className="relative">
          <Loader2 className={cn(
            "animate-spin text-violet-600 dark:text-violet-400",
            spinnerSizes[size]
          )} />
          <div className={cn(
            "absolute inset-0 border-2 border-violet-200 dark:border-violet-800 rounded-full animate-pulse",
            spinnerSizes[size]
          )} />
        </div>
      )}
      <p className={cn(
        "text-slate-600 dark:text-slate-400 animate-pulse text-center",
        size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-lg' : 'text-base'
      )}>
        {message}
      </p>
    </div>
  );
};

/**
 * Componente para mostrar errores
 */
export const ErrorState: React.FC<ErrorStateProps> = ({
  error,
  title = "Error al cargar los datos",
  onRetry,
  retryLabel = "Reintentar",
  className,
  variant = 'default'
}) => {
  const variantClasses = {
    default: {
      icon: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-100 dark:bg-red-900/30',
      title: 'text-slate-900 dark:text-white',
      description: 'text-slate-600 dark:text-slate-400'
    },
    destructive: {
      icon: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-100 dark:bg-red-900/30',
      title: 'text-red-900 dark:text-red-100',
      description: 'text-red-700 dark:text-red-300'
    },
    warning: {
      icon: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      title: 'text-amber-900 dark:text-amber-100',
      description: 'text-amber-700 dark:text-amber-300'
    }
  };

  const classes = variantClasses[variant];

  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-12 space-y-4",
      className
    )}>
      <div className={cn("p-3 rounded-full", classes.bg)}>
        <AlertTriangle className={cn("h-8 w-8", classes.icon)} />
      </div>
      <div className="text-center space-y-2 max-w-md">
        <h3 className={cn("font-medium", classes.title)}>
          {title}
        </h3>
        <p className={cn("text-sm", classes.description)}>
          {error}
        </p>
      </div>
      {onRetry && (
        <Button 
          variant="outline" 
          onClick={onRetry} 
          className="gap-2 mt-4"
          size="sm"
        >
          <RefreshCw className="h-4 w-4" />
          {retryLabel}
        </Button>
      )}
    </div>
  );
};

/**
 * Componente para mostrar estado vacío
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
  className
}) => {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-16 space-y-4",
      className
    )}>
      <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full">
        {icon || <Info className="h-8 w-8 text-slate-400" />}
      </div>
      <div className="text-center space-y-2 max-w-md">
        <h3 className="font-medium text-slate-900 dark:text-white">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {description}
          </p>
        )}
      </div>
      {action && (
        <Button 
          variant="outline" 
          onClick={action.onClick}
          className="mt-4"
          size="sm"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
};

/**
 * Componente para mostrar errores de validación
 */
export const ValidationErrors: React.FC<ValidationErrorsProps> = ({
  errors,
  warnings = [],
  title = "Errores de validación",
  onClose,
  className
}) => {
  if (errors.length === 0 && warnings.length === 0) return null;

  return (
    <Card className={cn("border-red-200 dark:border-red-800", className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <h4 className="font-medium text-red-900 dark:text-red-100">
              {title}
            </h4>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
            >
              ×
            </Button>
          )}
        </div>
        
        {errors.length > 0 && (
          <div className="space-y-1 mb-3">
            <p className="text-sm font-medium text-red-800 dark:text-red-200">
              Errores críticos:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-red-700 dark:text-red-300">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}
        
        {warnings.length > 0 && (
          <div className="space-y-1">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              Advertencias:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-amber-700 dark:text-amber-300">
              {warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Wrapper para contenido de pestañas con estados
 */
export interface TabContentWrapperProps {
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  children: React.ReactNode;
  loadingMessage?: string;
  errorTitle?: string;
  className?: string;
}

export const TabContentWrapper: React.FC<TabContentWrapperProps> = ({
  loading = false,
  error = null,
  onRetry,
  children,
  loadingMessage,
  errorTitle,
  className
}) => {
  if (loading) {
    return (
      <div className={className}>
        <LoadingState message={loadingMessage} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <ErrorState 
          error={error} 
          title={errorTitle}
          onRetry={onRetry} 
        />
      </div>
    );
  }

  return <div className={className}>{children}</div>;
};

/**
 * Componente de éxito
 */
export interface SuccessStateProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const SuccessState: React.FC<SuccessStateProps> = ({
  title,
  description,
  action,
  className
}) => {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-12 space-y-4",
      className
    )}>
      <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
        <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
      </div>
      <div className="text-center space-y-2 max-w-md">
        <h3 className="font-medium text-green-900 dark:text-green-100">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-green-700 dark:text-green-300">
            {description}
          </p>
        )}
      </div>
      {action && (
        <Button 
          variant="outline" 
          onClick={action.onClick}
          className="mt-4 border-green-300 text-green-700 hover:bg-green-50"
          size="sm"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
};