import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) return NextResponse.json({ error: 'Falta configuración de Supabase' }, { status: 500 })

    const svc = createServiceClient(url as string, serviceKey as string)

    const roleName = 'CASHIER'
    let { data: rolesData, error: rolesErr } = await svc.from('roles').select('id,name').eq('name', roleName).limit(1)
    if (rolesErr) return NextResponse.json({ error: rolesErr.message }, { status: 500 })
    if (!rolesData || rolesData.length === 0) {
      const { error: upErr } = await svc.from('roles').upsert([{ name: roleName }], { onConflict: 'name' })
      if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })
      const r2 = await svc.from('roles').select('id,name').eq('name', roleName).limit(1)
      if (r2.error || !r2.data || r2.data.length === 0) return NextResponse.json({ error: r2.error?.message || 'No se pudo obtener rol' }, { status: 500 })
      rolesData = r2.data
    }
    const roleId = rolesData[0].id

    const permName = 'cash:open'
    let { data: permData, error: permErr } = await svc.from('permissions').select('id,name,resource,action').eq('name', permName).limit(1)
    if (permErr) return NextResponse.json({ error: permErr.message }, { status: 500 })
    if (!permData || permData.length === 0) {
      const { error: upPErr } = await svc.from('permissions').upsert([{ name: permName, resource: 'cash', action: 'open' }], { onConflict: 'name' })
      if (upPErr) return NextResponse.json({ error: upPErr.message }, { status: 500 })
      const p2 = await svc.from('permissions').select('id,name,resource,action').eq('name', permName).limit(1)
      if (p2.error || !p2.data || p2.data.length === 0) return NextResponse.json({ error: p2.error?.message || 'No se pudo obtener permiso' }, { status: 500 })
      permData = p2.data
    }
    const permId = permData[0].id

    const { error: rpErr } = await svc.from('role_permissions').upsert([{ role_id: roleId, permission_id: permId }], { onConflict: 'role_id,permission_id' })
    if (rpErr) return NextResponse.json({ error: rpErr.message }, { status: 500 })

    const { error: urErr } = await svc.from('user_roles').upsert([{ user_id: user.id, role_id: roleId, is_active: true }], { onConflict: 'user_id,role_id' })
    if (urErr) return NextResponse.json({ error: urErr.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error' }, { status: 500 })
  }
}

