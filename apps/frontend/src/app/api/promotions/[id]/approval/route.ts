import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isSupabaseActive } from '@/lib/env'

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const status = String(body?.status || '').toLowerCase()
    const comment = typeof body?.comment === 'string' ? body.comment : null
    const map: any = { approved: 'approved', rejected: 'rejected', pending: 'pending' }
    const approvalStatus = map[status] || 'pending'
    if (isSupabaseActive()) {
      const supabase = await createClient()
      const { data: userData } = await (supabase as any).auth.getUser()
      const { error } = await (supabase as any)
        .from('promotions')
        .update({ approval_status: approvalStatus, approval_comment: comment })
        .eq('id', id)
      if (error) return NextResponse.json({ success: false, message: 'Error al actualizar aprobación' }, { status: 500 })
      await (supabase as any)
        .from('audit_logs')
        .insert({ 
          user_id: userData?.user?.id || null, 
          table_name: 'promotions',
          record_id: id,
          action: 'APPROVAL_UPDATED', 
          changes: { status: approvalStatus, comment } 
        }).catch(() => {})
      return NextResponse.json({ success: true })
    }
    return NextResponse.json({ success: false, message: 'Supabase no configurado' }, { status: 500 })
  } catch {
    return NextResponse.json({ success: false, message: 'Error interno' }, { status: 500 })
  }
}