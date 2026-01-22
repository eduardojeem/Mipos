import React from 'react';
import { cn } from '@/lib/utils';

// Tipos para el sistema de colores
type ColorVariant = 
  | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'gray';

type ColorShade = 
  | 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950;

type ColorIntensity = 'light' | 'main' | 'dark';

// Mapeo de colores a clases CSS
const colorVariantMap: Record<ColorVariant, Record<ColorIntensity, string>> = {
  primary: {
    light: 'bg-primary-100 text-primary-800 border-primary-200',
    main: 'bg-primary-500 text-white border-primary-500',
    dark: 'bg-primary-700 text-white border-primary-700',
  },
  secondary: {
    light: 'bg-secondary-100 text-secondary-800 border-secondary-200',
    main: 'bg-secondary-500 text-white border-secondary-500',
    dark: 'bg-secondary-700 text-white border-secondary-700',
  },
  success: {
    light: 'bg-success-100 text-success-800 border-success-200',
    main: 'bg-success-500 text-white border-success-500',
    dark: 'bg-success-700 text-white border-success-700',
  },
  warning: {
    light: 'bg-warning-100 text-warning-800 border-warning-200',
    main: 'bg-warning-500 text-white border-warning-500',
    dark: 'bg-warning-700 text-white border-warning-700',
  },
  error: {
    light: 'bg-error-100 text-error-800 border-error-200',
    main: 'bg-error-500 text-white border-error-500',
    dark: 'bg-error-700 text-white border-error-700',
  },
  info: {
    light: 'bg-info-100 text-info-800 border-info-200',
    main: 'bg-info-500 text-white border-info-500',
    dark: 'bg-info-700 text-white border-info-700',
  },
  gray: {
    light: 'bg-gray-100 text-gray-800 border-gray-200',
    main: 'bg-gray-500 text-white border-gray-500',
    dark: 'bg-gray-700 text-white border-gray-700',
  },
};

// Componente ColorBox para mostrar colores
interface ColorBoxProps {
  variant: ColorVariant;
  intensity?: ColorIntensity;
  className?: string;
  children?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  rounded?: boolean;
  border?: boolean;
}

export const ColorBox: React.FC<ColorBoxProps> = ({
  variant,
  intensity = 'main',
  className,
  children,
  size = 'md',
  rounded = true,
  border = false,
}) => {
  const colorClasses = colorVariantMap[variant][intensity];
  
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  }[size];

  const classes = cn(
    'flex items-center justify-center',
    colorClasses,
    sizeClasses,
    {
      'rounded-md': rounded,
      'border': border,
    },
    className
  );

  return (
    <div className={classes}>
      {children}
    </div>
  );
};

// Componente Badge con colores
interface ColorBadgeProps {
  variant: ColorVariant;
  intensity?: ColorIntensity;
  className?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
}

export const ColorBadge: React.FC<ColorBadgeProps> = ({
  variant,
  intensity = 'light',
  className,
  children,
  size = 'md',
  dot = false,
}) => {
  const colorClasses = colorVariantMap[variant][intensity];
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  }[size];

  const classes = cn(
    'inline-flex items-center font-medium rounded-full',
    colorClasses,
    sizeClasses,
    className
  );

  return (
    <span className={classes}>
      {dot && (
        <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
      )}
      {children}
    </span>
  );
};

// Componente Alert con colores
interface ColorAlertProps {
  variant: ColorVariant;
  className?: string;
  children: React.ReactNode;
  title?: string;
  icon?: React.ReactNode;
  onClose?: () => void;
}

export const ColorAlert: React.FC<ColorAlertProps> = ({
  variant,
  className,
  children,
  title,
  icon,
  onClose,
}) => {
  const colorClasses = colorVariantMap[variant].light;

  const classes = cn(
    'p-4 rounded-md border',
    colorClasses,
    className
  );

  return (
    <div className={classes}>
      <div className="flex">
        {icon && (
          <div className="flex-shrink-0 mr-3">
            {icon}
          </div>
        )}
        <div className="flex-1">
          {title && (
            <h3 className="text-sm font-medium mb-1">
              {title}
            </h3>
          )}
          <div className="text-sm">
            {children}
          </div>
        </div>
        {onClose && (
          <div className="flex-shrink-0 ml-3">
            <button
              type="button"
              className="inline-flex rounded-md p-1.5 hover:bg-black hover:bg-opacity-10 focus:outline-none focus:ring-2 focus:ring-offset-2"
              onClick={onClose}
            >
              <span className="sr-only">Cerrar</span>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Componente Progress con colores
interface ColorProgressProps {
  variant: ColorVariant;
  value: number;
  max?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  label?: string;
}

export const ColorProgress: React.FC<ColorProgressProps> = ({
  variant,
  value,
  max = 100,
  className,
  size = 'md',
  showLabel = false,
  label,
}) => {
  const percentage = Math.min((value / max) * 100, 100);
  
  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  }[size];

  const progressColorClasses = {
    primary: 'bg-primary-500',
    secondary: 'bg-secondary-500',
    success: 'bg-success-500',
    warning: 'bg-warning-500',
    error: 'bg-error-500',
    info: 'bg-info-500',
    gray: 'bg-gray-500',
  }[variant];

  return (
    <div className={className}>
      {(showLabel || label) && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-gray-700">
            {label || `${Math.round(percentage)}%`}
          </span>
          {showLabel && !label && (
            <span className="text-sm text-gray-500">
              {value}/{max}
            </span>
          )}
        </div>
      )}
      <div className={cn('w-full bg-gray-200 rounded-full overflow-hidden', sizeClasses)}>
        <div
          className={cn('h-full transition-all duration-300 ease-out', progressColorClasses)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

// Componente Dot para indicadores de estado
interface ColorDotProps {
  variant: ColorVariant;
  intensity?: ColorIntensity;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  pulse?: boolean;
}

export const ColorDot: React.FC<ColorDotProps> = ({
  variant,
  intensity = 'main',
  size = 'md',
  className,
  pulse = false,
}) => {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  }[size];

  const colorClasses = {
    primary: intensity === 'light' ? 'bg-primary-300' : intensity === 'main' ? 'bg-primary-500' : 'bg-primary-700',
    secondary: intensity === 'light' ? 'bg-secondary-300' : intensity === 'main' ? 'bg-secondary-500' : 'bg-secondary-700',
    success: intensity === 'light' ? 'bg-success-300' : intensity === 'main' ? 'bg-success-500' : 'bg-success-700',
    warning: intensity === 'light' ? 'bg-warning-300' : intensity === 'main' ? 'bg-warning-500' : 'bg-warning-700',
    error: intensity === 'light' ? 'bg-error-300' : intensity === 'main' ? 'bg-error-500' : 'bg-error-700',
    info: intensity === 'light' ? 'bg-info-300' : intensity === 'main' ? 'bg-info-500' : 'bg-info-700',
    gray: intensity === 'light' ? 'bg-gray-300' : intensity === 'main' ? 'bg-gray-500' : 'bg-gray-700',
  }[variant];

  const classes = cn(
    'rounded-full',
    sizeClasses,
    colorClasses,
    {
      'animate-pulse': pulse,
    },
    className
  );

  return <div className={classes} />;
};

// Componente ColorPalette para mostrar paletas de colores
interface ColorPaletteProps {
  variant: ColorVariant;
  className?: string;
  showLabels?: boolean;
}

export const ColorPalette: React.FC<ColorPaletteProps> = ({
  variant,
  className,
  showLabels = false,
}) => {
  const shades: ColorShade[] = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];

  return (
    <div className={cn('space-y-2', className)}>
      {showLabels && (
        <h3 className="text-sm font-medium text-gray-900 capitalize">
          {variant}
        </h3>
      )}
      <div className="flex rounded-md overflow-hidden">
        {shades.map((shade) => (
          <div
            key={shade}
            className={cn(
              'flex-1 h-12',
              `bg-${variant}-${shade}`
            )}
            title={`${variant}-${shade}`}
          />
        ))}
      </div>
      {showLabels && (
        <div className="flex text-xs text-gray-500">
          {shades.map((shade) => (
            <div key={shade} className="flex-1 text-center">
              {shade}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Componente StatusIndicator para estados
interface StatusIndicatorProps {
  status: 'active' | 'inactive' | 'pending' | 'success' | 'warning' | 'error' | 'neutral';
  className?: string;
  children?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  className,
  children,
  size = 'md',
}) => {
  const statusConfig = {
    active: { variant: 'success' as ColorVariant, label: 'Activo' },
    inactive: { variant: 'gray' as ColorVariant, label: 'Inactivo' },
    pending: { variant: 'warning' as ColorVariant, label: 'Pendiente' },
    success: { variant: 'success' as ColorVariant, label: 'Éxito' },
    warning: { variant: 'warning' as ColorVariant, label: 'Advertencia' },
    error: { variant: 'error' as ColorVariant, label: 'Error' },
    neutral: { variant: 'gray' as ColorVariant, label: 'Neutral' },
  }[status];

  // Validación de seguridad para evitar errores si el status no está definido
  if (!statusConfig) {
    console.warn(`StatusIndicator: status "${status}" no está definido`);
    return null;
  }

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <ColorDot 
        variant={statusConfig.variant} 
        size={size}
        pulse={status === 'pending'}
      />
      {children || (
        <span className="text-sm text-gray-700">
          {statusConfig.label}
        </span>
      )}
    </div>
  );
};

// Hook para obtener clases de color
export const useColorClasses = (variant: ColorVariant, intensity: ColorIntensity = 'main') => {
  return colorVariantMap[variant][intensity];
};

// Función utilitaria para obtener color de texto contrastante
export const getContrastTextColor = (variant: ColorVariant, intensity: ColorIntensity): string => {
  if (intensity === 'light') {
    return `text-${variant}-800`;
  }
  return 'text-white';
};

// Función utilitaria para obtener color de fondo
export const getBackgroundColor = (variant: ColorVariant, intensity: ColorIntensity): string => {
  const shadeMap = {
    light: '100',
    main: '500',
    dark: '700',
  };
  
  return `bg-${variant}-${shadeMap[intensity]}`;
};

// Exportar todos los componentes
export const ColorComponents = {
  ColorBox,
  ColorBadge,
  ColorAlert,
  ColorProgress,
  ColorDot,
  ColorPalette,
  StatusIndicator,
  useColorClasses,
  getContrastTextColor,
  getBackgroundColor,
};

export default ColorBox;