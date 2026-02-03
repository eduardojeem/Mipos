import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface PlanLimits {
  maxUsers: number
  maxProducts: number
  maxTransactionsPerMonth: number
  maxLocations: number
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { data: roleRow } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if ((roleRow?.role || '').toUpperCase() !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const search = (searchParams.get('search') || '').trim()
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const pageSize = Math.max(1, Math.min(100, parseInt(searchParams.get('pageSize') || '20', 10)))
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from('saas_plans')
      .select('*', { count: 'exact' })

    if (search) {
      query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%`)
    }

    const { data, error, count } = await query.eq('is_active', true).order('price_monthly', { ascending: true }).range(from, to)

    if (error) {
      // Si la tabla no existe, devolver estructura vacía sin romper UI
      if (error.code === '42P01') return NextResponse.json({ plans: [], total: 0, page, pageSize })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const DEFAULT_LIMITS: Record<string, PlanLimits> = {
      free: { maxUsers: 2, maxProducts: 50, maxTransactionsPerMonth: 200, maxLocations: 1 },
      starter: { maxUsers: 5, maxProducts: 500, maxTransactionsPerMonth: 1000, maxLocations: 1 },
      pro: { maxUsers: 10, maxProducts: 2000, maxTransactionsPerMonth: 5000, maxLocations: 3 },
      professional: { maxUsers: 10, maxProducts: 2000, maxTransactionsPerMonth: 5000, maxLocations: 3 },
      premium: { maxUsers: -1, maxProducts: -1, maxTransactionsPerMonth: -1, maxLocations: -1 },
    };

    const plans = (data || []).map((plan: { slug: string; limits?: PlanLimits; [key: string]: unknown }) => {
      if (!plan.limits) {
        const slug = String(plan.slug || '').toLowerCase();
        plan.limits = DEFAULT_LIMITS[slug] || { maxUsers: 2, maxProducts: 50, maxTransactionsPerMonth: 200, maxLocations: 1 };
      }
      return plan;
    });

    return NextResponse.json({ plans: plans, total: count || 0, page, pageSize })
  } catch (err) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PATCH() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { data: roleRow } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if ((roleRow?.role || '').toUpperCase() !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

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
        name: 'PRO', 
        slug: 'pro', 
        price_monthly: 49, 
        price_yearly: 588, 
        features: ['Usuarios ilimitados','Locales ilimitados','Productos ilimitados','Reportes avanzados','Soporte prioritario'], 
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

    const allowed = ['free','pro']
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
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { data: roleRow } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if ((roleRow?.role || '').toUpperCase() !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const body = await request.json()
    const plan = {
      name: String(body.name || ''),
      slug: String(body.slug || '').toLowerCase(),
      description: String(body.description || ''),
      price_monthly: Number(body.price_monthly ?? 0),
      price_yearly: Number(body.price_yearly ?? 0),
      currency: String(body.currency || 'USD'),
      trial_days: Number(body.trial_days ?? 0),
      is_active: Boolean(body.is_active ?? true),
      features: body.features ?? [],
      limits: body.limits ?? { maxUsers: 5, maxProducts: 100, maxTransactionsPerMonth: 1000, maxLocations: 1 },
    }

    if (!plan.name || !plan.slug) {
      return NextResponse.json({ error: 'Nombre y slug son requeridos' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('saas_plans')
      .insert(plan)
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, plan: data })
  } catch (err) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { data: roleRow } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if ((roleRow?.role || '').toUpperCase() !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const body = await request.json()
    const id = String(body.id || '')
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    const updates: Record<string, unknown> = {
      name: body.name,
      description: body.description,
      price_monthly: body.price_monthly,
      price_yearly: body.price_yearly,
      currency: body.currency,
      trial_days: body.trial_days,
      is_active: body.is_active,
      features: body.features,
      limits: body.limits,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('saas_plans')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, plan: data })
  } catch (err) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { data: roleRow } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if ((roleRow?.role || '').toUpperCase() !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const { error } = await supabase
      .from('saas_plans')
      .delete()
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
