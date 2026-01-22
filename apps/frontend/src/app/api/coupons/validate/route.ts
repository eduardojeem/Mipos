import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function isDevMockMode() {
  const hasSupabaseEnv = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const isDev = process.env.NODE_ENV === 'development'
  return isDev && (!hasSupabaseEnv || process.env.MOCK_AUTH === 'true')
}

function buildCouponFallback(body: any) {
  const code = String(body?.code ?? '').trim().toUpperCase()
  const subtotal = typeof body?.subtotal === 'number' ? body.subtotal : Number(body?.subtotal ?? 0)

  if (!code) {
    return { error: true, status: 400, payload: { message: 'Código de cupón requerido' } }
  }

  // Reglas simples de demo para desarrollo
  const rules: Record<string, { type: 'PERCENTAGE' | 'FIXED_AMOUNT'; amount: number }> = {
    'DEMO10': { type: 'PERCENTAGE', amount: 0.10 },
    'TEST10': { type: 'PERCENTAGE', amount: 0.10 },
    'WELCOME5': { type: 'FIXED_AMOUNT', amount: 5 },
    'DEMO5': { type: 'FIXED_AMOUNT', amount: 5 },
    'VIP10': { type: 'PERCENTAGE', amount: 0.10 },
  }

  const rule = rules[code]
  if (!rule) {
    return { error: true, status: 400, payload: { message: 'Cupón inválido' } }
  }

  const discountAmount = rule.type === 'PERCENTAGE'
    ? Math.max(0, Math.round(((subtotal || 0) * rule.amount + Number.EPSILON) * 100) / 100)
    : rule.amount

  return {
    error: false,
    status: 200,
    payload: {
      data: {
        code,
        discountAmount,
        discountType: rule.type,
      }
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    // Obtener sesión de Supabase
    const supabase = await createClient()
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    // En desarrollo, usar token mock si no hay sesión
    let authToken: string | null = null
    const isMockAuth = !session || !!sessionError
    if (!isMockAuth) {
      authToken = session!.access_token
    } else {
      authToken = 'mock-token'
      console.log('🔧 Using mock token for development')
    }

    // Cuerpo de la petición
    const body = await request.json()

    // Reenviar al backend
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'
    const url = `${backendUrl}/coupons/validate`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
      ...(isMockAuth ? { 'x-user-id': 'mock-user-id', 'x-user-role': 'admin' } : {})
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      cache: 'no-store'
    })

    if (!response.ok) {
      // Si estamos en modo desarrollo/mock, devolver un fallback local
      if (isDevMockMode()) {
        const fallback = buildCouponFallback(body)
        return NextResponse.json(fallback.payload, { status: fallback.status })
      }
      const contentType = response.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        const errJson = await response.json()
        return NextResponse.json(errJson, { status: response.status })
      } else {
        const errorData = await response.text()
        return NextResponse.json(
          { error: `Backend error: ${response.status}`, details: errorData },
          { status: response.status }
        )
      }
    }

    const data = await response.json()
    return NextResponse.json(data)

  } catch (error) {
    console.error('Error in coupons/validate API route:', error)
    // Fallback local en desarrollo/mock ante errores de red
    if (isDevMockMode()) {
      try {
        const body = await request.json()
        const fallback = buildCouponFallback(body)
        return NextResponse.json(fallback.payload, { status: fallback.status })
      } catch (e) {
        // Si no se pudo leer el body por segunda vez, retornar inválido
        return NextResponse.json({ message: 'Cupón inválido' }, { status: 400 })
      }
    }
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}