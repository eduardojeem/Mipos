import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // Obtener sesión de Supabase
    const supabase = await createClient()
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (!session || sessionError) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Cuerpo de la petición
    const body = await request.json()

    // Reenviar al backend
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'
    const url = `${backendUrl}/coupons/validate`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      cache: 'no-store'
    })

    if (!response.ok) {
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
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
