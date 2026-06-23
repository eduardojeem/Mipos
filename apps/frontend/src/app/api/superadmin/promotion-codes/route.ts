import { randomBytes, createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { assertSuperAdmin } from '@/app/api/_utils/auth';
import { createAdminClient } from '@/lib/supabase/server';

type PromotionCodeRow = {
  id: string;
  code_prefix: string;
  code_suffix: string;
  label: string;
  target_plan_id: string;
  billing_cycle: 'monthly' | 'yearly';
  duration_days: number | null;
  duration_months: number | null;
  max_redemptions: number | null;
  redemption_count: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type PlanRow = {
    id: string;
    name: string | null;
    slug: string | null;
    price_monthly: number | null;
    price_yearly: number | null;
    currency: string | null;
};

function normalizeCode(code: string) {
  return code.trim().toUpperCase().replace(/\s+/g, '');
}

function hashCode(code: string) {
  return createHash('sha256').update(normalizeCode(code)).digest('hex');
}

function generateCode() {
  let token = '';
  while (token.length < 12) {
    token += randomBytes(9).toString('base64url').toUpperCase().replace(/[^A-Z0-9]/g, '');
  }
  token = token.slice(0, 12);
  return `MITIENDA-${token.slice(0, 4)}-${token.slice(4, 8)}-${token.slice(8, 12)}`;
}

function formatCode(row: PromotionCodeRow, plansById: Map<string, PlanRow>) {
  const plan = plansById.get(row.target_plan_id) || null;
  return {
    id: row.id,
    codePreview: `${row.code_prefix}...${row.code_suffix}`,
    label: row.label,
    targetPlanId: row.target_plan_id,
    targetPlan: plan
      ? {
          id: plan.id,
          name: plan.name,
          slug: plan.slug,
          priceMonthly: Number(plan.price_monthly || 0),
          priceYearly: Number(plan.price_yearly || 0),
          currency: plan.currency || 'PYG',
        }
      : null,
    billingCycle: row.billing_cycle,
    durationDays: row.duration_days,
    durationMonths: row.duration_months,
    maxRedemptions: row.max_redemptions,
    redemptionCount: row.redemption_count,
    startsAt: row.starts_at,
    expiresAt: row.expires_at,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parsePositiveInteger(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

export async function GET(request: NextRequest) {
  const auth = await assertSuperAdmin(request);
  if (!('ok' in auth) || auth.ok === false) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  try {
    const admin = await createAdminClient();
    const searchParams = request.nextUrl.searchParams;
    const search = (searchParams.get('search') || '').trim();
    const status = (searchParams.get('status') || 'all').toLowerCase();
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const pageSize = Math.min(Math.max(parseInt(searchParams.get('pageSize') || '25', 10), 1), 100);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = admin
      .from('saas_promotion_codes')
      .select(`
        id,
        code_prefix,
        code_suffix,
        label,
        target_plan_id,
        billing_cycle,
        duration_days,
        duration_months,
        max_redemptions,
        redemption_count,
        starts_at,
        expires_at,
        is_active,
        created_at,
        updated_at
      `, { count: 'exact' });

    if (search) {
      query = query.ilike('label', `%${search}%`);
    }
    if (status === 'active') query = query.eq('is_active', true);
    if (status === 'inactive') query = query.eq('is_active', false);

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({
          success: true,
          data: [],
          summary: { total: 0, active: 0, inactive: 0, redemptions: 0 },
          pagination: { page, pageSize, total: 0, pages: 0 },
        });
      }
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const planIds = Array.from(new Set(((data || []) as PromotionCodeRow[]).map((row) => row.target_plan_id).filter(Boolean)));
    const [{ data: summaryRows }, { data: plans }] = await Promise.all([
      admin
        .from('saas_promotion_codes')
        .select('is_active, redemption_count'),
      planIds.length > 0
        ? admin
            .from('saas_plans')
            .select('id,name,slug,price_monthly,price_yearly,currency')
            .in('id', planIds)
        : Promise.resolve({ data: [] }),
    ]);

    const plansById = new Map(
      ((plans || []) as PlanRow[]).map((plan) => [plan.id, plan])
    );

    const summary = (summaryRows || []).reduce(
      (acc: { total: number; active: number; inactive: number; redemptions: number }, row: any) => {
        acc.total += 1;
        if (row.is_active) acc.active += 1;
        else acc.inactive += 1;
        acc.redemptions += Number(row.redemption_count || 0);
        return acc;
      },
      { total: 0, active: 0, inactive: 0, redemptions: 0 }
    );

    return NextResponse.json({
      success: true,
      data: ((data || []) as PromotionCodeRow[]).map((row) => formatCode(row, plansById)),
      summary,
      pagination: {
        page,
        pageSize,
        total: count || 0,
        pages: Math.ceil((count || 0) / pageSize),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno del servidor';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await assertSuperAdmin(request);
  if (!('ok' in auth) || auth.ok === false) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  try {
    const admin = await createAdminClient();
    const body = await request.json();
    const label = String(body.label || '').trim();
    const targetPlanId = String(body.targetPlanId || '').trim();
    const billingCycle = String(body.billingCycle || 'monthly').toLowerCase() === 'yearly' ? 'yearly' : 'monthly';
    const durationDays = parsePositiveInteger(body.durationDays);
    const durationMonths = parsePositiveInteger(body.durationMonths);
    const maxRedemptions = parsePositiveInteger(body.maxRedemptions);
    const startsAt = body.startsAt ? new Date(String(body.startsAt)).toISOString() : null;
    const expiresAt = body.expiresAt ? new Date(String(body.expiresAt)).toISOString() : null;
    const rawCode = body.code ? normalizeCode(String(body.code)) : generateCode();

    if (!label) {
      return NextResponse.json({ success: false, error: 'Nombre de promocion requerido' }, { status: 400 });
    }
    if (!targetPlanId) {
      return NextResponse.json({ success: false, error: 'Plan destino requerido' }, { status: 400 });
    }
    if (rawCode.length < 8) {
      return NextResponse.json({ success: false, error: 'El codigo debe tener al menos 8 caracteres' }, { status: 400 });
    }
    if (startsAt && expiresAt && new Date(startsAt).getTime() > new Date(expiresAt).getTime()) {
      return NextResponse.json({ success: false, error: 'La fecha de inicio no puede ser posterior al vencimiento' }, { status: 400 });
    }

    const { data: plan, error: planError } = await admin
      .from('saas_plans')
      .select('id')
      .eq('id', targetPlanId)
      .eq('is_active', true)
      .maybeSingle();

    if (planError) {
      return NextResponse.json({ success: false, error: planError.message }, { status: 500 });
    }
    if (!plan) {
      return NextResponse.json({ success: false, error: 'Plan activo no encontrado' }, { status: 404 });
    }

    const normalized = normalizeCode(rawCode);
    const { data, error } = await admin
      .from('saas_promotion_codes')
      .insert({
        code_hash: hashCode(normalized),
        code_prefix: normalized.slice(0, 6),
        code_suffix: normalized.slice(-4),
        label,
        target_plan_id: targetPlanId,
        billing_cycle: billingCycle,
        duration_days: durationDays,
        duration_months: durationMonths,
        max_redemptions: maxRedemptions,
        starts_at: startsAt,
        expires_at: expiresAt,
        is_active: body.isActive === false ? false : true,
        created_by: auth.userId,
      })
      .select(`
        id,
        code_prefix,
        code_suffix,
        label,
        target_plan_id,
        billing_cycle,
        duration_days,
        duration_months,
        max_redemptions,
        redemption_count,
        starts_at,
        expires_at,
        is_active,
        created_at,
        updated_at
      `)
      .single();

    if (error) {
      const message = error.code === '23505' ? 'Ese codigo ya existe' : error.message;
      return NextResponse.json({ success: false, error: message }, { status: error.code === '23505' ? 409 : 500 });
    }

    const { data: selectedPlan } = await admin
      .from('saas_plans')
      .select('id,name,slug,price_monthly,price_yearly,currency')
      .eq('id', targetPlanId)
      .maybeSingle();
    const plansById = new Map<string, PlanRow>();
    if (selectedPlan) plansById.set(selectedPlan.id, selectedPlan as PlanRow);

    return NextResponse.json({
      success: true,
      code: formatCode(data as PromotionCodeRow, plansById),
      plainCode: normalized,
      message: 'Codigo creado. Guarda el codigo ahora: no se volvera a mostrar completo.',
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno del servidor';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
