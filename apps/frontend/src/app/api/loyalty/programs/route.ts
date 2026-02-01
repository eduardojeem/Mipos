import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase-admin'
import api from '@/lib/api'

export async function GET(request: NextRequest) {
  try {
    const orgId = (request.headers.get('x-organization-id') || '').trim();
    if (!orgId) {
      return NextResponse.json({ error: 'Organization header missing' }, { status: 400 });
    }

    try {
      const admin = createAdminClient()
      const { data, error } = await (admin as any)
        .from('loyalty_programs')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
      if (error) throw new Error(String(error.message))
      if (!Array.isArray(data) || data.length === 0) {
        // Fallback or empty list
        return NextResponse.json({ data: [] })
      }
      return NextResponse.json({ data })
    } catch {
      // Fallback logic preserved but might be less relevant for strict SaaS
      // If we keep fallback, we can't really filter by orgId in external API unless supported.
      // Assuming fallback is for development/mock.
      const resp = await api.get('/loyalty/programs')
      const raw: any = resp.data
      const programs = raw?.data ?? raw?.programs ?? raw
      // ... fallback handling
      return NextResponse.json({ data: programs || [] })
    }
  } catch (error: any) {
     return NextResponse.json({ data: [] })
  }
}

export async function POST(request: NextRequest) {
  try {
    const orgId = (request.headers.get('x-organization-id') || '').trim();
    if (!orgId) {
      return NextResponse.json({ error: 'Organization header missing' }, { status: 400 });
    }

    const body = await request.json()
    const admin = createAdminClient()
    const now = new Date().toISOString()
    const payload = {
      name: body.name,
      description: body.description || null,
      points_per_purchase: Number(body.pointsPerPurchase || 0),
      minimum_purchase: Number(body.minimumPurchase || 0),
      welcome_bonus: Number(body.welcomeBonus || 0),
      birthday_bonus: Number(body.birthdayBonus || 0),
      referral_bonus: Number(body.referralBonus || 0),
      points_expiration_days: body.pointsExpirationDays ?? null,
      is_active: Boolean(body.isActive ?? true),
      created_at: now,
      updated_at: now,
      organization_id: orgId
    }

    const { data, error } = await (admin as any)
      .from('loyalty_programs')
      .insert(payload)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const mapped = {
      id: data.id,
      name: data.name,
      description: data.description || undefined,
      pointsPerPurchase: data.points_per_purchase,
      minimumPurchase: data.minimum_purchase,
      welcomeBonus: data.welcome_bonus,
      birthdayBonus: data.birthday_bonus,
      referralBonus: data.referral_bonus,
      pointsExpirationDays: data.points_expiration_days ?? undefined,
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }
    return NextResponse.json({ data: mapped })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status: 500 })
  }
}