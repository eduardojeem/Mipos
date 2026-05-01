'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { useTenantPublicRouting } from '@/hooks/useTenantPublicRouting';
import { formatDate, formatPrice } from '@/utils/formatters';
import { formatTimeRemaining, validatePromotion } from '@/lib/offers';
import type { BusinessConfig } from '@/types/business-config';
import type { OfferItem } from '../offers-types';
import {
  Check,
  Clock,
  ExternalLink,
  HeartHandshake,
  Minus,
  Package,
  Plus,
  Share2,
  ShoppingCart,
  Sparkles,
  Tag,
  X,
} from 'lucide-react';

const MAX_MODAL_QUANTITY = 10;

interface OfferQuickViewModalProps {
  item: OfferItem | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart?: (item: OfferItem, quantity: number) => void;
  config: BusinessConfig;
  allowAddToCart?: boolean;
  allowViewProduct?: boolean;
}

function getOfferImages(item: OfferItem): string[] {
  return [
    ...(item.product.image ? [item.product.image] : []),
    ...((item.product.images || [])
      .map((image) => (typeof image === 'string' ? image : image?.url || ''))
      .filter(Boolean)),
  ].filter((value, index, list) => list.indexOf(value) === index);
}

function getPromotionStatus(validation: ReturnType<typeof validatePromotion>) {
  if (validation.isActive) {
    return {
      label: 'Activa',
      tone: 'bg-emerald-600 text-white',
      detail:
        validation.hoursRemaining !== null
          ? `Termina en ${formatTimeRemaining(new Date(Date.now() + validation.hoursRemaining * 60 * 60 * 1000))}`
          : 'Disponible ahora',
    };
  }

  if (validation.isUpcoming) {
    return {
      label: 'Proxima',
      tone: 'bg-sky-600 text-white',
      detail: 'La promocion aun no comenzo',
    };
  }

  if (validation.isExpired) {
    return {
      label: 'Finalizada',
      tone: 'bg-slate-600 text-white',
      detail: 'La vigencia de la promocion ya termino',
    };
  }

  return {
    label: 'Sin validar',
    tone: 'bg-amber-500 text-white',
    detail: 'Revisa la configuracion de la promocion',
  };
}

export default function OfferQuickViewModal({
  item,
  isOpen,
  onClose,
  onAddToCart,
  config,
  allowAddToCart = true,
  allowViewProduct = true,
}: OfferQuickViewModalProps) {
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
  }, [isOpen, item?.product.id, item?.promotion.id]);

  useEffect(() => {
    return () => {
      if (addedToCartTimeoutRef.current !== null) {
        window.clearTimeout(addedToCartTimeoutRef.current);
      }
    };
  }, []);

  const images = useMemo(() => (item ? getOfferImages(item) : []), [item]);
  const validation = useMemo(
    () =>
      item
        ? validatePromotion({
            ...item.promotion,
            isActive: item.promotion.isActive,
          })
        : null,
    [item]
  );
  const status = useMemo(
    () => (validation ? getPromotionStatus(validation) : null),
    [validation]
  );
  const isOutOfStock = Number(item?.product.stock_quantity ?? 0) <= 0;
  const maxSelectableQuantity = Math.max(
    0,
    Math.min(Number(item?.product.stock_quantity ?? 0), MAX_MODAL_QUANTITY)
  );
  const detailHref = item && allowViewProduct ? tenantHref(`/catalog/${item.product.id}`) : tenantHref('/offers');

  const handleQuantityChange = useCallback((delta: number) => {
    if (maxSelectableQuantity <= 0) {
      return;
    }

    setQuantity((previous) => Math.max(1, Math.min(previous + delta, maxSelectableQuantity)));
  }, [maxSelectableQuantity]);

  const handleAddToCart = useCallback(() => {
    if (!item || !onAddToCart || isOutOfStock || quantity <= 0) {
      return;
    }

    onAddToCart(item, quantity);
    setAddedToCart(true);

    if (addedToCartTimeoutRef.current !== null) {
      window.clearTimeout(addedToCartTimeoutRef.current);
    }

    addedToCartTimeoutRef.current = window.setTimeout(() => {
      setAddedToCart(false);
      addedToCartTimeoutRef.current = null;
    }, 1800);
  }, [isOutOfStock, item, onAddToCart, quantity]);

  const handleShare = useCallback(async () => {
    if (!item || typeof window === 'undefined') {
      return;
    }

    const shareUrl = new URL(detailHref, window.location.origin).toString();
    const sharePayload = {
      title: item.product.name,
      text: `${item.promotion.name} - ${formatPrice(item.offerPrice, config)}`,
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
          description: 'La oferta ya esta lista para compartir.',
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
  }, [config, detailHref, item, toast]);

  if (!item || !validation || !status) {
    return null;
  }

  const selectedImageSrc = images[selectedImage] || null;
  const timeRemaining = item.promotion.endDate ? formatTimeRemaining(item.promotion.endDate) : 'Sin fecha';
  const priceLabel = formatPrice(item.offerPrice, config);
  const regularPriceLabel = formatPrice(item.basePrice, config);
  const savingsLabel = formatPrice(item.savings, config);

  const metaItems = [
    item.product.categoryName ? { label: 'Categoria', value: item.product.categoryName, icon: Tag } : null,
    item.product.brand ? { label: 'Marca', value: item.product.brand, icon: Sparkles } : null,
    item.product.sku ? { label: 'SKU', value: item.product.sku, icon: Package } : null,
  ].filter(Boolean) as Array<{ label: string; value: string; icon: typeof Tag }>;

  const highlights = [
    {
      label: 'Promocion',
      value: item.promotion.name,
      detail: status.detail,
    },
    {
      label: 'Vigencia',
      value: timeRemaining,
      detail: item.promotion.endDate
        ? `Hasta ${formatDate(item.promotion.endDate, config)}`
        : 'Sin fecha de cierre publicada',
    },
    {
      label: 'Ahorro',
      value: savingsLabel,
      detail: `${Math.round(item.discountPercent)}% de descuento sobre el precio base`,
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent className="max-w-5xl overflow-hidden border-0 bg-background p-0 sm:max-h-[92vh]">
        <DialogTitle className="sr-only">{item.product.name}</DialogTitle>
        <DialogDescription className="sr-only">
          Detalle de la oferta con galeria, vigencia, ahorro y acciones para compra o compartir.
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
          <section className="relative border-b border-slate-200 bg-gradient-to-br from-rose-50 via-white to-orange-50 p-5 dark:border-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 md:border-b-0 md:border-r md:p-6">
            <Link
              href={detailHref}
              className="relative block aspect-square overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-slate-900"
            >
              {selectedImageSrc ? (
                <Image
                  src={selectedImageSrc}
                  alt={item.product.name}
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
                <Badge className="border-0 bg-rose-600 px-3 py-1 text-sm font-semibold text-white">
                  -{Math.round(item.discountPercent)}% OFF
                </Badge>
                <Badge className={`border-0 px-3 py-1 text-sm font-semibold ${status.tone}`}>
                  {status.label}
                </Badge>
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
                      alt={`${item.product.name} ${index + 1}`}
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
                  <Link href={detailHref} className="block">
                    <h2 className="text-2xl font-bold tracking-tight text-foreground transition-colors hover:text-rose-600 md:text-3xl">
                      {item.product.name}
                    </h2>
                  </Link>
                  <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-sm font-medium text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
                    <Tag className="h-4 w-4" />
                    {item.promotion.name}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 rounded-full"
                  onClick={handleShare}
                  aria-label="Compartir oferta"
                >
                  <Share2 className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {item.product.description ? (
              <p className="mt-5 text-sm leading-7 text-muted-foreground md:text-[15px]">
                {item.product.description}
              </p>
            ) : (
              <p className="mt-5 text-sm leading-7 text-muted-foreground">
                Esta oferta no tiene una descripcion extra cargada para el producto.
              </p>
            )}

            {item.promotion.description ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50/70 p-4 text-sm text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-100">
                <p className="font-semibold">Detalle de la promocion</p>
                <p className="mt-1 leading-6 text-rose-800 dark:text-rose-200">
                  {item.promotion.description}
                </p>
              </div>
            ) : null}

            <div className="mt-6 rounded-[28px] border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/70">
              <div className="flex flex-wrap items-end gap-3">
                <span className="text-3xl font-black tracking-tight text-foreground md:text-4xl">
                  {priceLabel}
                </span>
                <span className="text-base text-muted-foreground line-through">
                  {regularPriceLabel}
                </span>
                <Badge className="border-0 bg-emerald-600 text-white">
                  Ahorras {savingsLabel}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Precio promocional vigente segun la configuracion actual del tenant.
              </p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {highlights.map((entry) => (
                <div
                  key={entry.label}
                  className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/60"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {entry.label}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-foreground">{entry.value}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{entry.detail}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-sm dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4 text-rose-500" />
                <span>
                  {item.promotion.startDate ? `Desde ${formatDate(item.promotion.startDate, config)}` : 'Sin fecha de inicio'}
                </span>
                <span className="text-slate-300 dark:text-slate-700">/</span>
                <span>
                  {item.promotion.endDate ? `Hasta ${formatDate(item.promotion.endDate, config)}` : 'Sin fecha de fin'}
                </span>
              </div>
            </div>

            <Separator className="my-6" />

            {allowAddToCart && onAddToCart ? (
              <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Cantidad</p>
                    <p className="text-xs text-muted-foreground">
                      Maximo {Math.min(MAX_MODAL_QUANTITY, Math.max(Number(item.product.stock_quantity ?? 0), 0)) || 0} unidades desde este modal.
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
                  <span className="text-muted-foreground">Subtotal con promo: </span>
                  <strong>{formatPrice(item.offerPrice * quantity, config)}</strong>
                </div>
              </div>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              {allowAddToCart && onAddToCart ? (
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

              {allowViewProduct ? (
                <Button asChild variant="outline" size="lg" className="h-14 rounded-2xl px-5">
                  <Link href={detailHref}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Ver producto
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" size="lg" className="h-14 rounded-2xl px-5" onClick={handleShare}>
                  <HeartHandshake className="mr-2 h-4 w-4" />
                  Compartir oferta
                </Button>
              )}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

