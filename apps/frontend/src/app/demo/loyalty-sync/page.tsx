'use client'
export const dynamic = 'force-dynamic'
import React, { useEffect, useState } from 'react'
import type { LoyaltyState } from '@/lib/sync/loyalty-sync'

const customerId = 'demo-customer-001'

export default function Page() {
  const [state, setState] = useState<LoyaltyState>({ customerId, currentPoints: 0, totalRedeemed: 0, lastActivity: new Date().toISOString() } as any)
  const [actions, setActions] = useState<{ adjustPoints: (n: number) => void }>({ adjustPoints: () => {} })

  useEffect(() => {
    let unsub: any
    let stop: () => void = () => {}
    ;(async () => {
      const mod = await import('@/lib/sync/loyalty-sync')
      const { store, actions: act, start, stop: stopFn } = mod.createLoyaltyStore(customerId, 'store-01', 'pos-01')
      setState(store.getData() as any)
      setActions({ adjustPoints: (n: number) => act.adjustPoints(n) })
      unsub = store.subscribe((s: any) => setState(s.data))
      start()
      stop = stopFn
    })()
    return () => { if (unsub) unsub(); stop() }
  }, [])

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Demo: Sincronización de Lealtad</h1>
      <p className="text-gray-600 mb-6">Abre esta página en múltiples pestañas y ajusta puntos.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-4 bg-white rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Estado del Cliente</h2>
          <div className="space-y-2 text-sm">
            <div><span className="font-medium">Cliente:</span> {state.customerId}</div>
            <div><span className="font-medium">Puntos actuales:</span> {state.currentPoints}</div>
            <div><span className="font-medium">Total redimidos:</span> {state.totalRedeemed}</div>
            <div><span className="font-medium">Última actividad:</span> {new Date(state.lastActivity).toLocaleString()}</div>
          </div>
        </div>

        <div className="p-4 bg-white rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Acciones</h2>
          <div className="flex items-center space-x-3">
            <button className="bg-blue-600 text-white px-3 py-2 rounded" onClick={() => actions.adjustPoints(10)}>+10 puntos</button>
            <button className="bg-blue-600 text-white px-3 py-2 rounded" onClick={() => actions.adjustPoints(-5)}>−5 puntos</button>
            <button className="bg-green-600 text-white px-3 py-2 rounded" onClick={() => actions.adjustPoints(-20)}>Redimir 20</button>
          </div>
        </div>
      </div>
    </div>
  )
}
