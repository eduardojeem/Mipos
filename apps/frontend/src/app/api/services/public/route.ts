import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getPublicOrgId } from '@/lib/barbershop/public'

/**
 * GET /api/services/public
 * Servicios ACTIVOS de la barbería (para la página pública de reservas).
 * Resuelve la org por el contexto del tenant (header) o ?organizationId.
 */
export async function GET(request: NextRequest) {
  try {
    const orgId = getPublicOrgId(request)
    if (!orgId) return NextResponse.json({ success: true, services: [] })

    const admin = await createAdminClient()
    const { data, error } = await (admin as any)
      .from('services')
      .select('id, name, description, duration_min, price, category, color')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching public services:', error)
      return NextResponse.json({ error: 'No se pudieron obtener los servicios' }, { status: 500 })
    }

    return NextResponse.json({ success: true, services: data || [] })
  } catch (error) {
    console.error('Unexpected error in services/public GET:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
