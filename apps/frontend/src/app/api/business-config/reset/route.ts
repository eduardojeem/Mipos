import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resetBusinessConfigAsync, getBusinessConfigAsync } from '../../admin/_utils/business-config'
import { logAudit } from '../../admin/_utils/audit'

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { ok: false, status: 401 } as const
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  const role = (profile as any)?.role ?? (user.user_metadata as any)?.role
  const ok = role === 'ADMIN' || role === 'SUPER_ADMIN'
  return ok ? { ok: true, user, role } as const : { ok: false, status: 403 } as const
}

export async function POST() {
  const auth = await assertAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.status === 401 ? 'No autorizado' : 'Acceso denegado' }, { status: auth.status })
  }
  const prev = await getBusinessConfigAsync()
  const cfg = await resetBusinessConfigAsync()
  logAudit('business_config.reset', { entityType: 'BUSINESS_CONFIG', oldData: prev, newData: cfg }, {
    id: auth.user!.id,
    email: auth.user!.email,
    role: auth.role || null
  })
  return NextResponse.json({ success: true, config: cfg })
}