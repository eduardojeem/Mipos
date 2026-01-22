import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Authenticate user
    const supabaseAuth = await createClient()
    const { data: { user } } = await supabaseAuth.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'No autorizado' },
        { status: 401 }
      )
    }

    // Use admin client to query audit logs (requires specific permissions or admin)
    // The RPC get_carousel_audit_log is SECURITY DEFINER so it can be called by authenticated users
    let supabase
    try {
      supabase = createAdminClient()
    } catch (clientError) {
      return NextResponse.json(
        { success: false, message: 'Error de configuración', error: String(clientError) },
        { status: 500 }
      )
    }

    const { data, error } = await supabase.rpc('get_carousel_audit_log', {
      p_limit: limit,
      p_offset: offset
    })

    if (error) {
      console.error('[API/Carousel/Audit] Error:', error)
      return NextResponse.json(
        { success: false, message: 'Error al cargar el historial', error: error.message },
        { status: 500 }
      )
    }

    // Map snake_case to camelCase for frontend
    const logs = (data || []).map((log: any) => ({
      id: log.id,
      userId: log.user_id,
      userName: log.user_email, // The RPC returns email as userName
      action: log.action,
      previousState: log.previous_state,
      newState: log.new_state,
      ipAddress: log.ip_address,
      userAgent: log.user_agent,
      metadata: log.metadata,
      createdAt: log.created_at
    }))

    return NextResponse.json({ success: true, logs })
  } catch (error) {
    console.error('[API/Carousel/Audit] Critical Error:', error)
    return NextResponse.json(
      { success: false, message: 'Error interno', error: String(error) },
      { status: 500 }
    )
  }
}
