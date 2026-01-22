"use client"
import { useEffect, useState } from 'react'

export default function DashboardStatsDebugPage() {
  const [stats, setStats] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const resp = await fetch('/api/dashboard/stats')
        if (!resp.ok) throw new Error(`Error ${resp.status}`)
        const data = await resp.json()
        setStats(data)
      } catch (e: any) {
        setError(e?.message || 'Error desconocido')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600 }}>Debug: Dashboard Stats</h1>
      <p style={{ color: '#666' }}>Verifica que el proxy /api/dashboard/stats responde correctamente.</p>

      {loading && <p>Cargando...</p>}
      {error && (
        <pre style={{ color: 'red', background: '#fee', padding: 12, borderRadius: 8 }}>
          Error: {error}
        </pre>
      )}
      {stats && (
        <pre style={{ background: '#f6f8fa', padding: 12, borderRadius: 8 }}>
          {JSON.stringify(stats, null, 2)}
        </pre>
      )}
    </div>
  )
}