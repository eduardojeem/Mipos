'use client';
export const dynamic = 'force-dynamic';
import NextDynamic from 'next/dynamic';
import React from 'react';
const InventorySyncDemo = NextDynamic(() => import('@/components/InventorySyncDemo').then(m => m.InventorySyncDemo), { ssr: false });

export default function Page() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Demo: Sincronización de Inventario</h1>
      <p className="text-gray-600 mb-6">
        Abre esta página en múltiples pestañas/navegadores/dispositivos para ver la sincronización en acción.
      </p>
      <InventorySyncDemo />
    </div>
  );
}
