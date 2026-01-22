import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const adminClient = await createAdminClient()
  
  // Use admin client to bypass RLS and avoid ambiguous relationships by manual joining
  const { data: userRoles, error: urError } = await adminClient
    .from('user_roles')
    .select('id, role_id, is_active, expires_at')
    .eq('user_id', user.id)
    .eq('is_active', true)

  if (urError) {
    console.error('Error fetching user roles:', urError)
    // Fallback to user metadata role
    const metaRoleName = (user.user_metadata as any)?.role
    if (metaRoleName) {
      const metaRole = {
        id: 'meta-role',
        name: String(metaRoleName).toUpperCase(),
        display_name: String(metaRoleName),
        description: 'Rol derivado de metadatos del usuario'
      }
      return NextResponse.json([
        {
          id: 'meta-user-role',
          role_id: 'meta-role',
          role: metaRole,
          is_active: true,
          expires_at: null
        }
      ])
    }
    return NextResponse.json([])
  }

  if (!userRoles || userRoles.length === 0) {
      return NextResponse.json([])
  }

  const roleIds = userRoles.map((ur: any) => ur.role_id)
  const { data: rolesData, error: rError } = await adminClient
    .from('roles')
    .select('id, name, display_name, description')
    .in('id', roleIds)
  
  if (rError) {
      console.error('Error fetching roles details:', rError)
      // Fallback to metadata role if available
      const metaRoleName = (user.user_metadata as any)?.role
      if (metaRoleName) {
        const metaRole = {
          id: 'meta-role',
          name: String(metaRoleName).toUpperCase(),
          display_name: String(metaRoleName),
          description: 'Rol derivado de metadatos del usuario'
        }
        return NextResponse.json([
          {
            id: 'meta-user-role',
            role_id: 'meta-role',
            role: metaRole,
            is_active: true,
            expires_at: null
          }
        ])
      }
      return NextResponse.json([])
  }

  const rolesMap = new Map(rolesData?.map((r: any) => [r.id, r]) || [])
  
  const roles = userRoles.map((ur: any) => {
      const role = rolesMap.get(ur.role_id)
      if (!role) return null
      return {
          ...ur,
          role: role
      }
  }).filter(Boolean)

  // Filter expired roles
  const activeRoles = roles.filter((role: any) => {
    if (!role.expires_at) return true
    return new Date(role.expires_at) > new Date()
  })

  return NextResponse.json(activeRoles)
}
