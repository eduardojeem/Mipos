'use client';

import React, { useRef } from 'react';
import Image from 'next/image';
import {
  AlertTriangle,
  Package,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { shouldBypassNextImageOptimizer } from '@/lib/images/next-image';
import { cn } from '@/lib/utils';
import type { Product } from '@/types';

interface DeleteProductDialogProps {
  open: boolean;
  product: Product | null;
  /** Si el producto tiene historial de ventas, se desactivará en vez de eliminarse */
  hasHistory?: boolean | null;
  isDeleting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteProductDialog({
  open,
  product,
  hasHistory = null,
  isDeleting = false,
  onConfirm,
  onCancel,
}: DeleteProductDialogProps) {
  // Ref para detectar si el cierre fue por confirmación o por cancelación
  const confirmedRef = useRef(false);

  if (!product) return null;

  const historyKnown = typeof hasHistory === 'boolean';
  const willDeactivate = hasHistory === true;
  const willDelete = hasHistory === false;
  const imageUrl = product.image_url || null;
  const stock = product.stock_quantity || 0;

  const handleOpenChange = (o: boolean) => {
    if (!o) {
      if (confirmedRef.current) {
        // El dialog se cierra porque el usuario confirmó — no llamar onCancel
        confirmedRef.current = false;
        return;
      }
      // Cerrado por Esc, click fuera, o botón Cancelar
      onCancel();
    }
  };

  const handleConfirm = () => {
    // Marcar como confirmado ANTES de llamar onConfirm para que
    // cuando AlertDialogAction cierre el dialog, handleOpenChange no llame onCancel
    confirmedRef.current = true;
    onConfirm();
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-sm gap-0 overflow-hidden p-0">
        {/* ── Header con color semántico ────────────────────────────────── */}
        <div className={cn(
          'px-5 pt-5 pb-4',
          willDeactivate || !historyKnown
            ? 'bg-amber-50 dark:bg-amber-950/30'
            : 'bg-rose-50 dark:bg-rose-950/30',
        )}>
          <div className="flex items-start gap-3">
            <div className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
              willDeactivate || !historyKnown
                ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400'
                : 'bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400',
            )}>
              {willDeactivate || !historyKnown ? (
                <ShieldAlert className="h-5 w-5" />
              ) : (
                <Trash2 className="h-5 w-5" />
              )}
            </div>
            <AlertDialogHeader className="flex-1 p-0">
              <AlertDialogTitle className="text-left text-base font-semibold leading-tight">
                {willDeactivate
                  ? 'Desactivar producto'
                  : willDelete
                    ? 'Eliminar producto'
                    : 'Eliminar / desactivar producto'}
              </AlertDialogTitle>
              <AlertDialogDescription className={cn(
                'text-left text-xs leading-snug',
                willDeactivate || !historyKnown
                  ? 'text-amber-700 dark:text-amber-400'
                  : 'text-rose-700 dark:text-rose-400',
              )}>
                {willDeactivate ? (
                  'Tiene historial de ventas — se marcará como inactivo.'
                ) : willDelete ? (
                  `Vas a eliminar "${product.name || 'este producto'}". Esta acción no se puede deshacer.`
                ) : (
                  `Si tiene historial de ventas se marcará como inactivo. Si no, se eliminará permanentemente.`
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>
        </div>

        {/* ── Vista previa del producto ─────────────────────────────────── */}
        <div className="border-y border-border/50 bg-card px-5 py-4">
          <div className="flex items-center gap-3">
            {/* Thumbnail */}
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-muted ring-1 ring-border/40">
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={product.name || 'Producto'}
                  fill
                  className="object-cover"
                  sizes="48px"
                  unoptimized={shouldBypassNextImageOptimizer(imageUrl)}
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Package className="h-5 w-5 text-muted-foreground/40" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {product.name || 'Sin nombre'}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {product.sku && (
                  <span className="font-mono text-[11px] text-muted-foreground">{product.sku}</span>
                )}
                {stock === 0 ? (
                  <Badge variant="outline" className="gap-0.5 rounded border-rose-300 bg-rose-50 text-[10px] text-rose-600 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-400">
                    <AlertTriangle className="h-2.5 w-2.5" /> Sin stock
                  </Badge>
                ) : (
                  <Badge variant="outline" className="rounded text-[10px]">
                    {stock} uds
                  </Badge>
                )}
                <Badge variant="outline" className={cn(
                  'rounded text-[10px]',
                  product.is_active
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400'
                    : 'border-slate-300 text-slate-500',
                )}>
                  {product.is_active ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* ── Explicación de consecuencias ──────────────────────────────── */}
        <div className="px-5 py-4">
          {willDeactivate ? (
            <div className="rounded-xl border border-amber-200/60 bg-amber-50/50 p-3 dark:border-amber-800/40 dark:bg-amber-950/20">
              <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-300">
                <strong>¿Qué pasa?</strong> El producto se marcará como <strong>Inactivo</strong> y
                dejará de aparecer en el catálogo y en el POS. El historial de ventas se conserva.
                Podés reactivarlo en cualquier momento.
              </p>
            </div>
          ) : willDelete ? (
            <div className="rounded-xl border border-rose-200/60 bg-rose-50/50 p-3 dark:border-rose-800/40 dark:bg-rose-950/20">
              <p className="text-xs leading-relaxed text-rose-800 dark:text-rose-300">
                <strong>¿Qué pasa?</strong> El producto se eliminará <strong>permanentemente</strong>{' '}
                del catálogo. No se puede recuperar.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200/60 bg-emerald-50/50 p-3 dark:border-emerald-800/40 dark:bg-emerald-950/20">
                <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <p className="text-xs leading-relaxed text-emerald-800 dark:text-emerald-300">
                  Si el producto tiene <strong>historial de ventas</strong>, se desactivará para conservar los datos.
                </p>
              </div>
              <div className="flex items-start gap-2.5 rounded-xl border border-rose-200/60 bg-rose-50/50 p-3 dark:border-rose-800/40 dark:bg-rose-950/20">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-600 dark:text-rose-400" />
                <p className="text-xs leading-relaxed text-rose-800 dark:text-rose-300">
                  Si no tiene ventas, se eliminará <strong>permanentemente</strong> del catálogo.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <AlertDialogFooter className="gap-2 border-t border-border/50 bg-muted/20 px-5 py-3">
          <AlertDialogCancel
            onClick={onCancel}
            className="h-9 rounded-xl text-sm"
            disabled={isDeleting}
          >
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isDeleting}
            className={cn(
              'h-9 gap-1.5 rounded-xl text-sm',
              willDeactivate || !historyKnown
                ? 'bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700'
                : 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
            )}
          >
            {isDeleting ? (
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : willDeactivate || !historyKnown ? (
              <ShieldAlert className="h-3.5 w-3.5" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            {isDeleting
              ? 'Procesando…'
              : willDeactivate
                ? 'Sí, desactivar'
                : willDelete
                  ? 'Sí, eliminar'
                  : 'Continuar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ── Bulk delete dialog ────────────────────────────────────────────────────────
interface BulkDeleteDialogProps {
  open: boolean;
  count: number;
  isDeleting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function BulkDeleteDialog({
  open, count, isDeleting = false, onConfirm, onCancel,
}: BulkDeleteDialogProps) {
  const confirmedRef = useRef(false);

  const handleOpenChange = (o: boolean) => {
    if (!o) {
      if (confirmedRef.current) {
        confirmedRef.current = false;
      } else {
        onCancel();
      }
    }
  };

  const handleConfirm = () => {
    confirmedRef.current = true;
    onConfirm();
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-sm gap-0 overflow-hidden p-0">
        {/* Header */}
        <div className="bg-rose-50 px-5 pt-5 pb-4 dark:bg-rose-950/30">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400">
              <Trash2 className="h-5 w-5" />
            </div>
            <AlertDialogHeader className="flex-1 p-0">
              <AlertDialogTitle className="text-left text-base font-semibold">
                Eliminar {count} producto{count !== 1 ? 's' : ''}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-left text-xs text-rose-700 dark:text-rose-400">
                Acción en lote sobre {count} producto{count !== 1 ? 's' : ''} seleccionado{count !== 1 ? 's' : ''}.
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          <div className="space-y-3">
            <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200/60 bg-emerald-50/50 p-3 dark:border-emerald-800/40 dark:bg-emerald-950/20">
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <p className="text-xs leading-relaxed text-emerald-800 dark:text-emerald-300">
                Los que tienen <strong>historial de ventas</strong> se desactivarán
                automáticamente — los datos se conservan.
              </p>
            </div>
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-200/60 bg-rose-50/50 p-3 dark:border-rose-800/40 dark:bg-rose-950/20">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-600 dark:text-rose-400" />
              <p className="text-xs leading-relaxed text-rose-800 dark:text-rose-300">
                Los que <strong>no tienen ventas</strong> se eliminarán de forma permanente e
                irreversible.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <AlertDialogFooter className="gap-2 border-t border-border/50 bg-muted/20 px-5 py-3">
          <AlertDialogCancel onClick={onCancel} className="h-9 rounded-xl text-sm" disabled={isDeleting}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isDeleting}
            className="h-9 gap-1.5 rounded-xl bg-destructive text-sm text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            {isDeleting ? 'Procesando…' : `Eliminar ${count}`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
