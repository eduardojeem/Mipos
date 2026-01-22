import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase-admin'
import api from '@/lib/api'

export async function GET() {
  try {
    try {
      const admin = createAdminClient()
      const { data, error } = await (admin as any)
        .from('loyalty_programs')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw new Error(String(error.message))
      if (!Array.isArray(data) || data.length === 0) {
        const fallback = [
          {
            id: 'mock-program',
            name: 'Programa Demo',
            description: 'Modo sin conexión',
            pointsPerPurchase: 1,
            minimumPurchase: 0,
            welcomeBonus: 100,
            birthdayBonus: 50,
            referralBonus: 25,
            pointsExpirationDays: 365,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]
        return NextResponse.json({ data: fallback })
      }
      return NextResponse.json({ data })
    } catch {
      const resp = await api.get('/loyalty/programs')
      const raw: any = resp.data
      const programs = raw?.data ?? raw?.programs ?? raw
      if (!Array.isArray(programs) || programs.length === 0) {
        const fallback = [
          {
            id: 'mock-program',
            name: 'Programa Demo',
            description: 'Modo sin conexión',
            pointsPerPurchase: 1,
            minimumPurchase: 0,
            welcomeBonus: 100,
            birthdayBonus: 50,
            referralBonus: 25,
            pointsExpirationDays: 365,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]
        return NextResponse.json({ data: fallback })
      }
      return NextResponse.json({ data: programs })
    }
  } catch (error: any) {
    const data = [
      {
        id: 'mock-program',
        name: 'Programa Demo',
        description: 'Modo sin conexión',
        pointsPerPurchase: 1,
        minimumPurchase: 0,
        welcomeBonus: 100,
        birthdayBonus: 50,
        referralBonus: 25,
        pointsExpirationDays: 365,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]
    return NextResponse.json({ data })
  }
}

export async function POST(request: NextRequest) {
  try {
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