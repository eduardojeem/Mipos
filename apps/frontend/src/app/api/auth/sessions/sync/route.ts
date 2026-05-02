import { NextRequest, NextResponse } from 'next/server'
import {
  deactivateCurrentSession,
  syncCurrentSession,
} from '@/app/api/admin/_services/sessions'
import { createClient } from '@/lib/supabase/server'

function resolveExpiresAt(expiresAt?: number | null): string | null {
  if (!expiresAt || !Number.isFinite(expiresAt)) return null
  return new Date(expiresAt * 1000).toISOString()
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: { session } } = await supabase.auth.getSession()
    const result = await syncCurrentSession({
      userId: user.id,
      accessToken: session?.access_token,
      refreshToken: session?.refresh_token,
      expiresAt: resolveExpiresAt(session?.expires_at),
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '',
      userAgent: request.headers.get('user-agent') || '',
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ ok: true, sessionKey: result.sessionKey })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No se pudo sincronizar la sesion' },
      { status: 500 }
    )
  }
}

export async function DELETE(_request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: { session } } = await supabase.auth.getSession()
    const result = await deactivateCurrentSession({
      userId: user.id,
      accessToken: session?.access_token,
      refreshToken: session?.refresh_token,
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No se pudo cerrar la sesion actual' },
      { status: 500 }
    )
  }
}
