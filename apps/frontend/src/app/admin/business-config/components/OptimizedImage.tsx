'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ImageIcon, Loader2 } from 'lucide-react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  aspectRatio?: number;
  lazy?: boolean;
  placeholder?: string;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * Componente de imagen optimizada con:
 * - Lazy loading
 * - Placeholder mientras carga
 * - Manejo de errores
 * - Aspect ratio fijo
 */
export function OptimizedImage({
  src,
  alt,
  className,
  aspectRatio = 16/9,
  lazy = true,
  placeholder,
  onLoad,
  onError
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(!lazy);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer para lazy loading
  useEffect(() => {
    if (!lazy || isInView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [lazy, isInView]);

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
    onLoad?.();
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  };

  const paddingTop = `${(1 / aspectRatio) * 100}%`;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden bg-slate-100 dark:bg-slate-800",
        className
      )}
      style={{ paddingTop }}
    >
      {/* Loading State */}
      {isLoading && isInView && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      )}

      {/* Error State */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400">
          <ImageIcon className="h-8 w-8" />
          <span className="text-xs">Error al cargar</span>
        </div>
      )}

      {/* Placeholder */}
      {!isInView && placeholder && (
        <div 
          className="absolute inset-0 bg-cover bg-center filter blur-sm"
          style={{ backgroundImage: `url(${placeholder})` }}
        />
      )}

      {/* Main Image */}
      {isInView && src && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          className={cn(
            "absolute inset-0 w-full h-full object-cover transition-opacity duration-300",
            isLoading ? "opacity-0" : "opacity-100"
          )}
          onLoad={handleLoad}
          onError={handleError}
          loading={lazy ? "lazy" : "eager"}
        />
      )}
    </div>
  );
}