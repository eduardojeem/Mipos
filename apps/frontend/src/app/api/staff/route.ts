import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { getValidatedOrganizationId } from '@/lib/organization'
import { getPlanEntitlements, hasPlanFeature, isPlanLimitReached } from '@/app/api/_utils/plan-entitlements'
import { STAFF_COLUMNS, parseStaffBody, parseWorkingHours, type WorkingHourInput } from '@/lib/barbershop/staff-validation'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await (supabase as any).auth.getUser()
    if (!user || userError) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const orgId = (await getValidatedOrganizationId(request)) || ''
    if (!orgId) return NextResponse.json({ error: 'Organization header missing' }, { status: 400 })

    const admin = await createAdminClient()
    const { data: staff, error } = await (admin as any)
      .from('staff_profiles')
      .select(STAFF_COLUMNS)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching staff:', error)
      return NextResponse.json({ error: 'No se pudieron obtener los profesionales', details: error.message }, { status: 500 })
    }

    const rows = (staff || []) as Array<Record<string, any>>
    const userIds = rows.map((r) => r.user_id).filter(Boolean)
    const staffIds = rows.map((r) => r.id).filter(Boolean)

    // Datos del usuario asociado (nombre, email)
    const usersMap = new Map<string, { full_name: string; email: string }>()
    if (userIds.length) {
      const { data: users } = await (admin as any)
        .from('users')
        .select('id, full_name, email')
        .in('id', userIds)
      for (const u of (users || []) as Array<any>) {
        usersMap.set(u.id, { full_name: u.full_name, email: u.email })
      }
    }

    // Horarios por profesional
    const hoursMap = new Map<string, WorkingHourInput[]>()
    if (staffIds.length) {
      const { data: hours } = await (admin as any)
        .from('staff_working_hours')
        .select('staff_profile_id, day_of_week, start_time, end_time')
        .in('staff_profile_id', staffIds)
        .order('day_of_week', { ascending: true })
      for (const h of (hours || []) as Array<any>) {
        const list = hoursMap.get(h.staff_profile_id) || []
        list.push({ day_of_week: h.day_of_week, start_time: h.start_time, end_time: h.end_time })
        hoursMap.set(h.staff_profile_id, list)
      }
    }

    const staffWithDetails = rows.map((r) => ({
      ...r,
      user: usersMap.get(r.user_id) || null,
      working_hours: hoursMap.get(r.id) || [],
    }))

    return NextResponse.json({ success: true, staff: staffWithDetails })
  } catch (error) {
    console.error('Unexpected error in staff GET:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await (supabase as any).auth.getUser()
    if (!user || userError) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const orgId = (await getValidatedOrganizationId(request)) || ''
    if (!orgId) return NextResponse.json({ error: 'Organization header missing' }, { status: 400 })

    const raw = await request.json()
    const targetUserId = String(raw?.user_id || '').trim()
    if (!targetUserId) return NextResponse.json({ error: 'Debe seleccionar un usuario' }, { status: 400 })

    const parsed = parseStaffBody(raw)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const hours = parseWorkingHours(raw?.working_hours)
    if (!hours.ok) return NextResponse.json({ error: hours.error }, { status: 400 })

    const admin = await createAdminClient()
    const entitlements = await getPlanEntitlements(orgId)
    if (!hasPlanFeature(entitlements, 'staff_management')) {
      return NextResponse.json({ error: 'La gestion de profesionales no esta incluida en tu plan' }, { status: 403 })
    }

    const { count: staffCount, error: countError } = await (admin as any)
      .from('staff_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)

    if (countError) {
      console.error('Error checking staff plan limit:', countError)
      return NextResponse.json({ error: 'No se pudo validar el limite de profesionales' }, { status: 500 })
    }

    if (isPlanLimitReached(Number(staffCount || 0), entitlements.limits.maxStaff)) {
      return NextResponse.json({
        error: `Tu plan permite hasta ${entitlements.limits.maxStaff} profesionales. Actualiza el plan para sumar mas.`,
      }, { status: 403 })
    }

    // El usuario debe pertenecer a la organización
    const { data: member } = await (admin as any)
      .from('users')
      .select('id')
      .eq('id', targetUserId)
      .eq('organization_id', orgId)
      .maybeSingle()

    if (!member) return NextResponse.json({ error: 'El usuario no pertenece a esta organización' }, { status: 400 })

    // No duplicar ficha para el mismo usuario
    const { data: existing } = await (admin as any)
      .from('staff_profiles')
      .select('id')
      .eq('organization_id', orgId)
      .eq('user_id', targetUserId)
      .maybeSingle()

    if (existing) return NextResponse.json({ error: 'Ese usuario ya es un profesional' }, { status: 409 })

    const { data: created, error } = await (admin as any)
      .from('staff_profiles')
      .insert([{ ...parsed.value, user_id: targetUserId, organization_id: orgId }])
      .select(STAFF_COLUMNS)
      .single()

    if (error) return NextResponse.json({ error: 'No se pudo crear el profesional', details: error.message }, { status: 500 })

    if (hours.value.length) {
      const rows = hours.value.map((h) => ({ ...h, staff_profile_id: created.id, organization_id: orgId }))
      const { error: hoursError } = await (admin as any).from('staff_working_hours').insert(rows)
      if (hoursError) console.warn('Error inserting working hours:', hoursError.message)
    }

    return NextResponse.json({ success: true, staff: created }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in staff POST:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
