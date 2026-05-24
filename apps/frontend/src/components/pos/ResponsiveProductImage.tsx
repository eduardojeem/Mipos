'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ProductImagePlaceholder } from '@/components/products/ProductImagePlaceholder';
import { cn } from '@/lib/utils';

interface ResponsiveProductImageProps {
  src: string | null | undefined;
  alt: string;
  priority?: boolean;
  className?: string;
  index?: number;
}

export function ResponsiveProductImage({
  src,
  alt,
  priority = false,
  className,
  index = 0,
}: ResponsiveProductImageProps) {
  const [hasError, setHasError] = useState(false);
  const imageSrc = src?.trim();
  const shouldPrioritize = priority || index < 6;

  if (!imageSrc || hasError) {
    return (
      <div className={cn('relative aspect-square overflow-hidden rounded-lg bg-muted', className)}>
        <ProductImagePlaceholder productName={alt} className="rounded-lg" />
      </div>
    );
  }

  return (
    <div className={cn('relative aspect-square overflow-hidden rounded-lg bg-muted', className)}>
      <Image
        src={imageSrc}
        alt={alt}
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
        priority={shouldPrioritize}
        className="object-cover transition-transform hover:scale-105"
        placeholder="blur"
        blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
        onError={() => setHasError(true)}
      />
    </div>
  );
}
