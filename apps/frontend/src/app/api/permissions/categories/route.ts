import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { ADMIN_API_ACCESS, requireAdminApiAccess } from '@/app/api/admin/_utils/access'

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
  const access = await requireAdminApiAccess(request, {
    ...ADMIN_API_ACCESS.manageRoles,
    requireOrganization: true,
  })
  if (!access.ok) return access.response

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
