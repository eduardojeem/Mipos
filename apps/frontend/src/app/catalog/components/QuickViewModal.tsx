'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { useTenantPublicRouting } from '@/hooks/useTenantPublicRouting';
import {
  X,
  Heart,
  ShoppingCart,
  Plus,
  Minus,
  Star,
  Share2,
  Check,
  Sparkles,
  ExternalLink,
  Package,
  Tag,
} from 'lucide-react';
import { formatDate, formatPrice } from '@/utils/formatters';
import { getProductPricing } from '@/lib/public-site/product-pricing';
import type { Product } from '@/types';
import type { BusinessConfig } from '@/types/business-config';

const MAX_MODAL_QUANTITY = 10;

interface QuickViewModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number) => void;
  onToggleFavorite: (productId: string) => void;
  isFavorite: boolean;
  config: BusinessConfig;
  allowAddToCart?: boolean;
  categoryName?: string | null;
}

function getProductImageList(product: Product): string[] {
  return [
    ...(product.image_url ? [product.image_url] : []),
    ...((product.images || [])
      .map((image) => (typeof image === 'string' ? image : image?.url || ''))
      .filter(Boolean)),
  ].filter((value, index, list) => list.indexOf(value) === index);
}

export default function QuickViewModal({
  product,
  isOpen,
  onClose,
  onAddToCart,
  onToggleFavorite,
  isFavorite,
  config,
  allowAddToCart = true,
  categoryName,
}: QuickViewModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [addedToCart, setAddedToCart] = useState(false);
  const addedToCartTimeoutRef = useRef<number | null>(null);
  const { toast } = useToast();
  const { tenantHref } = useTenantPublicRouting();

  useEffect(() => {
    setQuantity(1);
    setSelectedImage(0);
    setAddedToCart(false);
  }, [isOpen, product?.id]);

  useEffect(() => {
    return () => {
      if (addedToCartTimeoutRef.current !== null) {
        window.clearTimeout(addedToCartTimeoutRef.current);
      }
    };
  }, []);

  const pricing = useMemo(() => (product ? getProductPricing(product) : null), [product]);
  const images = useMemo(() => (product ? getProductImageList(product) : []), [product]);
  const resolvedCategoryName =
    categoryName ||
    (product && typeof product.category === 'object' ? product.category?.name : undefined) ||
    (product ? ((product as Product & { categoryName?: string }).categoryName || undefined) : undefined);
  const isOutOfStock = Number(product?.stock_quantity ?? 0) <= 0;
  const hasDiscount = Boolean(pricing?.hasDiscount);
  const maxSelectableQuantity = Math.max(
    0,
    Math.min(Number(product?.stock_quantity ?? 0), MAX_MODAL_QUANTITY)
  );
  const productHref = product ? tenantHref(`/catalog/${product.id}`) : tenantHref('/catalog');
  const selectedImageSrc = images[selectedImage] || null;
  const stockLabel = isOutOfStock
    ? 'Agotado'
    : maxSelectableQuantity <= 5
      ? `Quedan ${maxSelectableQuantity} unidades`
      : `${Number(product?.stock_quantity ?? 0)} disponibles`;

  const handleAddToCart = useCallback(() => {
    if (!product || isOutOfStock || quantity <= 0) {
      return;
    }

    onAddToCart(product, quantity);
    setAddedToCart(true);

    if (addedToCartTimeoutRef.current !== null) {
      window.clearTimeout(addedToCartTimeoutRef.current);
    }

    addedToCartTimeoutRef.current = window.setTimeout(() => {
      setAddedToCart(false);
      addedToCartTimeoutRef.current = null;
    }, 1800);
  }, [isOutOfStock, onAddToCart, product, quantity]);

  const handleQuantityChange = useCallback((delta: number) => {
    if (maxSelectableQuantity <= 0) {
      return;
    }

    setQuantity((previous) => Math.max(1, Math.min(previous + delta, maxSelectableQuantity)));
  }, [maxSelectableQuantity]);

  const handleShare = useCallback(async () => {
    if (!product || typeof window === 'undefined') {
      return;
    }

    const shareUrl = new URL(productHref, window.location.origin).toString();
    const sharePayload = {
      title: product.name,
      text: product.description || product.name,
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(sharePayload);
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        toast({
          title: 'Link copiado',
          description: 'El enlace del producto ya esta listo para compartir.',
        });
        return;
      }

      window.open(shareUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') {
        return;
      }

      toast({
        title: 'No se pudo compartir',
        description: 'Intenta nuevamente en unos segundos.',
        variant: 'destructive',
      });
    }
  }, [product, productHref, toast]);

  if (!product || !pricing) {
    return null;
  }

  const metaItems = [
    resolvedCategoryName ? { label: 'Categoria', value: resolvedCategoryName, icon: Tag } : null,
    product.brand ? { label: 'Marca', value: product.brand, icon: Sparkles } : null,
    product.sku ? { label: 'SKU', value: product.sku, icon: Package } : null,
  ].filter(Boolean) as Array<{ label: string; value: string; icon: typeof Tag }>;

  const highlights = [
    {
      label: 'Precio final',
      value: formatPrice(pricing.displayPrice, config),
      detail: hasDiscount && pricing.compareAtPrice
        ? `Antes ${formatPrice(pricing.compareAtPrice, config)}`
        : 'Sin descuento adicional',
    },
    {
      label: 'Stock',
      value: isOutOfStock ? 'No disponible' : 'Disponible',
      detail: stockLabel,
    },
    {
      label: 'Actualizado',
      value: product.updated_at ? formatDate(product.updated_at, config) : 'Reciente',
      detail: hasDiscount
        ? `Ahorro de ${formatPrice(pricing.savings, config)}`
        : 'Precio vigente',
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent className="max-w-5xl overflow-hidden border-0 bg-background p-0 sm:max-h-[92vh]">
        <DialogTitle className="sr-only">{product.name}</DialogTitle>
        <DialogDescription className="sr-only">
          Detalle rapido del producto, galeria, precio y acciones principales.
        </DialogDescription>

        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4 z-20 rounded-full bg-background/85 backdrop-blur-sm"
          onClick={onClose}
          aria-label="Cerrar detalle"
        >
          <X className="h-4 w-4" />
        </Button>

        <div className="grid max-h-[88vh] overflow-y-auto md:grid-cols-[1.02fr_0.98fr]">
          <section className="relative border-b border-slate-200 bg-gradient-to-br from-slate-100 via-white to-slate-100 p-5 dark:border-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 md:border-b-0 md:border-r md:p-6">
            <Link
              href={productHref}
              className="relative block aspect-square overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-slate-900"
            >
              {selectedImageSrc ? (
                <Image
                  src={selectedImageSrc}
                  alt={product.name}
                  fill
                  className="object-contain p-5"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
                  <Sparkles className="h-14 w-14 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">Sin imagen disponible</p>
                </div>
              )}

              <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                {hasDiscount ? (
                  <Badge className="border border-emerald-200 bg-white/95 px-3 py-1 text-sm font-medium text-emerald-700 dark:border-emerald-900/40 dark:bg-slate-950/90 dark:text-emerald-300">
                    Promo -{pricing.discountPercent}%
                  </Badge>
                ) : null}
                {isOutOfStock ? (
                  <Badge variant="secondary" className="px-3 py-1 text-sm">
                    Agotado
                  </Badge>
                ) : maxSelectableQuantity > 0 && maxSelectableQuantity <= 5 ? (
                  <Badge variant="secondary" className="px-3 py-1 text-sm">
                    Ultimas {maxSelectableQuantity}
                  </Badge>
                ) : null}
              </div>

              {images.length > 1 ? (
                <div className="absolute bottom-4 left-4 rounded-full bg-slate-950/70 px-3 py-1 text-xs font-medium text-white">
                  {selectedImage + 1} / {images.length}
                </div>
              ) : null}
            </Link>

            {images.length > 1 ? (
              <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-5">
                {images.map((imageUrl, index) => (
                  <button
                    key={`${imageUrl}-${index}`}
                    type="button"
                    onClick={() => setSelectedImage(index)}
                    className={`relative aspect-square overflow-hidden rounded-2xl border transition ${
                      selectedImage === index
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
                    }`}
                    aria-label={`Ver imagen ${index + 1}`}
                  >
                    <Image
                      src={imageUrl}
                      alt={`${product.name} ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                  </button>
                ))}
              </div>
            ) : null}
          </section>

          <section className="flex flex-col p-5 md:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-3">
                {metaItems.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {metaItems.map(({ label, value, icon: Icon }) => (
                      <Badge
                        key={`${label}-${value}`}
                        variant="outline"
                        className="gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium"
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span>{label}: {value}</span>
                      </Badge>
                    ))}
                  </div>
                ) : null}

                <div>
                  <Link href={productHref} className="block">
                    <h2 className="text-2xl font-bold tracking-tight text-foreground transition-colors hover:text-rose-600 md:text-3xl">
                      {product.name}
                    </h2>
                  </Link>
                  {product.rating ? (
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, index) => (
                          <Star
                            key={index}
                            className={`h-4 w-4 ${
                              index < Math.floor(product.rating || 0)
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-300 dark:text-slate-700'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm font-medium text-muted-foreground">
                        {product.rating.toFixed(1)} / 5
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 rounded-full"
                  onClick={() => onToggleFavorite(product.id)}
                  aria-label={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                >
                  <Heart className={`h-5 w-5 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 rounded-full"
                  onClick={handleShare}
                  aria-label="Compartir producto"
                >
                  <Share2 className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {product.description ? (
              <p className="mt-5 text-sm leading-7 text-muted-foreground md:text-[15px]">
                {product.description}
              </p>
            ) : (
              <p className="mt-5 text-sm leading-7 text-muted-foreground">
                Este producto no tiene una descripcion publica cargada todavia.
              </p>
            )}

            <div className="mt-6 rounded-[28px] border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/70">
              <div className="flex flex-wrap items-end gap-3">
                <span className="text-3xl font-black tracking-tight text-foreground md:text-4xl">
                  {formatPrice(pricing.displayPrice, config)}
                </span>
                {pricing.compareAtPrice ? (
                  <span className="text-base text-muted-foreground line-through">
                    {formatPrice(pricing.compareAtPrice, config)}
                  </span>
                ) : null}
                {hasDiscount ? (
                  <Badge variant="outline" className="border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                    Ahorro {formatPrice(pricing.savings, config)}
                  </Badge>
                ) : null}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Precio unitario vigente para el catalogo publico.
              </p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {highlights.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/60"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-foreground">{item.value}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.detail}</p>
                </div>
              ))}
            </div>

            <Separator className="my-6" />

            {allowAddToCart ? (
              <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Cantidad</p>
                    <p className="text-xs text-muted-foreground">
                      Maximo {Math.min(MAX_MODAL_QUANTITY, Math.max(Number(product.stock_quantity ?? 0), 0)) || 0} unidades desde este modal.
                    </p>
                  </div>

                  <div className="flex items-center rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 rounded-none"
                      onClick={() => handleQuantityChange(-1)}
                      disabled={quantity <= 1 || isOutOfStock}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-14 text-center text-base font-semibold">{quantity}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 rounded-none"
                      onClick={() => handleQuantityChange(1)}
                      disabled={isOutOfStock || quantity >= maxSelectableQuantity}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-sm dark:border-slate-800">
                  <span className="text-muted-foreground">Subtotal: </span>
                  <strong>{formatPrice(pricing.displayPrice * quantity, config)}</strong>
                </div>
              </div>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              {allowAddToCart ? (
                <Button
                  size="lg"
                  className={`h-14 flex-1 rounded-2xl text-base font-semibold transition-all ${
                    addedToCart
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 text-white hover:bg-rose-700'
                  }`}
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                >
                  {addedToCart ? (
                    <>
                      <Check className="mr-2 h-5 w-5" />
                      Agregado
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="mr-2 h-5 w-5" />
                      {isOutOfStock ? 'Sin stock' : 'Agregar al carrito'}
                    </>
                  )}
                </Button>
              ) : null}

              <Button asChild variant="outline" size="lg" className="h-14 rounded-2xl px-5">
                <Link href={productHref}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Ver producto
                </Link>
              </Button>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
