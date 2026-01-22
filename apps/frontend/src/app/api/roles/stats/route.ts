import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { assertAdmin } from '@/app/api/_utils/auth'

export async function GET(request: NextRequest) {
  const auth = await assertAdmin(request)
  if (!('ok' in auth) || auth.ok === false) {
    return NextResponse.json(auth.body, { status: auth.status })
  }

  try {
    const supabase = await createAdminClient()

    // Get total roles count
    const { count: totalRoles, error: totalError } = await supabase
      .from('roles')
      .select('*', { count: 'exact', head: true })

    if (totalError) throw totalError

    // Get active roles count
    const { count: activeRoles, error: activeError } = await supabase
      .from('roles')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    if (activeError) throw activeError

    // Get inactive roles count
    const inactiveRoles = (totalRoles || 0) - (activeRoles || 0)

    // Get system roles count
    const { data: systemRolesData, error: systemError } = await supabase
      .from('roles')
      .select('name')
      .in('name', ['ADMIN', 'admin', 'SUPER_ADMIN', 'super_admin'])

    if (systemError) throw systemError

    const systemRoles = systemRolesData?.length || 0
    const customRoles = (totalRoles || 0) - systemRoles

    // Get total permissions count
    const { count: totalPermissions, error: permError } = await supabase
      .from('permissions')
      .select('*', { count: 'exact', head: true })

    if (permError) throw permError

    // Get role usage data
    const { data: roleUsage, error: usageError } = await supabase
      .from('roles')
      .select('id, name, display_name')

    if (usageError) throw usageError

    let mostUsedRole = 'N/A'
    let leastUsedRole = 'N/A'
    let maxUsers = 0
    let minUsers = Infinity

    if (roleUsage && roleUsage.length > 0) {
      // Get user counts for each role
      for (const role of roleUsage) {
        const { count: userCount } = await supabase
          .from('user_roles')
          .select('*', { count: 'exact', head: true })
          .eq('role_id', role.id)
        
        const count = userCount || 0
        
        if (count > maxUsers) {
          maxUsers = count
          mostUsedRole = role.display_name || role.name
        }
        
        if (count < minUsers) {
          minUsers = count
          leastUsedRole = role.display_name || role.name
        }
      }

      if (minUsers === Infinity) {
        minUsers = 0
        leastUsedRole = 'N/A'
      }
    }

    const stats = {
      total: totalRoles || 0,
      active: activeRoles || 0,
      inactive: inactiveRoles,
      systemRoles,
      customRoles,
      totalPermissions: totalPermissions || 0,
      mostUsedRole,
      leastUsedRole,
      averagePermissionsPerRole: totalRoles ? Math.round((totalPermissions || 0) / totalRoles) : 0,
      roleDistribution: {
        system: systemRoles,
        custom: customRoles,
        active: activeRoles || 0,
        inactive: inactiveRoles
      }
    }

    return NextResponse.json(stats)
  } catch (error: any) {
    console.error('Error fetching role stats:', error)
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}