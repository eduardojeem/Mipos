"use client";

import { useCallback, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Building2, MapPin, Package, Tag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProductImagePlaceholder } from '@/components/products/ProductImagePlaceholder';
import type { GlobalProductCard } from '@/lib/public-site/data';
import { cn } from '@/lib/utils';
import {
  formatMarketplaceCurrency,
  normalizeMarketplaceHref,
  buildProductDetailHref,
} from './marketplace-utils';

interface ProductGridProps {
  products: GlobalProductCard[];
  className?: string;
}

function hasProductImage(image?: string | null) {
  const src = String(image || '').trim();
  return Boolean(src) && !src.startsWith('/api/placeholder/');
}

function shouldBypassImageOptimizer(image?: string | null) {
  const src = String(image || '');
  return src.includes('images.unsplash.com');
}

function GlobalProductImage({ product }: { product: GlobalProductCard }) {
  const [imageError, setImageError] = useState(false);
  const showImage = hasProductImage(product.image) && !imageError;

  if (!showImage) {
    return <ProductImagePlaceholder productName={product.name} className="absolute inset-0 rounded-none border-0" />;
  }

  return (
    <Image
      src={product.image}
      alt={product.name}
      fill
      className="object-cover transition-transform duration-500 group-hover:scale-105"
      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
      loading="lazy"
      unoptimized={shouldBypassImageOptimizer(product.image)}
      onError={() => setImageError(true)}
    />
  );
}

// ── Modal de detalle de producto ──
function ProductDetailModal({
  product,
  onClose,
}: {
  product: GlobalProductCard;
  onClose: () => void;
}) {
  const [imageError, setImageError] = useState(false);
  const hasOffer = Boolean(product.offerPrice && product.offerPrice < product.basePrice);
  const detailHref = buildProductDetailHref(product);
  const organizationHref = normalizeMarketplaceHref(product.organizationHref);
  const showImage = hasProductImage(product.image) && !imageError;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cerrar */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-sm transition-colors hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Imagen */}
        <div className="relative aspect-square overflow-hidden bg-slate-100 dark:bg-slate-800">
          {showImage ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 512px) 100vw, 512px"
              unoptimized={shouldBypassImageOptimizer(product.image)}
              onError={() => setImageError(true)}
            />
          ) : (
            <ProductImagePlaceholder productName={product.name} className="absolute inset-0 rounded-none border-0" />
          )}
          {hasOffer ? (
            <Badge className="absolute left-4 top-4 bg-emerald-500 text-white">
              <Tag className="mr-1 h-3 w-3" />
              {Number(product.discountPercentage || 0) > 0
                ? `-${Math.round(Number(product.discountPercentage))}%`
                : 'Oferta'}
            </Badge>
          ) : null}
        </div>

        {/* Contenido */}
        <div className="space-y-4 p-6">
          {/* Categoría + Brand */}
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className="rounded-full text-[10px]">
              {product.categoryName}
            </Badge>
            {product.brand ? (
              <Badge variant="outline" className="rounded-full border-amber-200 bg-amber-50 text-[10px] text-amber-700 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-200">
                {product.brand}
              </Badge>
            ) : null}
          </div>

          {/* Nombre */}
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">
            {product.name}
          </h2>

          {/* Descripción */}
          {product.description ? (
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              {product.description}
            </p>
          ) : null}

          {/* Rating */}
          {Number(product.rating || 0) > 0 ? (
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className={`text-sm ${i < Math.round(Number(product.rating || 0)) ? 'text-amber-400' : 'text-slate-200 dark:text-slate-700'}`}
                >
                  ★
                </span>
              ))}
              <span className="ml-1 text-xs text-slate-400">{Number(product.rating).toFixed(1)}</span>
            </div>
          ) : null}

          {/* Precio */}
          <div className="flex items-end gap-3">
            {hasOffer ? (
              <>
                <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                  {formatMarketplaceCurrency(product.offerPrice || product.basePrice)}
                </span>
                <span className="text-sm text-slate-400 line-through">
                  {formatMarketplaceCurrency(product.basePrice)}
                </span>
              </>
            ) : (
              <span className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                {formatMarketplaceCurrency(product.basePrice)}
              </span>
            )}
          </div>

          {/* Stock */}
          <div className="flex items-center gap-2 text-sm">
            <Package className="h-4 w-4 text-slate-400" />
            <span className={Number(product.stockQuantity || 0) > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}>
              {Number(product.stockQuantity || 0) > 0 ? `${product.stockQuantity} en stock` : 'Sin stock'}
            </span>
          </div>

          {/* Tienda */}
          <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-800/50">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white shadow-sm dark:bg-slate-700">
              <Building2 className="h-4 w-4 text-slate-600 dark:text-slate-300" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                {product.organizationName}
              </p>
              {product.city ? (
                <p className="flex items-center gap-1 text-xs text-slate-400">
                  <MapPin className="h-3 w-3" />
                  {product.city}
                </p>
              ) : null}
            </div>
          </div>

          {/* CTAs */}
          <div className="flex gap-3 pt-2">
            <a href={detailHref} className="flex-1">
              <Button className="w-full rounded-xl bg-emerald-600 font-semibold text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600">
                Ir a tienda
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </a>
            <a href={organizationHref}>
              <Button variant="outline" className="rounded-xl border-slate-200 dark:border-slate-700">
                Ver local
              </Button>
            </a>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Card de Producto Reutilizable ──
export function ProductCard({
  product,
  index,
  onOpenModal,
}: {
  product: GlobalProductCard;
  index: number;
  onOpenModal: (product: GlobalProductCard) => void;
}) {
  const hasOffer = Boolean(product.offerPrice && product.offerPrice < product.basePrice);
  const discountLabel =
    hasOffer && Number(product.discountPercentage || 0) > 0
      ? `Ahorra ${Math.round(Number(product.discountPercentage || 0))}%`
      : 'En oferta';
  const detailHref = buildProductDetailHref(product);
  const organizationHref = normalizeMarketplaceHref(product.organizationHref);

  return (
    <motion.article
      initial={{ opacity: 0, scale: 0.97 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay: Math.min(index, 9) * 0.04 }}
      className="group overflow-hidden rounded-xl border border-slate-200/80 bg-white/95 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/60 dark:border-slate-800/80 dark:bg-slate-950/80 dark:hover:shadow-slate-950/40"
    >
      {/* Imagen — clic abre modal */}
      <button
        type="button"
        onClick={() => onOpenModal(product)}
        className="relative block w-full aspect-square overflow-hidden bg-slate-100 text-left cursor-pointer dark:bg-slate-900"
        aria-label={`Ver detalle de ${product.name}`}
      >
        <GlobalProductImage product={product} />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {hasOffer ? (
            <Badge className="bg-emerald-500/90 text-white hover:bg-emerald-500">
              <Tag className="mr-1 h-3 w-3" />
              Oferta
            </Badge>
          ) : null}
          <Badge className="bg-slate-950/75 text-white hover:bg-slate-950 dark:bg-slate-950/90">
            {Number(product.stockQuantity || 0) > 0 ? 'Disponible' : 'Sin stock'}
          </Badge>
        </div>
      </button>

      <div className="p-5">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge
            variant="outline"
            className="rounded-full border-slate-200 bg-slate-50 text-[10px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            {product.categoryName}
          </Badge>
          {product.brand ? (
            <Badge
              variant="outline"
              className="rounded-full border-amber-200 bg-amber-50 text-[10px] font-semibold text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/60 dark:text-amber-200"
            >
              {product.brand}
            </Badge>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => onOpenModal(product)}
          className="block text-left"
        >
          <h3 className="mt-3 text-base font-semibold tracking-tight text-slate-900 transition-colors group-hover:text-emerald-700 dark:text-slate-100 dark:group-hover:text-emerald-300">
            {product.name}
          </h3>
        </button>
        {product.description ? (
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            {product.description}
          </p>
        ) : null}

        {Number(product.rating || 0) > 0 ? (
          <div className="mt-2 flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <span
                key={i}
                className={`text-xs ${i < Math.round(Number(product.rating || 0)) ? 'text-amber-400' : 'text-slate-200 dark:text-slate-700'}`}
              >
                ★
              </span>
            ))}
            <span className="ml-1 text-[10px] text-slate-400">{Number(product.rating).toFixed(1)}</span>
          </div>
        ) : null}

        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            {hasOffer ? (
              <>
                <p className="text-xs text-slate-400 line-through dark:text-slate-500">
                  {formatMarketplaceCurrency(product.basePrice)}
                </p>
                <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
                  {formatMarketplaceCurrency(product.offerPrice || product.basePrice)}
                </p>
                <p className="mt-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  {discountLabel}
                </p>
              </>
            ) : (
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {formatMarketplaceCurrency(product.basePrice)}
              </p>
            )}
          </div>
          <a href={detailHref}>
            <Button
              size="sm"
              className="rounded-lg bg-emerald-600 font-semibold text-white shadow-sm hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
            >
              Ir a tienda
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </a>
        </div>

        <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
          <a
            href={organizationHref}
            className="flex min-w-0 flex-1 items-center gap-2 transition-colors hover:text-emerald-700 dark:hover:text-emerald-300"
          >
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800">
              <Building2 className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
            </div>
            <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">{product.organizationName}</span>
            {product.city ? (
              <span className="flex shrink-0 items-center gap-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                <MapPin className="h-3 w-3" />
                {product.city}
              </span>
            ) : null}
          </a>
        </div>
      </div>
    </motion.article>
  );
}

// ── Grid principal ──
export function ProductGrid({ products, className }: ProductGridProps) {
  const [selectedProduct, setSelectedProduct] = useState<GlobalProductCard | null>(null);

  const openModal = useCallback((product: GlobalProductCard) => {
    setSelectedProduct(product);
  }, []);

  const closeModal = useCallback(() => {
    setSelectedProduct(null);
  }, []);

  return (
    <>
      <div className={cn('mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3', className)}>
        {products.map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            index={index}
            onOpenModal={openModal}
          />
        ))}
      </div>

      {/* Modal de detalle */}
      <AnimatePresence>
        {selectedProduct ? (
          <ProductDetailModal product={selectedProduct} onClose={closeModal} />
        ) : null}
      </AnimatePresence>
    </>
  );
}

// ── Carrusel / Lista Horizontal ──
export function ProductCarousel({ products }: { products: GlobalProductCard[] }) {
  const [selectedProduct, setSelectedProduct] = useState<GlobalProductCard | null>(null);

  const openModal = useCallback((product: GlobalProductCard) => {
    setSelectedProduct(product);
  }, []);

  const closeModal = useCallback(() => {
    setSelectedProduct(null);
  }, []);

  return (
    <>
      <div className="mt-8 flex gap-5 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800 scrollbar-track-transparent">
        {products.map((product, index) => (
          <div key={product.id} className="w-[280px] shrink-0 sm:w-[320px]">
            <ProductCard product={product} index={index} onOpenModal={openModal} />
          </div>
        ))}
      </div>

      {/* Modal de detalle */}
      <AnimatePresence>
        {selectedProduct ? (
          <ProductDetailModal product={selectedProduct} onClose={closeModal} />
        ) : null}
      </AnimatePresence>
    </>
  );
}

