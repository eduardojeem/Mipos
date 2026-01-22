import { NextRequest, NextResponse } from 'next/server'
import { api, getErrorMessage } from '@/lib/api'

// GET /api/products/low-stock -> intenta backend optimizado y cae a respuesta vacía segura en dev
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const threshold = searchParams.get('threshold')

    try {
      // Preferir ruta de backend optimizada si está disponible
      const { data } = await api.get('/products/alerts/low-stock', {
        params: threshold ? { threshold } : undefined
      })

      const items = data?.products || data?.data || []
      const count = Array.isArray(items) ? items.length : 0

      return NextResponse.json({ success: true, products: items, data: items, count })
    } catch (err: any) {
      // Fallback seguro en desarrollo o si no hay backend
      const isDev = process.env.NODE_ENV !== 'production'
      if (isDev) {
        return NextResponse.json({ success: true, products: [], data: [], count: 0 })
      }
      const status = err?.response?.status ?? 500
      const details = err?.response?.data ?? getErrorMessage(err)
      return NextResponse.json(
        { error: status === 500 ? 'Internal server error' : `Backend error: ${status}`, details },
        { status }
      )
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}