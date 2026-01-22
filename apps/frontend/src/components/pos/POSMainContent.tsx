"use client";
import React from "react";

type POSMainContentProps = {
  top?: React.ReactNode;
  left: React.ReactNode;
  right: React.ReactNode;
  performanceMode?: boolean;
};

export default function POSMainContent({ top, left, right, performanceMode }: POSMainContentProps) {
  return (
    <main
      id="main-content"
      role="main"
      aria-label="Área principal del Punto de Venta"
      className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-md xl:gap-lg px-md overflow-hidden"
    >
      {/* Enlaces para navegación rápida por teclado */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded px-2 py-1 bg-primary text-primary-foreground fixed top-2 left-2 z-50"
      >
        Saltar al contenido principal
      </a>
      <a
        href="#cart-title"
        className="sr-only focus:not-sr-only focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded px-2 py-1 bg-primary text-primary-foreground fixed top-2 left-40 z-50"
      >
        Ir al carrito
      </a>

      {/* Secciones superiores de ancho completo */}
      {top && (
        <div className="col-span-12">
          {top}
        </div>
      )}

      {/* Sección izquierda: catálogo y herramientas */}
      <div className={`contents ${performanceMode ? 'transition-none' : 'transition-all duration-200'} motion-reduce:transition-none`}>
        {left}
      </div>

      {/* Sección derecha: carrito */}
      <div className="contents">
        {right}
      </div>
    </main>
  );
}