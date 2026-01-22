import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const events = Array.isArray(body?.events) ? body.events : []

    if (events.length === 0) {
      return NextResponse.json({ success: true, count: 0 }, { status: 201 })
    }

    let supabase
    try {
      supabase = createAdminClient()
    } catch (clientError) {
      // Si Supabase no está configurado, tratamos el batch como éxito no crítico
      return NextResponse.json(
        { success: true, count: events.length, note: 'Supabase no configurado, auditoría omitida' },
        { status: 201 }
      )
    }

    const { error } = await supabase
      .from('catalog_audit_logs')
      .insert(
        events.map((event: any) => ({
          event_type: event.eventType,
          resource_type: event.resourceType,
          resource_id: event.resourceId || null,
          details: event.details || {},
          session_id: event.sessionId || null,
          ip_address: 'frontend',
          user_agent: request.headers.get('user-agent') || null,
          created_at: new Date().toISOString(),
        }))
      )

    if (error) {
      // No críticamente, devolvemos éxito para no romper UI
      console.warn('[API/Catalog/Audit] Batch insert warning:', error)
      return NextResponse.json({ success: true, count: events.length }, { status: 201 })
    }

    return NextResponse.json({ success: true, count: events.length }, { status: 201 })
  } catch (error) {
    // Error crítico de parseo; aún así devolvemos éxito para evitar ruido en cliente
    console.warn('[API/Catalog/Audit] Batch handler error:', error)
    return NextResponse.json({ success: true, count: 0 }, { status: 201 })
  }
}

