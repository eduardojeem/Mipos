'use client';

import { ImageOff, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductImagePlaceholderProps {
  productName?: string | null;
  className?: string;
  iconClassName?: string;
  showLabel?: boolean;
  compact?: boolean;
}

function getInitials(name?: string | null) {
  const words = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return null;

  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}

export function ProductImagePlaceholder({
  productName,
  className,
  iconClassName,
  showLabel = true,
  compact = false,
}: ProductImagePlaceholderProps) {
  const initials = getInitials(productName);

  return (
    <div
      className={cn(
        'relative flex h-full w-full overflow-hidden rounded-md border border-dashed border-border/70 bg-muted/40',
        'items-center justify-center text-muted-foreground',
        className
      )}
      aria-label="Producto sin imagen"
    >
      <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0,transparent_46%,hsl(var(--border)/0.45)_46%,hsl(var(--border)/0.45)_54%,transparent_54%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(var(--background)/0.7),transparent_58%)]" />

      <div className="relative z-10 flex flex-col items-center justify-center gap-2 px-4 text-center">
        <div
          className={cn(
            'flex items-center justify-center rounded-md border bg-background/85 shadow-sm',
            compact ? 'h-11 w-11' : 'h-16 w-16'
          )}
        >
          {initials ? (
            <span className={cn('font-semibold tracking-wide text-muted-foreground', compact ? 'text-sm' : 'text-lg')}>
              {initials}
            </span>
          ) : (
            <Package className={cn(compact ? 'h-5 w-5' : 'h-7 w-7', iconClassName)} />
          )}
        </div>

        {showLabel ? (
          <div className="space-y-0.5">
            <div className={cn('font-medium text-foreground/80', compact ? 'text-xs' : 'text-sm')}>
              Sin imagen
            </div>
            {!compact ? (
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <ImageOff className="h-3 w-3" />
                <span>Vista no disponible</span>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
