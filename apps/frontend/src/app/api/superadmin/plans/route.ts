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

