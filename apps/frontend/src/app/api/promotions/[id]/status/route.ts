import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isSupabaseActive } from '@/lib/env'

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const nextActive = !!body?.isActive
    if (isSupabaseActive()) {
      const supabase = await createClient()
      const { data: userData } = await (supabase as any).auth.getUser()
      const { error } = await (supabase as any)
        .from('promotions')
        .update({ is_active: nextActive })
        .eq('id', id)
      if (error) return NextResponse.json({ success: false, message: 'Error al actualizar estado' }, { status: 500 })
      const uid = userData?.user?.id ? String(userData.user.id) : 'system'
      await (supabase as any)
        .from('audit_logs')
        .insert({ user_id: uid, action: 'promotion_status_updated', resource: 'promotion', details: { id, isActive: nextActive } })
      return NextResponse.json({ success: true })
    }
    return NextResponse.json({ success: false, message: 'Supabase no configurado' }, { status: 500 })
  } catch {
    return NextResponse.json({ success: false, message: 'Error interno' }, { status: 500 })
  }
}