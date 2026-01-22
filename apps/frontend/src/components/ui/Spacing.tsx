import React from 'react';
import { cn } from '@/lib/utils';

// Tipos para espaciado
type SpacingSize = 
  | 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl'
  | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16 | 20 | 24;

type SpacingDirection = 'all' | 'x' | 'y' | 'top' | 'right' | 'bottom' | 'left';

// Mapeo de tamaños a clases CSS
const spacingSizeMap: Record<SpacingSize, string> = {
  none: '0',
  xs: '1',
  sm: '2',
  md: '4',
  lg: '6',
  xl: '8',
  '2xl': '10',
  '3xl': '12',
  '4xl': '16',
  0: '0',
  1: '1',
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  8: '8',
  10: '10',
  12: '12',
  16: '16',
  20: '20',
  24: '24',
};

// Función para generar clases de espaciado
const getSpacingClass = (
  type: 'p' | 'm',
  direction: SpacingDirection,
  size: SpacingSize
): string => {
  const sizeValue = spacingSizeMap[size];
  
  switch (direction) {
    case 'all':
      return `${type}-${sizeValue}`;
    case 'x':
      return `${type}x-${sizeValue}`;
    case 'y':
      return `${type}y-${sizeValue}`;
    case 'top':
      return `${type}t-${sizeValue}`;
    case 'right':
      return `${type}r-${sizeValue}`;
    case 'bottom':
      return `${type}b-${sizeValue}`;
    case 'left':
      return `${type}l-${sizeValue}`;
    default:
      return `${type}-${sizeValue}`;
  }
};

// Componente Box para espaciado general
interface BoxProps {
  children: React.ReactNode;
  className?: string;
  component?: keyof React.JSX.IntrinsicElements;
  
  // Padding
  p?: SpacingSize;
  px?: SpacingSize;
  py?: SpacingSize;
  pt?: SpacingSize;
  pr?: SpacingSize;
  pb?: SpacingSize;
  pl?: SpacingSize;
  
  // Margin
  m?: SpacingSize;
  mx?: SpacingSize;
  my?: SpacingSize;
  mt?: SpacingSize;
  mr?: SpacingSize;
  mb?: SpacingSize;
  ml?: SpacingSize;
}

export const Box: React.FC<BoxProps> = ({
  children,
  className,
  component: Component = 'div',
  p, px, py, pt, pr, pb, pl,
  m, mx, my, mt, mr, mb, ml,
  ...props
}) => {
  const classes = cn(
    // Padding classes
    p !== undefined && getSpacingClass('p', 'all', p),
    px !== undefined && getSpacingClass('p', 'x', px),
    py !== undefined && getSpacingClass('p', 'y', py),
    pt !== undefined && getSpacingClass('p', 'top', pt),
    pr !== undefined && getSpacingClass('p', 'right', pr),
    pb !== undefined && getSpacingClass('p', 'bottom', pb),
    pl !== undefined && getSpacingClass('p', 'left', pl),
    
    // Margin classes
    m !== undefined && getSpacingClass('m', 'all', m),
    mx !== undefined && getSpacingClass('m', 'x', mx),
    my !== undefined && getSpacingClass('m', 'y', my),
    mt !== undefined && getSpacingClass('m', 'top', mt),
    mr !== undefined && getSpacingClass('m', 'right', mr),
    mb !== undefined && getSpacingClass('m', 'bottom', mb),
    ml !== undefined && getSpacingClass('m', 'left', ml),
    
    className
  );

  return (
    <Component className={classes} {...props}>
      {children}
    </Component>
  );
};

// Componente Stack para espaciado vertical
interface StackProps {
  children: React.ReactNode;
  className?: string;
  spacing?: SpacingSize;
  align?: 'start' | 'center' | 'end' | 'stretch';
  divider?: React.ReactNode;
}

export const Stack: React.FC<StackProps> = ({
  children,
  className,
  spacing = 'md',
  align = 'stretch',
  divider,
}) => {
  const spacingClass = `space-y-${spacingSizeMap[spacing]}`;
  
  const alignClass = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
  }[align];

  const classes = cn(
    'flex flex-col',
    spacingClass,
    alignClass,
    className
  );

  const childrenArray = React.Children.toArray(children);

  return (
    <div className={classes}>
      {childrenArray.map((child, index) => (
        <React.Fragment key={index}>
          {child}
          {divider && index < childrenArray.length - 1 && (
            <div className="flex justify-center">
              {divider}
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

// Componente HStack para espaciado horizontal
interface HStackProps {
  children: React.ReactNode;
  className?: string;
  spacing?: SpacingSize;
  align?: 'start' | 'center' | 'end' | 'baseline' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  wrap?: boolean;
  divider?: React.ReactNode;
}

export const HStack: React.FC<HStackProps> = ({
  children,
  className,
  spacing = 'md',
  align = 'center',
  justify = 'start',
  wrap = false,
  divider,
}) => {
  const spacingClass = `space-x-${spacingSizeMap[spacing]}`;
  
  const alignClass = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    baseline: 'items-baseline',
    stretch: 'items-stretch',
  }[align];

  const justifyClass = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around',
    evenly: 'justify-evenly',
  }[justify];

  const classes = cn(
    'flex',
    spacingClass,
    alignClass,
    justifyClass,
    {
      'flex-wrap': wrap,
    },
    className
  );

  const childrenArray = React.Children.toArray(children);

  return (
    <div className={classes}>
      {childrenArray.map((child, index) => (
        <React.Fragment key={index}>
          {child}
          {divider && index < childrenArray.length - 1 && (
            <div className="flex items-center">
              {divider}
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

// Componente Grid para layouts de cuadrícula
interface GridProps {
  children: React.ReactNode;
  className?: string;
  cols?: 1 | 2 | 3 | 4 | 5 | 6 | 12;
  gap?: SpacingSize;
  rowGap?: SpacingSize;
  colGap?: SpacingSize;
  responsive?: {
    sm?: 1 | 2 | 3 | 4 | 5 | 6 | 12;
    md?: 1 | 2 | 3 | 4 | 5 | 6 | 12;
    lg?: 1 | 2 | 3 | 4 | 5 | 6 | 12;
    xl?: 1 | 2 | 3 | 4 | 5 | 6 | 12;
  };
}

export const Grid: React.FC<GridProps> = ({
  children,
  className,
  cols = 1,
  gap,
  rowGap,
  colGap,
  responsive,
}) => {
  const gapClass = gap ? `gap-${spacingSizeMap[gap]}` : '';
  const rowGapClass = rowGap ? `gap-y-${spacingSizeMap[rowGap]}` : '';
  const colGapClass = colGap ? `gap-x-${spacingSizeMap[colGap]}` : '';
  
  const colsClass = `grid-cols-${cols}`;
  
  const responsiveClasses = responsive ? [
    responsive.sm && `sm:grid-cols-${responsive.sm}`,
    responsive.md && `md:grid-cols-${responsive.md}`,
    responsive.lg && `lg:grid-cols-${responsive.lg}`,
    responsive.xl && `xl:grid-cols-${responsive.xl}`,
  ].filter(Boolean) : [];

  const classes = cn(
    'grid',
    colsClass,
    gapClass,
    rowGapClass,
    colGapClass,
    ...responsiveClasses,
    className
  );

  return (
    <div className={classes}>
      {children}
    </div>
  );
};

// Componente Spacer para espacios flexibles
interface SpacerProps {
  size?: SpacingSize;
  direction?: 'horizontal' | 'vertical';
  className?: string;
}

export const Spacer: React.FC<SpacerProps> = ({
  size,
  direction = 'vertical',
  className,
}) => {
  if (size) {
    const sizeClass = direction === 'vertical' 
      ? `h-${spacingSizeMap[size]}` 
      : `w-${spacingSizeMap[size]}`;
    
    return <div className={cn(sizeClass, className)} />;
  }

  // Spacer flexible
  const flexClass = direction === 'vertical' ? 'flex-1' : 'flex-1';
  return <div className={cn(flexClass, className)} />;
};

// Componente Divider para separadores
interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  variant?: 'solid' | 'dashed' | 'dotted';
  spacing?: SpacingSize;
}

export const Divider: React.FC<DividerProps> = ({
  orientation = 'horizontal',
  className,
  variant = 'solid',
  spacing = 'md',
}) => {
  const spacingValue = spacingSizeMap[spacing];
  
  const baseClasses = 'border-gray-200';
  
  const orientationClasses = orientation === 'horizontal'
    ? `border-t my-${spacingValue} w-full`
    : `border-l mx-${spacingValue} h-full`;
    
  const variantClasses = {
    solid: '',
    dashed: 'border-dashed',
    dotted: 'border-dotted',
  }[variant];

  const classes = cn(
    baseClasses,
    orientationClasses,
    variantClasses,
    className
  );

  return <div className={classes} />;
};

// Componente Container para contenedores con padding consistente
interface ContainerProps {
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  padding?: SpacingSize;
  center?: boolean;
}

export const Container: React.FC<ContainerProps> = ({
  children,
  className,
  size = 'lg',
  padding = 'md',
  center = true,
}) => {
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    full: 'max-w-full',
  }[size];

  const paddingClass = `p-${spacingSizeMap[padding]}`;

  const classes = cn(
    'w-full',
    sizeClasses,
    paddingClass,
    {
      'mx-auto': center,
    },
    className
  );

  return (
    <div className={classes}>
      {children}
    </div>
  );
};

// Componente Section para secciones con espaciado consistente
interface SectionProps {
  children: React.ReactNode;
  className?: string;
  spacing?: 'sm' | 'md' | 'lg' | 'xl';
  background?: 'default' | 'muted' | 'accent';
}

export const Section: React.FC<SectionProps> = ({
  children,
  className,
  spacing = 'md',
  background = 'default',
}) => {
  const spacingClasses = {
    sm: 'py-8',
    md: 'py-12',
    lg: 'py-16',
    xl: 'py-24',
  }[spacing];

  const backgroundClasses = {
    default: '',
    muted: 'bg-gray-50',
    accent: 'bg-primary-50',
  }[background];

  const classes = cn(
    spacingClasses,
    backgroundClasses,
    className
  );

  return (
    <section className={classes}>
      {children}
    </section>
  );
};

// Exportar todos los componentes
export const SpacingComponents = {
  Box,
  Stack,
  HStack,
  Grid,
  Spacer,
  Divider,
  Container,
  Section,
};

export default Box;