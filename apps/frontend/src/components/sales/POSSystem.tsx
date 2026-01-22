"use client";

import dynamic from 'next/dynamic'

const EnhancedPOSPage = dynamic(() => import('@/app/dashboard/pos/enhanced-pos'), {
  ssr: false,
  // Suspense fallback mínimo para transición desde el placeholder
  loading: () => (
    <div style={{ padding: 12 }}>
      <h2>Cargando POS...</h2>
      <p>Preparando interfaz avanzada de punto de venta.</p>
    </div>
  ),
})

export default function POSSystem() {
  return <EnhancedPOSPage />
}