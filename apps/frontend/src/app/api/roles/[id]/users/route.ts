import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { assertAdmin } from '@/app/api/_utils/auth'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await assertAdmin(request)
  if (!('ok' in auth) || auth.ok === false) {
    return NextResponse.json(auth.body, { status: auth.status })
  }

  const { id } = await params

  try {
    const supabase = await createAdminClient()

    // Get users assigned to this role
    const { data: userRoles, error } = await supabase
      .from('user_roles')
      .select(`
        user_id,
        created_at,
        users!inner (
          id,
          email,
          raw_user_meta_data,
          created_at,
          last_sign_in_at,
          email_confirmed_at
        )
      `)
      .eq('role_id', id)

    if (error) throw error

    const users = userRoles?.map((ur: any) => {
      const user = ur.users
      const metadata = user.raw_user_meta_data || {}
      
      return {
        id: user.id,
        firstName: metadata.firstName || metadata.first_name || '',
        lastName: metadata.lastName || metadata.last_name || '',
        email: user.email,
        isActive: !!user.email_confirmed_at,
        lastLogin: user.last_sign_in_at,
        assignedAt: ur.created_at,
        createdAt: user.created_at
      }
    }) || []

    return NextResponse.json(users)
  } catch (error: any) {
    console.error('Error fetching users by role:', error)
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}