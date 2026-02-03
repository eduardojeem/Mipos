import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const admin = await createAdminClient()

    let isSuperAdmin = false
    let resolvedRole: string | null = null
    let source: string = 'none'

    type UserRoleRow = { role?: { name?: string } | null }
    const { data: userRoles } = await admin
      .from('user_roles')
      .select('role:roles(name)')
      .eq('user_id', user.id)
      .eq('is_active', true)
    if (Array.isArray(userRoles) && userRoles.some((ur: UserRoleRow) => ur.role?.name === 'SUPER_ADMIN')) {
      isSuperAdmin = true
      resolvedRole = 'SUPER_ADMIN'
      source = 'user_roles'
    }

    if (!isSuperAdmin) {
      const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single()
      if (userData?.role === 'SUPER_ADMIN') {
        isSuperAdmin = true
        resolvedRole = 'SUPER_ADMIN'
        source = 'users.role'
      }
    }

    if (!isSuperAdmin) {
      const metaRole = (user.user_metadata as { role?: string } | null)?.role
      if (metaRole === 'SUPER_ADMIN') {
        isSuperAdmin = true
        resolvedRole = 'SUPER_ADMIN'
        source = 'user_metadata.role'
      }
    }

    return NextResponse.json({ success: true, isSuperAdmin, role: resolvedRole, source })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
