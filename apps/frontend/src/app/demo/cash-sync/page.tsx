'use client'
export const dynamic = 'force-dynamic'
import React, { useEffect, useState } from 'react'
import type { CashSessionState } from '@/lib/sync/cash-sync'

const sessionId = 'demo-session-001'

export default function Page() {
  const [state, setState] = useState<CashSessionState>({
    sessionId,
    status: 'open',
    closing_amount: null,
    updated_at: new Date().toISOString()
  } as any)
  const [close, setClose] = useState<(amount: number) => void>(() => () => {})

  useEffect(() => {
    let unsub: any
    let stop: () => void = () => {}
    ;(async () => {
      const mod = await import('@/lib/sync/cash-sync')
      const { store, start, stop: stopFn, closeSession } = mod.createCashSessionStore(sessionId, 'store-01', 'pos-01')
      setState(store.getData() as any)
      setClose(() => (amount: number) => closeSession(amount))
      unsub = store.subscribe((s: any) => setState(s.data))
      start()
      stop = stopFn
    })()
    return () => { if (unsub) unsub(); stop() }
  }, [])

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Demo: Sincronización de Sesión de Caja</h1>
      <p className="text-gray-600 mb-6">Abre esta página en múltiples pestañas y cierra la sesión.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-4 bg-white rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Estado de Sesión</h2>
          <div className="space-y-2 text-sm">
            <div><span className="font-medium">Sesión:</span> {state.sessionId}</div>
            <div><span className="font-medium">Estado:</span> {state.status}</div>
            <div><span className="font-medium">Cierre:</span> {state.closing_amount ?? '—'}</div>
            <div><span className="font-medium">Actualizado:</span> {new Date(state.updated_at).toLocaleString()}</div>
          </div>
        </div>

        <div className="p-4 bg-white rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Acciones</h2>
          <div className="flex items-center space-x-3">
            <button className="bg-green-600 text-white px-3 py-2 rounded" onClick={() => close(1500)}>
              Cerrar sesión ($1500)
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
