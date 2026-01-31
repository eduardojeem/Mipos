import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
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

    const { data, error } = await supabase
      .from('saas_plans')
      .select('*')
      .order('price_monthly', { ascending: true })

    if (error) {
      // Si la tabla no existe, devolver estructura vacía sin romper UI
      if (error.code === '42P01') return NextResponse.json({ plans: [] })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ plans: data ?? [] })
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
      { name: 'Free', slug: 'free', price_monthly: 0, price_yearly: 0, features: ['Hasta 5 usuarios','1 local','100 productos','Reportes básicos','Soporte por email'], is_active: true },
      { name: 'Starter', slug: 'starter', price_monthly: 15, price_yearly: 180, features: ['Hasta 15 usuarios','3 locales','1.000 productos','Reportes intermedios','Soporte estándar'], is_active: true },
      { name: 'Professional', slug: 'professional', price_monthly: 30, price_yearly: 360, features: ['Usuarios ilimitados','Locales ilimitados','Productos ilimitados','Reportes avanzados','Soporte prioritario'], is_active: true },
      { name: 'Premium', slug: 'premium', price_monthly: 49, price_yearly: 588, features: ['Usuarios ilimitados','Soporte 24/7','Automatizaciones','Reportes personalizados','Integraciones avanzadas'], is_active: true },
      { name: 'Enterprise', slug: 'enterprise', price_monthly: 99, price_yearly: 1188, features: ['SLA empresarial','Onboarding dedicado','Soporte técnico premium','Reportes a medida','Integraciones a la carta'], is_active: true },
    ]

    const { error } = await supabase
      .from('saas_plans')
      // @ts-ignore onConflict es soportado por supabase-js
      .upsert(defaults, { onConflict: 'slug' })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, message: 'Planes sincronizados correctamente' })
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
    
    // Validate required fields
    if (!body.name || !body.slug) {
      return NextResponse.json({ error: 'Nombre y Slug son requeridos' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('saas_plans')
      .insert([{
        name: body.name,
        slug: body.slug,
        description: body.description || '',
        price_monthly: body.price_monthly || 0,
        price_yearly: body.price_yearly || 0,
        currency: body.currency || 'USD',
        trial_days: body.trial_days || 0,
        features: body.features || [],
        limits: body.limits || {},
        is_active: body.is_active ?? true
      }])
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ plan: data })
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
    
    if (!body.id) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('saas_plans')
      .update({
        name: body.name,
        // slug usually shouldn't be changed if it's used as a key, but allowing it if needed
        slug: body.slug,
        description: body.description,
        price_monthly: body.price_monthly,
        price_yearly: body.price_yearly,
        currency: body.currency,
        trial_days: body.trial_days,
        features: body.features,
        limits: body.limits,
        is_active: body.is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', body.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ plan: data })
  } catch (err) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

