'use client';

import * as React from 'react';
import { AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { LoadingButton } from '@/components/ui/loading-button';
import { cn } from '@/lib/utils';

export type ConfirmationVariant = 'default' | 'destructive' | 'warning' | 'info' | 'success';

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmationVariant;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

const variantConfig = {
  default: {
    icon: Info,
    iconColor: 'text-blue-600 dark:text-blue-400',
    iconBg: 'bg-blue-100 dark:bg-blue-900/20',
    confirmVariant: 'default' as const,
  },
  destructive: {
    icon: XCircle,
    iconColor: 'text-red-600 dark:text-red-400',
    iconBg: 'bg-red-100 dark:bg-red-900/20',
    confirmVariant: 'destructive' as const,
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-yellow-600 dark:text-yellow-400',
    iconBg: 'bg-yellow-100 dark:bg-yellow-900/20',
    confirmVariant: 'default' as const,
  },
  info: {
    icon: Info,
    iconColor: 'text-blue-600 dark:text-blue-400',
    iconBg: 'bg-blue-100 dark:bg-blue-900/20',
    confirmVariant: 'default' as const,
  },
  success: {
    icon: CheckCircle,
    iconColor: 'text-green-600 dark:text-green-400',
    iconBg: 'bg-green-100 dark:bg-green-900/20',
    confirmVariant: 'default' as const,
  },
};

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'default',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  const handleConfirm = async () => {
    try {
      const timeout = new Promise<void>((resolve) => setTimeout(resolve, 12000));
      await Promise.race([onConfirm(), timeout]);
    } catch (error) {
      console.error('Error in confirmation dialog:', error);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-4">
            <div className={cn(
              'flex h-12 w-12 items-center justify-center rounded-full',
              config.iconBg
            )}>
              <Icon className={cn('h-6 w-6', config.iconColor)} />
            </div>
            <div className="flex-1">
              <AlertDialogTitle className="text-left">
                {title}
              </AlertDialogTitle>
            </div>
          </div>
          <AlertDialogDescription className="text-left mt-2">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
          <AlertDialogCancel 
            onClick={handleCancel}
            disabled={loading}
            className="mt-3 sm:mt-0"
          >
            {cancelText}
          </AlertDialogCancel>
          <LoadingButton
            onClick={handleConfirm}
            variant={config.confirmVariant}
            loading={loading}
            loadingText="Procesando..."
            className="w-full sm:w-auto"
          >
            {confirmText}
          </LoadingButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Hook for easier usage
export function useConfirmationDialog() {
  const [state, setState] = React.useState<{
    open: boolean;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: ConfirmationVariant;
    loading: boolean;
    onConfirm?: () => void | Promise<void>;
    onCancel?: () => void;
  }>({
    open: false,
    title: '',
    description: '',
    loading: false,
  });

  const showConfirmation = React.useCallback((options: {
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: ConfirmationVariant;
    onConfirm: () => void | Promise<void>;
    onCancel?: () => void;
  }) => {
    setState({
      open: true,
      loading: false,
      ...options,
    });
  }, []);

  const hideConfirmation = React.useCallback(() => {
    setState(prev => ({ ...prev, open: false, loading: false }));
  }, []);

  const handleConfirm = React.useCallback(async () => {
    if (!state.onConfirm) return;

    setState(prev => ({ ...prev, loading: true }));
    
    try {
      await state.onConfirm();
      hideConfirmation();
    } catch (error) {
      console.error('Error in confirmation:', error);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [state.onConfirm, hideConfirmation]);

  const handleCancel = React.useCallback(() => {
    if (state.onCancel) {
      state.onCancel();
    }
    hideConfirmation();
  }, [state.onCancel, hideConfirmation]);

  const ConfirmationDialogComponent = React.useCallback(() => (
    <ConfirmationDialog
      open={state.open}
      onOpenChange={hideConfirmation}
      title={state.title}
      description={state.description}
      confirmText={state.confirmText}
      cancelText={state.cancelText}
      variant={state.variant}
      loading={state.loading}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  ), [state, hideConfirmation, handleConfirm, handleCancel]);

  return {
    showConfirmation,
    hideConfirmation,
    ConfirmationDialog: ConfirmationDialogComponent,
    isLoading: state.loading,
  };
}
