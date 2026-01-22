"use client";
import React, { RefObject } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Barcode, Zap, ShoppingCart, RefreshCw, Keyboard } from 'lucide-react';

interface POSQuickActionsProps {
  searchInputRef: RefObject<HTMLInputElement | null>;
  barcodeInputRef: RefObject<HTMLInputElement | null>;
  onFocusSearch: () => void;
  onBarcodeEnter: (code: string) => void;
  onToggleBarcodeMode: () => void;
  barcodeMode: boolean;
  onToggleQuickAdd: () => void;
  quickAddMode: boolean;
  onRefreshData: () => void;
  onShowShortcuts: () => void;
  onToggleCart: () => void;
  cartCount: number;
}

export default function POSQuickActions(props: POSQuickActionsProps) {
  const {
    searchInputRef,
    barcodeInputRef,
    onFocusSearch,
    onBarcodeEnter,
    onToggleBarcodeMode,
    barcodeMode,
    onToggleQuickAdd,
    quickAddMode,
    onRefreshData,
    onShowShortcuts,
    onToggleCart,
    cartCount,
  } = props;

  return (
    <div role="region" aria-label="Acciones rápidas del POS" className="px-md py-sm border-b border-border bg-muted/40 backdrop-blur supports-[backdrop-filter]:bg-muted/30">
      <div role="toolbar" aria-label="Acciones principales del POS" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-12 gap-xs">
        <div className="col-span-2 md:col-span-2 lg:col-span-8 flex flex-wrap items-center gap-2" aria-label="Acciones del catálogo">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onFocusSearch();
              searchInputRef.current?.focus();
            }}
            aria-label="Ir a búsqueda"
            title="Ir a búsqueda"
          >
            <Search className="h-4 w-4 mr-2" />
            Buscar
          </Button>

          <Button
            variant={barcodeMode ? "default" : "outline"}
            size="sm"
            onClick={() => {
              onToggleBarcodeMode();
              barcodeInputRef.current?.focus();
            }}
            aria-pressed={barcodeMode}
            aria-label="Escaneo con código de barras"
            title="Escaneo con código de barras"
          >
            <Barcode className="h-4 w-4 mr-2" />
            {barcodeMode ? 'Barras activo' : 'Barras'}
          </Button>

          <Button
            variant={quickAddMode ? "default" : "outline"}
            size="sm"
            onClick={onToggleQuickAdd}
            aria-pressed={quickAddMode}
            aria-label="Añadir rápido"
            title="Añadir rápido"
          >
            <Zap className="h-4 w-4 mr-2" />
            {quickAddMode ? 'Rápido activo' : 'Añadir rápido'}
          </Button>
        </div>

        <div className="col-span-2 md:col-span-1 lg:col-span-4 flex flex-wrap items-center gap-2 justify-end" aria-label="Acciones de carrito y sistema">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefreshData}
            aria-label="Actualizar datos"
            title="Actualizar datos"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={onToggleCart}
            aria-label="Abrir carrito"
            title="Abrir carrito"
          >
            <div className="relative flex items-center">
              <ShoppingCart className="h-4 w-4 mr-2" />
              Carrito
              {cartCount > 0 && (
                <Badge className="ml-2" variant="secondary">{cartCount > 99 ? '99+' : cartCount}</Badge>
              )}
            </div>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onShowShortcuts}
            aria-label="Mostrar atajos de teclado"
            title="Mostrar atajos de teclado"
          >
            <Keyboard className="h-4 w-4 mr-2" />
            Atajos
          </Button>
        </div>
      </div>
    </div>
  );
}