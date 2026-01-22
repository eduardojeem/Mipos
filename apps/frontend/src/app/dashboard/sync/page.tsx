'use client'

import React, { useEffect, useState } from 'react'
import SyncStatusBar from '@/components/sync/SyncStatusBar'
import { operationQueue } from '@/lib/sync/offline-queue'
import { syncState, type SyncCoordinatorState } from '@/lib/sync/sync-state'
import { syncLogger, type SyncMetrics } from '@/lib/sync/sync-logging'

export default function SyncDemoPage() {
  const [registered, setRegistered] = useState(false)
  const [online, setOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true)

  useEffect(() => {
    if (registered) return
    // Registrar handler de demo que simula éxito/fracaso
    operationQueue.registerHandler('demo', async (op) => {
      // Simula latencia
      await new Promise((r) => setTimeout(r, 300))
      if (op.payload?.fail) {
        const err: any = new Error('Simulated failure')
        err.status = 503
        throw err
      }
      // éxito
    })
    setRegistered(true)
  }, [registered])

  const enqueueOk = async () => {
    await operationQueue.enqueue({
      type: 'demo',
      payload: { example: 'ok' },
      priority: 'normal',
    })
  }

  const enqueueFail = async () => {
    await operationQueue.enqueue({
      type: 'demo',
      payload: { fail: true },
      priority: 'high',
    })
  }

  const toggleOnline = () => {
    const next = !online
    setOnline(next)
    operationQueue.setOnline(next)
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Demo de Cola Offline/Online</h1>
      <SyncStatusBar />
      {/* Panel de métricas del coordinador */}
      <CoordinatorMetrics />
      <div className="flex gap-2">
        <button onClick={enqueueOk} className="px-3 py-1 rounded bg-blue-600 text-white">
          Encolar operación OK
        </button>
        <button onClick={enqueueFail} className="px-3 py-1 rounded bg-orange-600 text-white">
          Encolar operación con fallo
        </button>
        <button onClick={toggleOnline} className="px-3 py-1 rounded bg-gray-200">
          {online ? 'Simular Offline' : 'Volver Online'}
        </button>
      </div>
      <p className="text-sm text-gray-600">
        Usa los botones para encolar operaciones y probar reintentos, deduplicación y procesamiento en distintos estados de conectividad.
      </p>
    </div>
  )
}

function Stat({ label, value, hint, accent }: { label: string; value: string | number; hint?: string; accent?: 'green'|'yellow'|'red'|'blue' }) {
  const map: Record<string, string> = {
    green: 'bg-green-50 text-green-700 border-green-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
  }
  return (
    <div className={`p-3 rounded border ${accent ? map[accent] : 'bg-white border-gray-200'}`}>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
      {hint && <div className="text-[11px] text-gray-400 mt-1">{hint}</div>}
    </div>
  )
}

function CoordinatorMetrics() {
  const [state, setState] = useState<SyncCoordinatorState>(syncState.get())
  const [metrics, setMetrics] = useState<SyncMetrics>(syncLogger.getMetrics())

  useEffect(() => {
    const unsubState = syncState.subscribe(s => setState(s))
    const unsubMetrics = syncLogger.subscribe(m => setMetrics(m))
    return () => { unsubState(); unsubMetrics() }
  }, [])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      <Stat label="Método" value={state.method} accent={state.method === 'realtime' ? 'green' : state.method === 'polling' ? 'yellow' : 'red'} />
      <Stat label="Calidad de red" value={state.networkQuality} />
      <Stat label="Backlog" value={state.backlogSize} hint={state.backpressureActive ? 'Backpressure activo' : undefined} accent={state.backpressureActive ? 'yellow' : 'blue'} />
      <Stat label="Tick" value={`${state.tickIntervalMs} ms`} />
      <Stat label="Realtime" value={state.isRealtimeActive ? 'Activo' : 'Inactivo'} accent={state.isRealtimeActive ? 'green' : 'red'} />
      <Stat label="Polling" value={state.isPollingActive ? 'Activo' : 'Inactivo'} accent={state.isPollingActive ? 'yellow' : 'blue'} />
      <Stat label="Throughput/min" value={metrics.throughputPerMin} />
      <Stat label="Errores" value={metrics.errors} accent={metrics.errors > 0 ? 'red' : 'green'} />
    </div>
  )
}