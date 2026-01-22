'use client'

import React, { useEffect, useState } from 'react'
import { useQueueStatus, operationQueue } from '@/lib/sync/offline-queue'
import { syncState, type SyncCoordinatorState } from '@/lib/sync/sync-state'

interface Props {
  className?: string
}

export function SyncStatusBar({ className }: Props) {
  const { online, pending, lastSync } = useQueueStatus()
  const [messages, setMessages] = useState<string[]>([])
  const [state, setState] = useState<SyncCoordinatorState>(syncState.get())

  useEffect(() => {
    const unsubQueue = operationQueue.subscribe((evt) => {
      if (evt.type === 'processed') {
        setMessages((m) => [`Operación ${evt.op.type} procesada`, ...m].slice(0, 5))
      } else if (evt.type === 'failed') {
        setMessages((m) => [`Fallo ${evt.op.type}: ${String(evt.error)}`, ...m].slice(0, 5))
      } else if (evt.type === 'synced') {
        setMessages((m) => [`Sync ${evt.count} ops en ${evt.latencyMs}ms`, ...m].slice(0, 5))
      }
    })
    const unsubState = syncState.subscribe((s) => setState(s))
    return () => { unsubQueue(); unsubState() }
  }, [])

  const methodBadge = () => {
    const map: Record<string, string> = {
      realtime: 'bg-green-100 text-green-700',
      polling: 'bg-yellow-100 text-yellow-800',
      offline: 'bg-red-100 text-red-700',
    }
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded text-sm ${map[state.method] ?? 'bg-gray-100 text-gray-700'}`} title={`Método: ${state.method}`}>
        {state.method}
      </span>
    )
  }

  const qualityBadge = () => {
    const q = state.networkQuality
    const map: Record<string, string> = {
      excellent: 'bg-emerald-100 text-emerald-700',
      good: 'bg-green-100 text-green-700',
      fair: 'bg-orange-100 text-orange-700',
      poor: 'bg-amber-100 text-amber-800',
      offline: 'bg-red-100 text-red-700',
    }
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded text-xs ${map[q] ?? 'bg-gray-100 text-gray-700'}`} title={`Calidad de red: ${q}`}>
        {q}
      </span>
    )
  }

  return (
    <div className={className ?? 'flex items-center gap-3 p-2 border rounded bg-white'}>
      <span
        className={
          'inline-flex items-center px-2 py-1 rounded text-sm ' +
          (online ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-800')
        }
        title={online ? 'Conectado' : 'Sin conexión'}
      >
        {online ? 'Online' : 'Offline'}
      </span>
      {methodBadge()}
      {qualityBadge()}
      <span className="text-sm">Pendientes: {pending}</span>
      <span className="text-sm">Backlog: {state.backlogSize}</span>
      <span className="text-xs text-gray-600">Tick: {state.tickIntervalMs}ms</span>
      {state.backpressureActive && (
        <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-orange-100 text-orange-800" title="Backpressure activo">
          Backpressure
        </span>
      )}
      {lastSync && (
        <span className="text-xs text-gray-600">Último sync: {lastSync.count} ops, {lastSync.latencyMs}ms</span>
      )}
      <div className="ml-auto flex flex-col gap-1">
        {messages.map((m, i) => (
          <span key={i} className="text-xs text-gray-700">
            {m}
          </span>
        ))}
      </div>
    </div>
  )
}

export default SyncStatusBar