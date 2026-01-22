import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { assertAdmin } from '@/app/api/_utils/auth'

export async function GET(request: NextRequest) {
  const auth = await assertAdmin(request)
  if (!('ok' in auth) || auth.ok === false) {
    return NextResponse.json(auth.body, { status: auth.status })
  }

  const searchParams = request.nextUrl.searchParams
  const format = searchParams.get('format') || 'json'

  try {
    const supabase = await createAdminClient()

    // Get all roles with their permissions
    const { data: rolesData, error } = await supabase
      .from('roles')
      .select('*')

    if (error) throw error

    // Get all permissions and role_permissions
    const { data: allPermissions } = await supabase.from('permissions').select('*')
    const { data: allRolePermissions } = await supabase.from('role_permissions').select('*')

    const permissionsMap = new Map(allPermissions?.map((p: any) => [p.id, p]) || [])

    const exportData = rolesData?.map((role: any) => {
      const rolePerms = allRolePermissions?.filter((rp: any) => rp.role_id === role.id) || []
      const permissions = rolePerms.map((rp: any) => {
        const p = permissionsMap.get(rp.permission_id)
        return p ? {
          id: (p as any).id,
          name: (p as any).name,
          displayName: (p as any).display_name,
          resource: (p as any).resource,
          action: (p as any).action,
          description: (p as any).description
        } : null
      }).filter(Boolean as any)

      return {
        id: role.id,
        name: role.name,
        displayName: role.display_name,
        description: role.description,
        isActive: role.is_active,
        priority: role.priority,
        parentRoleId: role.parent_role_id,
        permissions,
        createdAt: role.created_at,
        updatedAt: role.updated_at
      }
    }) || []

    if (format === 'csv') {
      // Convert to CSV format
      const csvHeaders = [
        'ID', 'Name', 'Display Name', 'Description', 'Is Active', 
        'Priority', 'Parent Role ID', 'Permissions Count', 'Created At'
      ]
      
      const csvRows = exportData.map((role: any) => [
        role.id,
        role.name,
        role.displayName,
        role.description || '',
        role.isActive,
        role.priority || 0,
        role.parentRoleId || '',
        role.permissions.length,
        role.createdAt
      ])

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map((row: any[]) => row.map((cell: any) => `"${cell}"`).join(','))
      ].join('\n')

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="roles-export-${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    }

    // JSON format
    const jsonContent = JSON.stringify({
      exportDate: new Date().toISOString(),
      version: '1.0',
      totalRoles: exportData.length,
      roles: exportData
    }, null, 2)

    return new NextResponse(jsonContent, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="roles-export-${new Date().toISOString().split('T')[0]}.json"`
      }
    })

  } catch (error: any) {
    console.error('Error exporting roles:', error)
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}
