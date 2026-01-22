import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { assertAdmin } from '@/app/api/_utils/auth'

export async function POST(request: NextRequest) {
  const auth = await assertAdmin(request)
  if (!('ok' in auth) || auth.ok === false) {
    return NextResponse.json(auth.body, { status: auth.status })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ message: 'Archivo requerido' }, { status: 400 })
    }

    const fileContent = await file.text()
    let importData: any

    try {
      importData = JSON.parse(fileContent)
    } catch (parseError) {
      return NextResponse.json({ message: 'Formato de archivo inválido' }, { status: 400 })
    }

    if (!importData.roles || !Array.isArray(importData.roles)) {
      return NextResponse.json({ message: 'Estructura de datos inválida' }, { status: 400 })
    }

    const supabase = await createAdminClient()
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    }

    // Get existing permissions to validate
    const { data: existingPermissions } = await supabase.from('permissions').select('id, name')
    const permissionNameToId = new Map(existingPermissions?.map((p: any) => [p.name, p.id]) || [])

    for (const roleData of importData.roles) {
      try {
        // Validate required fields
        if (!roleData.name || !roleData.displayName) {
          results.failed++
          results.errors.push(`Rol ${roleData.name || 'sin nombre'}: Faltan campos requeridos`)
          continue
        }

        // Check if role already exists
        const { data: existingRole } = await supabase
          .from('roles')
          .select('id')
          .eq('name', roleData.name)
          .single()

        if (existingRole) {
          results.failed++
          results.errors.push(`Rol ${roleData.name}: Ya existe`)
          continue
        }

        // Create role
        const { data: newRole, error: roleError } = await supabase
          .from('roles')
          .insert({
            name: roleData.name,
            display_name: roleData.displayName,
            description: roleData.description,
            is_active: roleData.isActive !== undefined ? roleData.isActive : true,
            priority: roleData.priority || 0,
            parent_role_id: roleData.parentRoleId || null
          })
          .select()
          .single()

        if (roleError) throw roleError

        // Add permissions if provided
        if (roleData.permissions && Array.isArray(roleData.permissions)) {
          const validPermissions = roleData.permissions
            .map((perm: any) => permissionNameToId.get(perm.name))
            .filter(Boolean)

          if (validPermissions.length > 0) {
            const permissionInserts = validPermissions.map((permId: string) => ({
              role_id: newRole.id,
              permission_id: permId
            }))

            const { error: permError } = await supabase
              .from('role_permissions')
              .insert(permissionInserts)

            if (permError) {
              // Log error but don't fail the role creation
              results.errors.push(`Rol ${roleData.name}: Error al asignar permisos - ${permError.message}`)
            }
          }
        }

        results.success++
      } catch (error: any) {
        results.failed++
        results.errors.push(`Rol ${roleData.name}: ${error.message}`)
      }
    }

    return NextResponse.json(results)
  } catch (error: any) {
    console.error('Error importing roles:', error)
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}