'use client';

import * as React from 'react';
import { LucideIcon, Package, Search, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
    variant?: 'default' | 'outline' | 'secondary';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeConfig = {
  sm: {
    container: 'py-8',
    iconSize: 'h-12 w-12',
    iconContainer: 'h-16 w-16',
    title: 'text-lg',
    description: 'text-sm',
  },
  md: {
    container: 'py-12',
    iconSize: 'h-16 w-16',
    iconContainer: 'h-20 w-20',
    title: 'text-xl',
    description: 'text-base',
  },
  lg: {
    container: 'py-16',
    iconSize: 'h-20 w-20',
    iconContainer: 'h-24 w-24',
    title: 'text-2xl',
    description: 'text-lg',
  },
};

export function EmptyState({
  icon: Icon = Package,
  title,
  description,
  action,
  secondaryAction,
  className,
  size = 'md',
}: EmptyStateProps) {
  const config = sizeConfig[size];
  const ActionIcon = action?.icon;
  const SecondaryActionIcon = secondaryAction?.icon;

  return (
    <Card className={cn('border-dashed', className)}>
      <CardContent className={cn(
        'flex flex-col items-center justify-center text-center',
        config.container
      )}>
        <div className={cn(
          'mx-auto flex items-center justify-center rounded-full bg-muted',
          config.iconContainer
        )}>
          <Icon className={cn(config.iconSize, 'text-muted-foreground')} />
        </div>
        
        <h3 className={cn(
          'mt-4 font-semibold text-foreground',
          config.title
        )}>
          {title}
        </h3>
        
        <p className={cn(
          'mt-2 text-muted-foreground max-w-sm',
          config.description
        )}>
          {description}
        </p>

        {(action || secondaryAction) && (
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            {action && (
              <Button
                onClick={action.onClick}
                variant={action.variant || 'default'}
                className="min-w-[120px]"
              >
                {ActionIcon && <ActionIcon className="mr-2 h-4 w-4" />}
                {action.label}
              </Button>
            )}
            
            {secondaryAction && (
              <Button
                onClick={secondaryAction.onClick}
                variant="outline"
                className="min-w-[120px]"
              >
                {SecondaryActionIcon && <SecondaryActionIcon className="mr-2 h-4 w-4" />}
                {secondaryAction.label}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Predefined empty states for common scenarios
export function NoProductsFound({ onAddProduct }: { onAddProduct?: () => void }) {
  return (
    <EmptyState
      icon={Package}
      title="No se encontraron productos"
      description="No hay productos que coincidan con tu búsqueda. Intenta ajustar los filtros o agrega un nuevo producto."
      action={onAddProduct ? {
        label: 'Agregar producto',
        onClick: onAddProduct,
        icon: Plus,
      } : undefined}
      secondaryAction={{
        label: 'Limpiar filtros',
        onClick: () => window.location.reload(),
        icon: RefreshCw,
      }}
    />
  );
}

export function NoSearchResults({ 
  searchTerm, 
  onClearSearch 
}: { 
  searchTerm: string; 
  onClearSearch: () => void; 
}) {
  return (
    <EmptyState
      icon={Search}
      title="Sin resultados"
      description={`No se encontraron resultados para "${searchTerm}". Intenta con otros términos de búsqueda.`}
      action={{
        label: 'Limpiar búsqueda',
        onClick: onClearSearch,
        icon: RefreshCw,
        variant: 'outline',
      }}
      size="sm"
    />
  );
}

export function NoDataAvailable({ 
  onRefresh,
  title = "No hay datos disponibles",
  description = "No se encontraron datos para mostrar en este momento."
}: { 
  onRefresh?: () => void;
  title?: string;
  description?: string;
}) {
  return (
    <EmptyState
      icon={Package}
      title={title}
      description={description}
      action={onRefresh ? {
        label: 'Actualizar',
        onClick: onRefresh,
        icon: RefreshCw,
        variant: 'outline',
      } : undefined}
      size="sm"
    />
  );
}

// Loading empty state
export function LoadingEmptyState({ message = "Cargando datos..." }: { message?: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center text-center py-12">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-muted">
          <RefreshCw className="h-8 w-8 text-muted-foreground animate-spin" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-foreground">
          {message}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Por favor espera mientras cargamos la información.
        </p>
      </CardContent>
    </Card>
  );
}