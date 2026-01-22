import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { assertAdmin } from '@/app/api/_utils/auth'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await assertAdmin(request)
  if (!('ok' in auth) || auth.ok === false) {
    return NextResponse.json(auth.body, { status: auth.status })
  }

  const { id } = await params

  try {
    const body = await request.json()
    const { name, displayName } = body

    if (!name || !displayName) {
      return NextResponse.json({ message: 'Nombre y Nombre a mostrar son requeridos' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    // 1. Get source role
    const { data: sourceRole, error: sourceError } = await supabase
        .from('roles')
        .select('*')
        .eq('id', id)
        .single()
    
    if (sourceError || !sourceRole) {
        return NextResponse.json({ message: 'Rol origen no encontrado' }, { status: 404 })
    }

    // 2. Get source permissions
    const { data: sourcePerms } = await supabase
        .from('role_permissions')
        .select('permission_id')
        .eq('role_id', id)

    // 3. Validate unique name
    const { data: existingByName } = await supabase
        .from('roles')
        .select('id')
        .eq('name', name)

    if (existingByName && existingByName.length > 0) {
        return NextResponse.json({ message: 'Nombre de rol ya existe' }, { status: 409 })
    }

    // 4. Create new role
    const { data: newRole, error: createError } = await supabase
        .from('roles')
        .insert({
            name,
            display_name: displayName,
            description: `Copia de ${sourceRole.display_name}`,
            is_active: true
        })
        .select()
        .single()
    
    if (createError) throw createError

    // 5. Copy permissions
    let mappedPermissions: any[] = []
    if (sourcePerms && sourcePerms.length > 0) {
        const permInserts = sourcePerms.map((sp: any) => ({
            role_id: newRole.id,
            permission_id: sp.permission_id
        }))

        const { error: permError } = await supabase
            .from('role_permissions')
            .insert(permInserts)
        
        if (permError) throw permError

        // Fetch permission details for response
        const pIds = sourcePerms.map((sp: any) => sp.permission_id)
        const { data: perms } = await supabase
            .from('permissions')
            .select('*')
            .in('id', pIds)
        
        mappedPermissions = perms?.map((p: any) => ({
            id: p.id,
            name: p.name,
            displayName: p.display_name,
            resource: p.resource,
            action: p.action,
            category: p.resource,
            isSystem: false,
            createdAt: p.created_at
        })) || []
    }

    const role = {
        id: newRole.id,
        name: newRole.name,
        displayName: newRole.display_name,
        description: newRole.description,
        permissions: mappedPermissions,
        userCount: 0,
        isActive: newRole.is_active,
        isSystem: false,
        priority: 0,
        createdAt: newRole.created_at,
        updatedAt: newRole.updated_at
    }

    return NextResponse.json(role)

  } catch (e: any) {
    console.error('Error cloning role:', e)
    return NextResponse.json({ message: e.message || 'Error al clonar rol' }, { status: 500 })
  }
}
