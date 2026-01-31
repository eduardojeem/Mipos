import React, { useState, useCallback } from 'react';
import Image from 'next/image';
import { Package, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LazyImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackIcon?: React.ReactNode;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * Componente de imagen con lazy loading y fallback
 */
export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className,
  fallbackIcon,
  onLoad,
  onError
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const handleLoad = useCallback(() => {
    setLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setError(true);
    onError?.();
  }, [onError]);

  // Si no hay src, mostrar fallback directamente
  if (!src) {
    return (
      <div className={cn(
        "bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center",
        className
      )}>
        {fallbackIcon || <Package className="h-8 w-8 text-slate-400" />}
      </div>
    );
  }

  const safeSrc = (src || '').trim().replace(/\)+\s*$/, '');

  return (
    <div className={cn("relative overflow-hidden rounded-lg", className)}>
      {/* Loading skeleton */}
      {!loaded && !error && (
        <div className="absolute inset-0 bg-slate-200 dark:bg-slate-700 animate-pulse" />
      )}

      {/* Error fallback */}
      {error && (
        <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          {fallbackIcon || <ImageIcon className="h-8 w-8 text-slate-400" />}
        </div>
      )}

      {/* Actual image */}
      {!error && (
        <Image
          src={safeSrc}
          alt={alt}
          fill
          sizes="100%"
          onLoad={handleLoad}
          onError={handleError as any}
          className={cn(
            "object-cover transition-opacity duration-300",
            loaded ? "opacity-100" : "opacity-0"
          )}
          unoptimized
        />
      )}
    </div>
  );
};

/**
 * Componente de avatar con lazy loading
 */
export interface LazyAvatarProps {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const LazyAvatar: React.FC<LazyAvatarProps> = ({
  src,
  name,
  size = 'md',
  className
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-base',
    xl: 'w-20 h-20 text-lg'
  };

  const initials = name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className={cn(
      "relative rounded-full overflow-hidden bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white font-semibold",
      sizeClasses[size],
      className
    )}>
      {src ? (
        <LazyImage
          src={src}
          alt={name}
          className="w-full h-full"
          fallbackIcon={<span>{initials}</span>}
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
};
