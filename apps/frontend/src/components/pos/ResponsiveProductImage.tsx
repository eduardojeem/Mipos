import Image from 'next/image';
import { cn } from '@/lib/utils';

interface ResponsiveProductImageProps {
  src: string | null | undefined;
  alt: string;
  priority?: boolean;
  className?: string;
  /**
   * Índice del producto en la lista
   * Los primeros 6 productos se cargan con priority
   */
  index?: number;
}

/**
 * ResponsiveProductImage - Imagen optimizada para productos
 * 
 * Características:
 * - Carga lazy automática
 * - Srcset para diferentes densidades de pantalla
 * - Placeholder blur mientras carga
 * - Optimización automática de Next.js
 * - Fallback para imágenes faltantes
 */
export function ResponsiveProductImage({
  src,
  alt,
  priority = false,
  className,
  index = 0,
}: ResponsiveProductImageProps) {
  // Placeholder para productos sin imagen
  const placeholderSrc = '/images/product-placeholder.png';
  const imageSrc = src || placeholderSrc;

  // Los primeros 6 productos se cargan con priority (above the fold)
  const shouldPrioritize = priority || index < 6;

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
        onError={(e) => {
          // Fallback si la imagen falla
          const target = e.target as HTMLImageElement;
          target.src = placeholderSrc;
        }}
      />
    </div>
  );
}
