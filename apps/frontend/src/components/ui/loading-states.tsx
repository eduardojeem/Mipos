'use client';

import React from 'react';
import { Loader2, CheckCircle, XCircle, AlertCircle, Upload, Download, Trash2, Edit, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Tipos de estados de carga
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  return (
    <Loader2 className={cn('animate-spin', sizeClasses[size], className)} />
  );
}

// Botón con estado de carga
interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export function LoadingButton({
  loading = false,
  loadingText,
  variant = 'default',
  size = 'default',
  icon,
  children,
  disabled,
  className,
  ...props
}: LoadingButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      disabled={loading || disabled}
      className={className}
      {...props}
    >
      {loading ? (
        <>
          <LoadingSpinner size="sm" className="mr-2" />
          {loadingText || 'Cargando...'}
        </>
      ) : (
        <>
          {icon && <span className="mr-2">{icon}</span>}
          {children}
        </>
      )}
    </Button>
  );
}

// Estados de operación con iconos
interface OperationStateProps {
  state: LoadingState;
  operation?: 'create' | 'update' | 'delete' | 'upload' | 'download' | 'export' | 'import';
  messages?: {
    loading?: string;
    success?: string;
    error?: string;
  };
  className?: string;
}

export function OperationState({ 
  state, 
  operation = 'create',
  messages = {},
  className 
}: OperationStateProps) {
  const operationConfig = {
    create: {
      icon: Plus,
      loading: 'Creando...',
      success: 'Creado exitosamente',
      error: 'Error al crear'
    },
    update: {
      icon: Edit,
      loading: 'Actualizando...',
      success: 'Actualizado exitosamente',
      error: 'Error al actualizar'
    },
    delete: {
      icon: Trash2,
      loading: 'Eliminando...',
      success: 'Eliminado exitosamente',
      error: 'Error al eliminar'
    },
    upload: {
      icon: Upload,
      loading: 'Subiendo...',
      success: 'Subido exitosamente',
      error: 'Error al subir'
    },
    download: {
      icon: Download,
      loading: 'Descargando...',
      success: 'Descargado exitosamente',
      error: 'Error al descargar'
    },
    export: {
      icon: Download,
      loading: 'Exportando...',
      success: 'Exportado exitosamente',
      error: 'Error al exportar'
    },
    import: {
      icon: Upload,
      loading: 'Importando...',
      success: 'Importado exitosamente',
      error: 'Error al importar'
    }
  };

  const config = operationConfig[operation];
  const Icon = config.icon;

  const stateConfig = {
    idle: { color: 'text-muted-foreground', bgColor: 'bg-muted' },
    loading: { color: 'text-blue-600', bgColor: 'bg-blue-100' },
    success: { color: 'text-green-600', bgColor: 'bg-green-100' },
    error: { color: 'text-red-600', bgColor: 'bg-red-100' }
  };

  const currentConfig = stateConfig[state];
  let message = messages[state as keyof typeof messages];
  if (!message && state !== 'idle') {
    switch (state) {
      case 'loading':
        message = config.loading;
        break;
      case 'success':
        message = config.success;
        break;
      case 'error':
        message = config.error;
        break;
      default:
        message = '';
    }
  }

  if (state === 'idle') return null;

  return (
    <div className={cn('flex items-center gap-2 p-2 rounded-md', currentConfig.bgColor, className)}>
      {state === 'loading' && <LoadingSpinner size="sm" className={currentConfig.color} />}
      {state === 'success' && <CheckCircle className={cn('h-4 w-4', currentConfig.color)} />}
      {state === 'error' && <XCircle className={cn('h-4 w-4', currentConfig.color)} />}
      <span className={cn('text-sm font-medium', currentConfig.color)}>
        {message}
      </span>
    </div>
  );
}

// Barra de progreso con estado
interface ProgressWithStateProps {
  progress: number;
  state: LoadingState;
  label?: string;
  showPercentage?: boolean;
  className?: string;
}

export function ProgressWithState({
  progress,
  state,
  label,
  showPercentage = true,
  className
}: ProgressWithStateProps) {
  const stateColors = {
    idle: 'bg-muted',
    loading: 'bg-blue-500',
    success: 'bg-green-500',
    error: 'bg-red-500'
  };

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">{label}</span>
          {showPercentage && (
            <span className="text-sm text-muted-foreground">{progress}%</span>
          )}
        </div>
      )}
      <Progress 
        value={progress} 
        className={cn('h-2', stateColors[state])}
      />
    </div>
  );
}

// Card de estado de operación
interface OperationCardProps {
  title: string;
  description?: string;
  state: LoadingState;
  progress?: number;
  operation?: OperationStateProps['operation'];
  onRetry?: () => void;
  onCancel?: () => void;
  className?: string;
}

export function OperationCard({
  title,
  description,
  state,
  progress,
  operation,
  onRetry,
  onCancel,
  className
}: OperationCardProps) {
  return (
    <Card className={cn('w-full max-w-md', className)}>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold">{title}</h3>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>

          <OperationState state={state} operation={operation} />

          {progress !== undefined && state === 'loading' && (
            <ProgressWithState
              progress={progress}
              state={state}
              showPercentage={true}
            />
          )}

          {(state === 'error' || state === 'success') && (
            <div className="flex gap-2 pt-2">
              {state === 'error' && onRetry && (
                <Button variant="outline" size="sm" onClick={onRetry}>
                  Reintentar
                </Button>
              )}
              {onCancel && (
                <Button variant="ghost" size="sm" onClick={onCancel}>
                  {state === 'success' ? 'Cerrar' : 'Cancelar'}
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Lista de operaciones en progreso
interface OperationListProps {
  operations: Array<{
    id: string;
    title: string;
    state: LoadingState;
    progress?: number;
    operation?: OperationStateProps['operation'];
  }>;
  className?: string;
}

export function OperationList({ operations, className }: OperationListProps) {
  if (operations.length === 0) return null;

  return (
    <div className={cn('space-y-2', className)}>
      {operations.map((op) => (
        <div key={op.id} className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex-1">
            <div className="font-medium text-sm">{op.title}</div>
            {op.progress !== undefined && (
              <ProgressWithState
                progress={op.progress}
                state={op.state}
                className="mt-2"
              />
            )}
          </div>
          <OperationState state={op.state} operation={op.operation} />
        </div>
      ))}
    </div>
  );
}

// Hook para manejar estados de operación
export function useOperationState(initialState: LoadingState = 'idle') {
  const [state, setState] = React.useState<LoadingState>(initialState);
  const [progress, setProgress] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);

  const startOperation = React.useCallback(() => {
    setState('loading');
    setProgress(0);
    setError(null);
  }, []);

  const updateProgress = React.useCallback((newProgress: number) => {
    setProgress(Math.min(100, Math.max(0, newProgress)));
  }, []);

  const completeOperation = React.useCallback(() => {
    setState('success');
    setProgress(100);
    setError(null);
  }, []);

  const failOperation = React.useCallback((errorMessage: string) => {
    setState('error');
    setError(errorMessage);
  }, []);

  const resetOperation = React.useCallback(() => {
    setState('idle');
    setProgress(0);
    setError(null);
  }, []);

  return {
    state,
    progress,
    error,
    startOperation,
    updateProgress,
    completeOperation,
    failOperation,
    resetOperation,
    isLoading: state === 'loading',
    isSuccess: state === 'success',
    isError: state === 'error',
    isIdle: state === 'idle'
  };
}

// Componente de overlay de carga
interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  progress?: number;
  onCancel?: () => void;
}

export function LoadingOverlay({ 
  isVisible, 
  message = 'Cargando...', 
  progress,
  onCancel 
}: LoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-sm mx-4">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <LoadingSpinner size="lg" className="mx-auto" />
            <div>
              <p className="font-medium">{message}</p>
              {progress !== undefined && (
                <ProgressWithState
                  progress={progress}
                  state="loading"
                  className="mt-3"
                />
              )}
            </div>
            {onCancel && (
              <Button variant="outline" onClick={onCancel} className="mt-4">
                Cancelar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Skeleton components for better loading states
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-slate-100 dark:bg-slate-800", className)}
      {...props}
    />
  )
}

// Loading para tarjetas de productos
export function ProductCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="p-0">
        <Skeleton className="h-48 w-full rounded-t-lg" />
      </div>
      <CardContent className="p-4 space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-8 w-16 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}

// Loading para tabla de datos
export function TableSkeleton({ 
  rows = 5, 
  columns = 4,
  className 
}: { 
  rows?: number; 
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex space-x-4 p-4 border-b">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex space-x-4 p-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

// Loading para dashboard cards
export function DashboardCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
          <Skeleton className="h-12 w-12 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
}

// Loading para formularios
export function FormSkeleton({ fields = 4, className }: { fields?: number; className?: string }) {
  return (
    <div className={cn("space-y-6", className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <div className="flex justify-end space-x-2">
        <Skeleton className="h-10 w-20" />
        <Skeleton className="h-10 w-20" />
      </div>
    </div>
  );
}

// Loading para sidebar
export function SidebarSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4 p-4", className)}>
      {/* Logo */}
      <div className="flex items-center space-x-3 p-2">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div className="space-y-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      
      {/* Navigation items */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-3 p-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-4 flex-1" />
        </div>
      ))}
    </div>
  );
}

// Loading para header
export function HeaderSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-between p-4 border-b", className)}>
      <div className="flex items-center space-x-4">
        <Skeleton className="h-9 w-9 lg:hidden" />
        <Skeleton className="h-9 w-64 lg:w-80" />
      </div>
      
      <div className="flex items-center space-x-2">
        <Skeleton className="h-9 w-9" />
        <Skeleton className="h-9 w-9" />
        <Skeleton className="h-9 w-9" />
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>
    </div>
  );
}

// Loading para página completa
export function PageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("min-h-screen bg-slate-50 dark:bg-slate-900", className)}>
      <HeaderSkeleton />
      <div className="flex">
        <SidebarSkeleton className="w-72 border-r" />
        <div className="flex-1 p-6 space-y-6">
          <div className="flex justify-between items-center">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <DashboardCardSkeleton key={i} />
            ))}
          </div>
          
          <Card>
            <div className="p-6 pb-4">
              <Skeleton className="h-6 w-32" />
            </div>
            <CardContent>
              <TableSkeleton />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default {
  LoadingSpinner,
  LoadingButton,
  OperationState,
  ProgressWithState,
  OperationCard,
  OperationList,
  LoadingOverlay,
  useOperationState,
  Skeleton,
  ProductCardSkeleton,
  TableSkeleton,
  DashboardCardSkeleton,
  FormSkeleton,
  SidebarSkeleton,
  HeaderSkeleton,
  PageSkeleton
};