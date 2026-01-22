import React from 'react';
import { cn } from '@/lib/utils';

// Tipos para las variantes de tipografía
type TypographyVariant = 
  | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  | 'body1' | 'body2' | 'caption' | 'overline'
  | 'subtitle1' | 'subtitle2';

type TypographyColor = 
  | 'primary' | 'secondary' | 'muted' | 'success' 
  | 'warning' | 'error' | 'info' | 'inherit';

type TypographyAlign = 'left' | 'center' | 'right' | 'justify';

interface TypographyProps {
  variant?: TypographyVariant;
  color?: TypographyColor;
  align?: TypographyAlign;
  className?: string;
  children: React.ReactNode;
  component?: keyof React.JSX.IntrinsicElements;
  gutterBottom?: boolean;
  noWrap?: boolean;
}

// Mapeo de variantes a elementos HTML por defecto
const variantMapping: Record<TypographyVariant, keyof React.JSX.IntrinsicElements> = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h5',
  h6: 'h6',
  subtitle1: 'h6',
  subtitle2: 'h6',
  body1: 'p',
  body2: 'p',
  caption: 'span',
  overline: 'span',
};

// Clases CSS para cada variante
const variantClasses: Record<TypographyVariant, string> = {
  h1: 'text-4xl font-bold leading-tight tracking-tight',
  h2: 'text-3xl font-bold leading-tight tracking-tight',
  h3: 'text-2xl font-semibold leading-snug',
  h4: 'text-xl font-semibold leading-snug',
  h5: 'text-lg font-medium leading-normal',
  h6: 'text-base font-medium leading-normal',
  subtitle1: 'text-base font-normal leading-relaxed',
  subtitle2: 'text-sm font-medium leading-normal',
  body1: 'text-base font-normal leading-relaxed',
  body2: 'text-sm font-normal leading-normal',
  caption: 'text-xs font-normal leading-tight',
  overline: 'text-xs font-medium leading-tight uppercase tracking-wide',
};

// Clases CSS para colores
const colorClasses: Record<TypographyColor, string> = {
  primary: 'text-primary',
  secondary: 'text-secondary',
  muted: 'text-muted',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-error',
  info: 'text-info',
  inherit: '',
};

// Clases CSS para alineación
const alignClasses: Record<TypographyAlign, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
  justify: 'text-justify',
};

export const Typography: React.FC<TypographyProps> = ({
  variant = 'body1',
  color = 'primary',
  align = 'left',
  className,
  children,
  component,
  gutterBottom = false,
  noWrap = false,
  ...props
}) => {
  const Component = component || variantMapping[variant];

  const classes = cn(
    variantClasses[variant],
    colorClasses[color],
    alignClasses[align],
    {
      'mb-4': gutterBottom,
      'truncate': noWrap,
    },
    className
  );

  return (
    <Component className={classes} {...props}>
      {children}
    </Component>
  );
};

// Componentes específicos para cada variante
export const Heading1: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="h1" {...props} />
);

export const Heading2: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="h2" {...props} />
);

export const Heading3: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="h3" {...props} />
);

export const Heading4: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="h4" {...props} />
);

export const Heading5: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="h5" {...props} />
);

export const Heading6: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="h6" {...props} />
);

export const Subtitle1: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="subtitle1" {...props} />
);

export const Subtitle2: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="subtitle2" {...props} />
);

export const Body1: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="body1" {...props} />
);

export const Body2: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="body2" {...props} />
);

export const Caption: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="caption" {...props} />
);

export const Overline: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="overline" {...props} />
);

// Componente para texto con énfasis
interface EmphasisTextProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'strong' | 'em' | 'mark' | 'code';
}

export const EmphasisText: React.FC<EmphasisTextProps> = ({
  children,
  className,
  variant = 'strong',
}) => {
  const Component = variant === 'strong' ? 'strong' : 
                   variant === 'em' ? 'em' :
                   variant === 'mark' ? 'mark' : 'code';

  const classes = cn(
    {
      'font-semibold': variant === 'strong',
      'italic': variant === 'em',
      'bg-yellow-100 px-1 rounded': variant === 'mark',
      'bg-gray-100 px-1 py-0.5 rounded text-sm font-mono': variant === 'code',
    },
    className
  );

  return <Component className={classes}>{children}</Component>;
};

// Componente para listas
interface ListProps {
  children: React.ReactNode;
  className?: string;
  ordered?: boolean;
  dense?: boolean;
}

export const List: React.FC<ListProps> = ({
  children,
  className,
  ordered = false,
  dense = false,
}) => {
  const Component = ordered ? 'ol' : 'ul';
  
  const classes = cn(
    'list-inside',
    {
      'list-decimal': ordered,
      'list-disc': !ordered,
      'space-y-1': !dense,
      'space-y-0.5': dense,
    },
    className
  );

  return <Component className={classes}>{children}</Component>;
};

interface ListItemProps {
  children: React.ReactNode;
  className?: string;
}

export const ListItem: React.FC<ListItemProps> = ({ children, className }) => (
  <li className={cn('text-base leading-relaxed', className)}>
    {children}
  </li>
);

// Componente para enlaces
interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  children: React.ReactNode;
  variant?: 'default' | 'button' | 'subtle';
  color?: TypographyColor;
  underline?: 'none' | 'hover' | 'always';
}

export const Link: React.FC<LinkProps> = ({
  children,
  className,
  variant = 'default',
  color = 'primary',
  underline = 'hover',
  ...props
}) => {
  const classes = cn(
    'transition-colors cursor-pointer',
    colorClasses[color],
    {
      'hover:underline': underline === 'hover',
      'underline': underline === 'always',
      'no-underline': underline === 'none',
      'inline-flex items-center px-3 py-2 rounded-md bg-primary-50 hover:bg-primary-100': variant === 'button',
      'text-muted hover:text-primary': variant === 'subtle',
    },
    className
  );

  return (
    <a className={classes} {...props}>
      {children}
    </a>
  );
};

// Componente para texto con truncado inteligente
interface TruncatedTextProps {
  children: string;
  maxLength?: number;
  className?: string;
  showTooltip?: boolean;
}

export const TruncatedText: React.FC<TruncatedTextProps> = ({
  children,
  maxLength = 50,
  className,
  showTooltip = true,
}) => {
  const shouldTruncate = children.length > maxLength;
  const truncatedText = shouldTruncate 
    ? `${children.substring(0, maxLength)}...` 
    : children;

  if (shouldTruncate && showTooltip) {
    return (
      <span 
        className={cn('cursor-help', className)}
        title={children}
      >
        {truncatedText}
      </span>
    );
  }

  return <span className={className}>{truncatedText}</span>;
};

// Componente para texto con resaltado de búsqueda
interface HighlightedTextProps {
  text: string;
  highlight: string;
  className?: string;
}

export const HighlightedText: React.FC<HighlightedTextProps> = ({
  text,
  highlight,
  className,
}) => {
  if (!highlight.trim()) {
    return <span className={className}>{text}</span>;
  }

  const regex = new RegExp(`(${highlight})`, 'gi');
  const parts = text.split(regex);

  return (
    <span className={className}>
      {parts.map((part, index) =>
        regex.test(part) ? (
          <mark key={index} className="bg-yellow-200 px-0.5 rounded">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
};

// Componente para mostrar código
interface CodeBlockProps {
  children: string;
  language?: string;
  className?: string;
  inline?: boolean;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  children,
  language,
  className,
  inline = false,
}) => {
  if (inline) {
    return (
      <code className={cn(
        'bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono',
        className
      )}>
        {children}
      </code>
    );
  }

  return (
    <pre className={cn(
      'bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm',
      className
    )}>
      <code className="font-mono">
        {children}
      </code>
    </pre>
  );
};

// Exportar todo como un objeto para facilitar el uso
export const TypographyComponents = {
  Typography,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  Subtitle1,
  Subtitle2,
  Body1,
  Body2,
  Caption,
  Overline,
  EmphasisText,
  List,
  ListItem,
  Link,
  TruncatedText,
  HighlightedText,
  CodeBlock,
};

export default Typography;