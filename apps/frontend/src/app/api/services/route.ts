import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { getValidatedOrganizationId } from '@/lib/organization'
import { sanitizeSearch } from '@/app/api/_utils/search'
import { getPlanEntitlements, hasPlanFeature, isPlanLimitReached } from '@/app/api/_utils/plan-entitlements'
import { SERVICE_COLUMNS, parseServiceBody } from '@/lib/barbershop/service-validation'

const MAX_PAGE_SIZE = 500

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await (supabase as any).auth.getUser()
    if (!user || userError) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const orgId = (await getValidatedOrganizationId(request)) || ''
    if (!orgId) return NextResponse.json({ error: 'Organization header missing' }, { status: 400 })

    const { searchParams } = new URL(request.url)
    const search = (searchParams.get('search') || '').trim()
    const status = (searchParams.get('status') || '').trim().toLowerCase()
    const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Number.parseInt(searchParams.get('limit') || '100', 10)))
    const from = (page - 1) * limit
    const to = from + limit - 1

    const admin = await createAdminClient()
    let query = (admin as any)
      .from('services')
      .select(SERVICE_COLUMNS, { count: 'exact' })
      .eq('organization_id', orgId)

    if (status === 'active') query = query.eq('is_active', true)
    if (status === 'inactive') query = query.eq('is_active', false)
    if (search) {
      const esc = sanitizeSearch(search)
      query = query.or(`name.ilike.%${esc}%,description.ilike.%${esc}%,category.ilike.%${esc}%`)
    }

    query = query.order('name', { ascending: true })

    const { data: services, error, count } = await query.range(from, to)

    if (error) {
      console.error('Error fetching services:', error)
      return NextResponse.json({ error: 'No se pudieron obtener los servicios', details: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      services: services || [],
      count: Number(count ?? (services?.length || 0)),
      pagination: {
        page,
        limit,
        total: Number(count ?? (services?.length || 0)),
        totalPages: Math.max(1, Math.ceil(Number(count ?? (services?.length || 0)) / limit)),
      },
    })
  } catch (error) {
    console.error('Unexpected error in services GET:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await (supabase as any).auth.getUser()
    if (!user || userError) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const orgId = (await getValidatedOrganizationId(request)) || ''
    if (!orgId) return NextResponse.json({ error: 'Organization header missing' }, { status: 400 })

    const parsed = parseServiceBody(await request.json())
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const admin = await createAdminClient()
    const entitlements = await getPlanEntitlements(orgId)
    if (!hasPlanFeature(entitlements, 'services_catalog')) {
      return NextResponse.json({ error: 'El catalogo de servicios no esta incluido en tu plan' }, { status: 403 })
    }

    const { count: serviceCount, error: countError } = await (admin as any)
      .from('services')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)

    if (countError) {
      console.error('Error checking service plan limit:', countError)
      return NextResponse.json({ error: 'No se pudo validar el limite de servicios' }, { status: 500 })
    }

    if (isPlanLimitReached(Number(serviceCount || 0), entitlements.limits.maxServices)) {
      return NextResponse.json({
        error: `Tu plan permite hasta ${entitlements.limits.maxServices} servicios. Actualiza el plan para cargar mas.`,
      }, { status: 403 })
    }

    // Nombre único por organización (case-insensitive)
    const { data: existing } = await (admin as any)
      .from('services')
      .select('id')
      .eq('organization_id', orgId)
      .ilike('name', parsed.value.name)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Ya existe un servicio con ese nombre' }, { status: 409 })
    }

    const { data, error } = await (admin as any)
      .from('services')
      .insert([{ ...parsed.value, organization_id: orgId }])
      .select(SERVICE_COLUMNS)
      .single()

    if (error) {
      return NextResponse.json({ error: 'No se pudo crear el servicio', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, service: data }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in services POST:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
