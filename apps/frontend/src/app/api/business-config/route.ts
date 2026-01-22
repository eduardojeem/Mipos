import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { assertAdmin } from '@/app/api/_utils/auth'
import { getBusinessConfigAsync, setBusinessConfigAsync, validateBusinessConfig } from '@/app/api/admin/_utils/business-config'
import { logAudit } from '@/app/api/admin/_utils/audit'

async function getActor() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { user: null, role: null }
    }
    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
    const role = (profile as any)?.role ?? (user.user_metadata as any)?.role
    return { user, role }
  } catch {
    return { user: null, role: null }
  }
}

function isAdminRole(role?: string | null) {
  const r = (role || '').toUpperCase()
  return r === 'ADMIN' || r === 'SUPER_ADMIN'
}

export async function GET() {
  // Público para lectura (usado por el sitio), sin datos sensibles
  const cfg = await getBusinessConfigAsync()
  return NextResponse.json({ success: true, config: cfg })
}

export async function PUT(request: NextRequest) {
  // Usar utilitaria centralizada para validar ADMIN, con soporte de modo mock
  const auth = await assertAdmin(request)
  if (!('ok' in auth) || auth.ok === false) {
    return NextResponse.json(auth.body, { status: auth.status })
  }

  try {
    const body = await request.json()
    const validation = validateBusinessConfig(body)
    if (!('ok' in validation) || validation.ok !== true) {
      return NextResponse.json({ success: false, errors: (validation as any).errors }, { status: 400 })
    }

    const prev = await getBusinessConfigAsync()
    const next = await setBusinessConfigAsync(body)

    // Intentar obtener usuario para auditoría; tolerar entornos mock
    try {
      const supabase = await createClient()
      const { data: { user }, error } = await (supabase as any).auth.getUser()
      logAudit('business_config.update', { entityType: 'BUSINESS_CONFIG', oldData: prev, newData: next }, {
        id: user?.id,
        email: (user as any)?.email,
        role: (user as any)?.user_metadata?.role || null
      })
    } catch {
      // Auditoría mínima si no hay usuario disponible
      logAudit('business_config.update', { entityType: 'BUSINESS_CONFIG', oldData: prev, newData: next })
    }

    return NextResponse.json({ success: true, config: next })
  } catch (error: any) {
    const message = error?.message || 'Error interno'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}