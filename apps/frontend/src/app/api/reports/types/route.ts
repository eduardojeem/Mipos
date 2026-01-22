import { NextRequest, NextResponse } from 'next/server'
import { api, getErrorMessage } from '@/lib/api'
import { createClient } from '@/lib/supabase/server'
import { isMockAuthEnabled } from '@/lib/env'

// GET /api/reports/types -> proxy to backend `/api/reports/types`
export async function GET(_request: NextRequest) {
  try {
    // Require authenticated user unless mock auth is enabled
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user && !isMockAuthEnabled()) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
      }
    } catch {
      if (!isMockAuthEnabled()) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
      }
    }
    const { data } = await api.get('/reports/types')
    return NextResponse.json(data)
  } catch (error: any) {
    const status = error?.response?.status ?? 500
    const details = error?.response?.data ?? getErrorMessage(error)

    // Fallback seguro en desarrollo: devolver tipos estáticos
    const isDev = process.env.NODE_ENV !== 'production'
    if (isDev) {
      const types = [
        { id: 'sales', name: 'Ventas', description: 'Órdenes, ingresos, ticket promedio', exportFormats: ['pdf', 'excel', 'csv', 'json'] },
        { id: 'inventory', name: 'Inventario', description: 'Stock, valor y movimientos', exportFormats: ['pdf', 'excel', 'csv', 'json'] },
        { id: 'customers', name: 'Clientes', description: 'Actividad, segmentos y retención', exportFormats: ['pdf', 'excel', 'csv', 'json'] },
        { id: 'financial', name: 'Financiero', description: 'Ingresos, gastos y márgenes', exportFormats: ['pdf', 'excel', 'csv', 'json'] }
      ]
      return NextResponse.json(
        { success: true, data: types, message: 'Tipos de reporte disponibles (fallback desarrollo)' },
        { status: 200, headers: { 'X-Data-Source': 'mock' } }
      )
    }

    return NextResponse.json(
      { error: status === 500 ? 'Internal server error' : `Backend error: ${status}`, details },
      { status }
    )
  }
}