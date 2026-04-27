import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { assertSuperAdmin } from '@/app/api/_utils/auth'
import { dedupeCanonicalPlans, getCanonicalPlanDisplayName, normalizePlanSlug } from '@/lib/plan-catalog'

interface PlanLimits {
  maxUsers: number
  maxProducts: number
  maxTransactionsPerMonth: number
  maxLocations: number
}

export async function GET(request: NextRequest) {
  const auth = await assertSuperAdmin(request);
  if (!('ok' in auth) || auth.ok === false) {
      return NextResponse.json(auth.body, { status: auth.status });
  }

  try {
    const supabase = await createClient()

    const { searchParams } = new URL(request.url)
    const search = (searchParams.get('search') || '').trim()
    const status = (searchParams.get('status') || 'active').trim().toLowerCase()
    const sort = (searchParams.get('sort') || 'price_monthly_asc').trim().toLowerCase()
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const pageSize = Math.max(1, Math.min(100, parseInt(searchParams.get('pageSize') || '50', 10))) // Default 50 as per PRD
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from('saas_plans')
      .select('*', { count: 'exact' })

    if (search) {
      // Optimized search with ilike for better performance
      query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%`)
    }

    if (status === 'active') query = query.eq('is_active', true)
    if (status === 'inactive') query = query.eq('is_active', false)

    // Add timeout and optimized ordering
    let ordered = query
    if (sort === 'price_monthly_desc') ordered = ordered.order('price_monthly', { ascending: false })
    else if (sort === 'slug_asc') ordered = ordered.order('slug', { ascending: true })
    else if (sort === 'slug_desc') ordered = ordered.order('slug', { ascending: false })
    else if (sort === 'updated_at_desc') ordered = ordered.order('updated_at', { ascending: false })
    else ordered = ordered.order('price_monthly', { ascending: true })

    const { data, error, count } = await ordered
      .range(from, to)
      .limit(pageSize) // Explicit limit for better performance

    if (error) {
      // Handle table not found error gracefully
      if (error.code === '42P01') {
        console.warn('saas_plans table not found, returning empty data')
        return NextResponse.json({ plans: [], total: 0, page, pageSize })
      }
      
      // Log error for debugging but don't expose internal details
      console.error('Error fetching plans:', error)
      return NextResponse.json({ 
        error: 'Error al cargar planes del sistema',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }, { status: 500 })
    }

    const DEFAULT_LIMITS: Record<string, PlanLimits> = {
      free: { maxUsers: 2, maxProducts: 50, maxTransactionsPerMonth: 200, maxLocations: 1 },
      starter: { maxUsers: 5, maxProducts: 500, maxTransactionsPerMonth: 1000, maxLocations: 1 },
      professional: { maxUsers: 10, maxProducts: 2000, maxTransactionsPerMonth: 5000, maxLocations: 3 },
    };

    // Process plans with optimized mapping
    const plans = dedupeCanonicalPlans((data || []).map((plan: { slug: string; limits?: PlanLimits; [key: string]: unknown }) => {
      if (!plan.limits) {
        const slug = normalizePlanSlug(String(plan.slug || '').toLowerCase());
        plan.limits = DEFAULT_LIMITS[slug] || { maxUsers: 2, maxProducts: 50, maxTransactionsPerMonth: 200, maxLocations: 1 };
      }
      return {
        ...plan,
        slug: normalizePlanSlug(String(plan.slug || '')),
        name: getCanonicalPlanDisplayName(plan.slug as string),
      };
    }))

    // Add caching headers for better performance
    const response = NextResponse.json({
      plans: plans,
      total: count || 0,
      page,
      pageSize,
    })
    
    // Cache for 5 minutes on successful responses
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
    
    return response
  } catch (err) {
    console.error('Unexpected error in plans API:', err)
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? String(err) : undefined
    }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await assertSuperAdmin(request);
  if (!('ok' in auth) || auth.ok === false) {
      return NextResponse.json(auth.body, { status: auth.status });
  }

  try {
    const supabase = await createClient()

    const defaults = [
      { 
        name: 'Free', 
        slug: 'free', 
        price_monthly: 0, 
        price_yearly: 0, 
        features: ['Soporte por email','Reportes básicos'], 
        limits: { maxUsers: 2, maxProducts: 50, maxTransactionsPerMonth: 200, maxLocations: 1 },
        is_active: true 
      },
      { 
        name: 'Starter', 
        slug: 'starter', 
        price_monthly: 100000, 
        price_yearly: 1080000, 
        features: ['basic_inventory','basic_sales','purchase_module','basic_reports','team_management','admin_panel','advanced_inventory'], 
        limits: { maxUsers: 5, maxProducts: 500, maxTransactionsPerMonth: 1000, maxLocations: 1 },
        is_active: true 
      },
      { 
        name: 'Professional', 
        slug: 'professional', 
        price_monthly: 200000, 
        price_yearly: 2160000, 
        features: ['basic_inventory','basic_sales','purchase_module','basic_reports','advanced_reports','multi_branch','audit_logs','unlimited_users','export_reports','team_management','admin_panel','advanced_inventory','loyalty_program','custom_branding'], 
        limits: { maxUsers: -1, maxProducts: -1, maxTransactionsPerMonth: -1, maxLocations: -1 },
        is_active: true 
      }
    ]

    let { error } = await supabase
      .from('saas_plans')
      .upsert(defaults, { onConflict: 'slug' })

    if (error && String(error.code) === '42703') {
      const minimal = defaults.map((p) => ({
        name: p.name,
        slug: p.slug,
        price_monthly: p.price_monthly,
        price_yearly: p.price_yearly,
        is_active: p.is_active,
      }))
      const r = await supabase
        .from('saas_plans')
        .upsert(minimal, { onConflict: 'slug' })
      error = r.error
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const allowed = ['free','starter','professional']
    await supabase
      .from('saas_plans')
      .update({ is_active: false })
      .not('slug','in', allowed)

    return NextResponse.json({ success: true, message: 'Planes sincronizados correctamente' })
  } catch (err) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await assertSuperAdmin(request);
  if (!('ok' in auth) || auth.ok === false) {
      return NextResponse.json(auth.body, { status: auth.status });
  }

  try {
    const supabase = await createClient()

    const body = await request.json()
    const normalizedSlug = normalizePlanSlug(String(body.slug || '').toLowerCase())
    
    // Validate required fields
    if (!body.name || !body.slug) {
      return NextResponse.json({ 
        error: 'Nombre y slug son requeridos',
        field: !body.name ? 'name' : 'slug'
      }, { status: 400 })
    }

    // Validate price values
    const priceMonthly = Number(body.price_monthly ?? 0)
    const priceYearly = Number(body.price_yearly ?? 0)
    
    if (priceMonthly < 0 || priceYearly < 0) {
      return NextResponse.json({ 
        error: 'Los precios no pueden ser negativos',
        field: 'price'
      }, { status: 400 })
    }

    if (priceYearly > priceMonthly * 12) {
      return NextResponse.json({
        error: 'El precio anual no puede superar 12 meses del precio mensual',
        field: 'price_yearly'
      }, { status: 400 })
    }

    const plan = {
      name: String(body.name).trim(),
      slug: normalizedSlug,
      description: String(body.description || '').trim(),
      price_monthly: priceMonthly,
      price_yearly: priceYearly,
      currency: String(body.currency || 'PYG').toUpperCase(),
      trial_days: Math.max(0, Number(body.trial_days ?? 0)),
      is_active: Boolean(body.is_active ?? true),
      features: Array.isArray(body.features) ? body.features : [],
      limits: body.limits && typeof body.limits === 'object' ? body.limits : { 
        maxUsers: 5, 
        maxProducts: 100, 
        maxTransactionsPerMonth: 1000, 
        maxLocations: 1 
      },
    }

    let { data, error } = await supabase
      .from('saas_plans')
      .insert(plan)
      .select('*')
      .single()

    if (error && String(error.code) === '42703') {
      const { currency, ...minimal } = plan as any
      const retry = await supabase
        .from('saas_plans')
        .insert(minimal)
        .select('*')
        .single()
      data = retry.data
      error = retry.error
    }

    if (error) {
      console.error('Error creating plan:', error)
      return NextResponse.json({ 
        error: 'Error al crear el plan',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }, { status: 500 })
    }

    // Add cache headers for the new resource
    const response = NextResponse.json({ success: true, plan: data })
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    
    return response
  } catch (err) {
    console.error('Unexpected error creating plan:', err)
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? String(err) : undefined
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const auth = await assertSuperAdmin(request);
  if (!('ok' in auth) || auth.ok === false) {
      return NextResponse.json(auth.body, { status: auth.status });
  }

  try {
    const supabase = await createClient()

    const body = await request.json()
    const id = String(body.id || '')
    
    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    // Validate price values if provided
    if (body.price_monthly !== undefined && Number(body.price_monthly) < 0) {
      return NextResponse.json({ error: 'El precio mensual no puede ser negativo' }, { status: 400 })
    }
    if (body.price_yearly !== undefined && Number(body.price_yearly) < 0) {
      return NextResponse.json({ error: 'El precio anual no puede ser negativo' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {
      name: body.name ? String(body.name).trim() : undefined,
      slug: body.slug ? normalizePlanSlug(String(body.slug)) : undefined,
      description: body.description !== undefined ? String(body.description).trim() : undefined,
      price_monthly: body.price_monthly !== undefined ? Number(body.price_monthly) : undefined,
      price_yearly: body.price_yearly !== undefined ? Number(body.price_yearly) : undefined,
      currency: body.currency ? String(body.currency).toUpperCase() : undefined,
      trial_days: body.trial_days !== undefined ? Math.max(0, Number(body.trial_days)) : undefined,
      is_active: body.is_active !== undefined ? Boolean(body.is_active) : undefined,
      features: body.features !== undefined ? (Array.isArray(body.features) ? body.features : []) : undefined,
      limits: body.limits !== undefined ? (typeof body.limits === 'object' ? body.limits : undefined) : undefined,
      updated_at: new Date().toISOString(),
    }

    // Remove undefined values
    Object.keys(updates).forEach(key => {
      if (updates[key] === undefined) {
        delete updates[key]
      }
    })

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('saas_plans')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      console.error('Error updating plan:', error)
      return NextResponse.json({ 
        error: 'Error al actualizar el plan',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 })
    }

    // Add cache headers
    const response = NextResponse.json({ success: true, plan: data })
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    
    return response
  } catch (err) {
    console.error('Unexpected error updating plan:', err)
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? String(err) : undefined
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await assertSuperAdmin(request);
  if (!('ok' in auth) || auth.ok === false) {
      return NextResponse.json(auth.body, { status: auth.status });
  }

  try {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    // Validate ID format
    if (!id.match(/^[a-f0-9-]{36}$/)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const supabase = await createClient()

    // First check if plan exists and can be deleted
    const { data: existingPlan } = await supabase
      .from('saas_plans')
      .select('id')
      .eq('id', id)
      .single()

    if (!existingPlan) {
      return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 })
    }

    const { data: subscriptions, error: subsError } = await supabase
      .from('saas_subscriptions')
      .select('id')
      .eq('plan_id', id)
      .limit(1)

    if (subsError) {
      console.error('Error checking subscriptions for plan:', subsError)
      return NextResponse.json({
        error: 'Error al validar suscripciones del plan',
        details: process.env.NODE_ENV === 'development' ? subsError.message : undefined
      }, { status: 500 })
    }

    if (subscriptions && subscriptions.length > 0) {
      return NextResponse.json({ 
        error: 'No se puede eliminar este plan porque está siendo utilizado por organizaciones activas',
        code: 'PLAN_IN_USE'
      }, { status: 400 })
    }

    const { error } = await supabase
      .from('saas_plans')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting plan:', error)
      return NextResponse.json({ 
        error: 'Error al eliminar el plan',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Unexpected error deleting plan:', err)
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? String(err) : undefined
    }, { status: 500 })
  }
}
