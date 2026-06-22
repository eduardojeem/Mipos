import { NextRequest, NextResponse } from 'next/server';
import { assertSuperAdmin } from '@/app/api/_utils/auth';
import { createAdminClient } from '@/lib/supabase/server';

function parsePositiveInteger(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await assertSuperAdmin(request);
  if (!('ok' in auth) || auth.ok === false) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const admin = await createAdminClient();
    const updates: Record<string, unknown> = {};

    if (typeof body.label === 'string') {
      const label = body.label.trim();
      if (!label) {
        return NextResponse.json({ success: false, error: 'Nombre requerido' }, { status: 400 });
      }
      updates.label = label;
    }

    if (typeof body.targetPlanId === 'string' && body.targetPlanId.trim()) {
      const targetPlanId = body.targetPlanId.trim();
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
      updates.target_plan_id = targetPlanId;
    }

    if (body.billingCycle !== undefined) {
      updates.billing_cycle = String(body.billingCycle).toLowerCase() === 'yearly' ? 'yearly' : 'monthly';
    }
    if (body.durationDays !== undefined) updates.duration_days = parsePositiveInteger(body.durationDays);
    if (body.durationMonths !== undefined) updates.duration_months = parsePositiveInteger(body.durationMonths);
    if (body.maxRedemptions !== undefined) updates.max_redemptions = parsePositiveInteger(body.maxRedemptions);
    if (body.startsAt !== undefined) updates.starts_at = body.startsAt ? new Date(String(body.startsAt)).toISOString() : null;
    if (body.expiresAt !== undefined) updates.expires_at = body.expiresAt ? new Date(String(body.expiresAt)).toISOString() : null;
    if (body.isActive !== undefined) updates.is_active = body.isActive === true;

    if (updates.starts_at && updates.expires_at && new Date(String(updates.starts_at)).getTime() > new Date(String(updates.expires_at)).getTime()) {
      return NextResponse.json({ success: false, error: 'La fecha de inicio no puede ser posterior al vencimiento' }, { status: 400 });
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, error: 'No hay cambios para aplicar' }, { status: 400 });
    }

    const { data, error } = await admin
      .from('saas_promotion_codes')
      .update(updates)
      .eq('id', id)
      .select('id,is_active,updated_at')
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, code: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno del servidor';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
