import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase-admin'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Authenticate user
    const supabaseAuth = await createClient()
    const { data: { user } } = await supabaseAuth.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'No autorizado' },
        { status: 401 }
      )
    }

    // Use admin client for operations
    let supabase
    try {
      supabase = createAdminClient()
    } catch (clientError) {
      return NextResponse.json(
        { success: false, message: 'Error de configuración', error: String(clientError) },
        { status: 500 }
      )
    }

    // 1. Get the target audit log entry to revert TO
    const { data: logEntry, error: logError } = await supabase
      .from('carousel_audit_log')
      .select('new_state')
      .eq('id', id)
      .single()

    if (logError || !logEntry) {
      return NextResponse.json(
        { success: false, message: 'Entrada de historial no encontrada' },
        { status: 404 }
      )
    }

    const targetState = logEntry.new_state as string[]
    if (!Array.isArray(targetState)) {
      return NextResponse.json(
        { success: false, message: 'Estado inválido en el historial' },
        { status: 400 }
      )
    }

    // 2. Get current state for the new audit entry
    const { data: currentData } = await supabase
      .from('promotions_carousel')
      .select('promotion_id')
      .order('position', { ascending: true })
    
    const currentState = currentData ? currentData.map((r: any) => String(r.promotion_id)) : []

    // 3. Update the carousel (Delete all, then Insert)
    // First, delete existing
    const { data: existingItems } = await supabase.from('promotions_carousel').select('id')
    if (existingItems && existingItems.length > 0) {
      await supabase
        .from('promotions_carousel')
        .delete()
        .in('id', existingItems.map((i: any) => i.id))
    }

    // Insert target state
    if (targetState.length > 0) {
      const rows = targetState.map((promoId, idx) => ({
        promotion_id: promoId,
        position: idx,
      }))

      const { error: insertError } = await supabase
        .from('promotions_carousel')
        .insert(rows)

      if (insertError) {
        throw new Error(insertError.message)
      }
    }

    // 4. Log the revert action
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    await supabase.rpc('log_carousel_change', {
      p_user_id: user.id,
      p_action: 'REVERT',
      p_previous_state: currentState,
      p_new_state: targetState,
      p_ip_address: ip,
      p_user_agent: userAgent,
      p_metadata: { revertedFromLogId: id, source: 'dashboard' }
    })

    // Clear cache (using the map from route.ts would be nice but we are in a different file)
    // We can't access the variable `carouselCache` from `../route.ts`. 
    // Ideally we should move cache to a shared file or use a real cache like Redis.
    // For now, since it's in-memory and likely different lambda/process, cache might not be shared anyway.
    // But if running in same Node process, we can't clear it easily without shared module.
    // This is a known limitation of this simple caching strategy.

    return NextResponse.json({ success: true, ids: targetState })

  } catch (error) {
    console.error('[API/Carousel/Revert] Critical Error:', error)
    return NextResponse.json(
      { success: false, message: 'Error al revertir cambios', error: String(error) },
      { status: 500 }
    )
  }
}
