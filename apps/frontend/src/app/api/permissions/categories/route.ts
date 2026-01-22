import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { assertAdmin } from '@/app/api/_utils/auth'

function toDisplay(name: string) {
  const n = name?.toLowerCase() || ''
  if (n === 'users') return 'Usuarios'
  if (n === 'products') return 'Productos'
  if (n === 'sales') return 'Ventas'
  if (n === 'reports') return 'Reportes'
  if (n === 'settings') return 'Configuración'
  if (n === 'system') return 'Sistema'
  return name
}

export async function GET(request: NextRequest) {
  const auth = await assertAdmin(request)
  if (!('ok' in auth) || auth.ok === false) {
    return NextResponse.json(auth.body, { status: auth.status })
  }

  const supabase = await createAdminClient()
  const { data, error } = await supabase.from('permissions').select('*')
  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  const groups: Record<string, any[]> = {}
  for (const p of data || []) {
    const key = p.resource || 'system'
    if (!groups[key]) groups[key] = []
    groups[key].push({
      id: p.id,
      name: p.name,
      displayName: p.display_name,
      description: p.description,
      resource: p.resource,
      action: p.action,
      category: p.resource,
      isSystem: false,
      createdAt: p.created_at
    })
  }

  const categories = Object.keys(groups).map((key) => ({
    id: key,
    name: key,
    displayName: toDisplay(key),
    description: '',
    permissions: groups[key]
  }))

  return NextResponse.json(categories)
}
