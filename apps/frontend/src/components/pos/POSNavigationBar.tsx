"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { Users, Search, ShoppingCart, CreditCard } from "lucide-react";

type POSNavigationBarProps = {
  cartCount: number;
  onProcessSale: () => void;
};

export default function POSNavigationBar({ cartCount, onProcessSale }: POSNavigationBarProps) {
  return (
    <nav
      aria-label="Navegación del Punto de Venta"
      className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2 bg-background border-b border-border"
    >
      <div className="flex items-center gap-2">
        <a
          href="#customer-panel"
          className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-muted/50 rounded px-2 py-1"
        >
          <Users className="w-4 h-4 mr-1" /> Cliente
        </a>
        <a
          href="#catalog-title"
          className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-muted/50 rounded px-2 py-1"
        >
          <Search className="w-4 h-4 mr-1" /> Catálogo
        </a>
        <a
          href="#cart-title"
          aria-current="false"
          className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-muted/50 rounded px-2 py-1"
        >
          <ShoppingCart className="w-4 h-4 mr-1" /> Carrito ({cartCount})
        </a>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={onProcessSale}
          aria-label="Procesar cobro"
          title="Procesar cobro (F12)"
          disabled={!cartCount}
        >
          <CreditCard className="w-4 h-4 mr-1" /> Cobrar
        </Button>
      </div>
    </nav>
  );
}