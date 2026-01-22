import * as React from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * TouchButton - Botón optimizado para dispositivos táctiles
 * 
 * Garantiza un área táctil mínima de 44x44px según las guías de accesibilidad
 * WCAG 2.1 AA y Apple Human Interface Guidelines
 */
export interface TouchButtonProps extends ButtonProps {
  /**
   * Si es true, aplica el tamaño táctil mínimo (44x44px)
   * Por defecto es true en dispositivos móviles
   */
  touchOptimized?: boolean;
}

export const TouchButton = React.forwardRef<HTMLButtonElement, TouchButtonProps>(
  ({ className, touchOptimized = true, children, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        className={cn(
          // Tamaño táctil mínimo
          touchOptimized && 'min-h-[44px] min-w-[44px]',
          // Padding para contenido
          touchOptimized && 'px-4 py-2',
          // Asegurar que el contenido esté centrado
          'flex items-center justify-center',
          className
        )}
        {...props}
      >
        {children}
      </Button>
    );
  }
);

TouchButton.displayName = 'TouchButton';
