import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { assertAdmin } from '@/app/api/_utils/auth'

export async function GET(request: NextRequest) {
  const auth = await assertAdmin(request)
  if (!('ok' in auth) || auth.ok === false) {
    return NextResponse.json(auth.body, { status: auth.status })
  }

  const searchParams = request.nextUrl.searchParams
  const roleId = searchParams.get('roleId')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  try {
    const supabase = await createAdminClient()

    let query = supabase
      .from('role_audit_log')
      .select(`
        *,
        roles!role_id (
          name,
          display_name
        ),
        users!user_id (
          email,
          raw_user_meta_data
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (roleId) {
      query = query.eq('role_id', roleId)
    }

    const { data: auditLogs, error } = await query

    if (error) throw error

    const formattedLogs = auditLogs?.map((log: any) => {
      const user = log.users
      const userData = user?.raw_user_meta_data || {}
      
      return {
        id: log.id,
        roleId: log.role_id,
        roleName: log.roles?.display_name || log.roles?.name,
        action: log.action,
        changes: log.changes,
        userId: log.user_id,
        userEmail: user?.email,
        userName: `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
        timestamp: log.created_at,
        ipAddress: log.ip_address,
        userAgent: log.user_agent
      }
    }) || []

    return NextResponse.json(formattedLogs)
  } catch (error: any) {
    console.error('Error fetching audit logs:', error)
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await assertAdmin(request)
  if (!('ok' in auth) || auth.ok === false) {
    return NextResponse.json(auth.body, { status: auth.status })
  }

  try {
    const body = await request.json()
    const { roleId, action, changes, userId } = body

    if (!roleId || !action || !userId) {
      return NextResponse.json({ message: 'Datos requeridos faltantes' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    // Get client IP and user agent from headers
    const forwarded = request.headers.get('x-forwarded-for')
    const ipAddress = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    const { data: auditLog, error } = await supabase
      .from('role_audit_log')
      .insert({
        role_id: roleId,
        action,
        changes: changes || {},
        user_id: userId,
        ip_address: ipAddress,
        user_agent: userAgent
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(auditLog)
  } catch (error: any) {
    console.error('Error creating audit log:', error)
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}