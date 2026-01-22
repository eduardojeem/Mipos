'use client';

import { useState, useRef, useEffect } from 'react';
import { Package } from 'lucide-react';

interface LazyImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackIcon?: React.ReactNode;
  onLoad?: () => void;
  onError?: () => void;
  loading?: 'lazy' | 'eager';
  decoding?: 'async' | 'sync' | 'auto';
  sizes?: string;
}

export default function LazyImage({
  src,
  alt,
  className = '',
  fallbackIcon,
  onLoad,
  onError,
  loading = 'lazy',
  decoding = 'async',
  sizes
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px'
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  return (
    <div 
      ref={containerRef}
      className={`relative bg-gradient-to-br from-gray-50 to-gray-100 ${className}`}
    >
      {isInView && src && !hasError ? (
        <>
          <img
            ref={imgRef}
            src={src}
            alt={alt}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={handleLoad}
            onError={handleError}
            loading={loading}
            decoding={decoding}
            sizes={sizes}
          />
          {!isLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-pulse">
                <Package className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          {fallbackIcon || <Package className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />}
        </div>
      )}
    </div>
  );
}