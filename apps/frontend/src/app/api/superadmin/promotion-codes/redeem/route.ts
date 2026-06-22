import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { assertSuperAdmin } from '@/app/api/_utils/auth';
import { logAudit } from '@/app/api/admin/_utils/audit';
import { getPlanRecord, syncOrganizationSubscriptionState } from '@/app/api/subscription/_lib';
import { createAdminClient } from '@/lib/supabase/server';

type PromotionCode = {
  id: string;
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
};

function normalizeCode(code: string) {
  return code.trim().toUpperCase().replace(/\s+/g, '');
}

function hashCode(code: string) {
  return createHash('sha256').update(normalizeCode(code)).digest('hex');
}

function addPromoDuration(startAt: Date, promo: PromotionCode) {
  const endAt = new Date(startAt);
  if (promo.duration_days && promo.duration_days > 0) {
    endAt.setDate(endAt.getDate() + promo.duration_days);
    return endAt;
  }
  if (promo.duration_months && promo.duration_months > 0) {
    endAt.setMonth(endAt.getMonth() + promo.duration_months);
    return endAt;
  }
  if (promo.billing_cycle === 'yearly') {
    endAt.setFullYear(endAt.getFullYear() + 1);
  } else {
    endAt.setMonth(endAt.getMonth() + 1);
  }
  return endAt;
}

function validatePromotion(promo: PromotionCode) {
  const now = Date.now();
  if (!promo.is_active) return 'El codigo no esta activo';
  if (promo.starts_at && new Date(promo.starts_at).getTime() > now) return 'El codigo todavia no esta vigente';
  if (promo.expires_at && new Date(promo.expires_at).getTime() < now) return 'El codigo ya vencio';
  if (promo.max_redemptions !== null && promo.redemption_count >= promo.max_redemptions) {
    return 'El codigo alcanzo su limite de canjes';
  }
  return null;
}

export async function POST(request: NextRequest) {
  const auth = await assertSuperAdmin(request);
  if (!('ok' in auth) || auth.ok === false) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  try {
    const body = await request.json();
    const organizationId = String(body.organizationId || '').trim();
    const code = normalizeCode(String(body.code || ''));

    if (!organizationId) {
      return NextResponse.json({ success: false, error: 'Organizacion requerida' }, { status: 400 });
    }
    if (code.length < 8) {
      return NextResponse.json({ success: false, error: 'Codigo requerido' }, { status: 400 });
    }

    const admin = await createAdminClient();
    const [{ data: organization, error: orgError }, { data: promo, error: promoError }] = await Promise.all([
      admin
        .from('organizations')
        .select('id,name,slug,subscription_plan,subscription_status,settings,created_at,updated_at')
        .eq('id', organizationId)
        .single(),
      admin
        .from('saas_promotion_codes')
        .select('id,label,target_plan_id,billing_cycle,duration_days,duration_months,max_redemptions,redemption_count,starts_at,expires_at,is_active')
        .eq('code_hash', hashCode(code))
        .maybeSingle(),
    ]);

    if (orgError || !organization) {
      return NextResponse.json({ success: false, error: 'Organizacion no encontrada' }, { status: 404 });
    }
    if (promoError) {
      return NextResponse.json({ success: false, error: promoError.message }, { status: 500 });
    }
    if (!promo) {
      return NextResponse.json({ success: false, error: 'Codigo no encontrado' }, { status: 404 });
    }

    const promotion = promo as PromotionCode;
    const validationError = validatePromotion(promotion);
    if (validationError) {
      return NextResponse.json({ success: false, error: validationError }, { status: 409 });
    }

    const { data: existingRedemption } = await admin
      .from('saas_promotion_redemptions')
      .select('id,redeemed_at')
      .eq('promotion_code_id', promotion.id)
      .eq('organization_id', organizationId)
      .eq('status', 'applied')
      .maybeSingle();

    if (existingRedemption) {
      return NextResponse.json({ success: false, error: 'Esta organizacion ya canjeo este codigo' }, { status: 409 });
    }

    const plan = await getPlanRecord(promotion.target_plan_id);
    if (!plan) {
      return NextResponse.json({ success: false, error: 'El plan asociado al codigo ya no existe' }, { status: 404 });
    }

    const sync = await syncOrganizationSubscriptionState({
      organization: organization as any,
      plan,
      billingCycle: promotion.billing_cycle,
    });

    const startAt = new Date(sync.currentPeriodStart);
    const endAt = addPromoDuration(startAt, promotion);
    const endIso = endAt.toISOString();
    const endDate = endIso.split('T')[0];

    await Promise.all([
      admin
        .from('saas_subscriptions')
        .update({
          current_period_end: endIso,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sync.saasSubscriptionId),
      sync.planSubscriptionId
        ? admin
            .from('plan_subscriptions')
            .update({
              end_date: endDate,
              is_active: true,
            })
            .eq('id', sync.planSubscriptionId)
        : Promise.resolve({ error: null }),
    ]);

    const { error: redemptionError } = await admin
      .from('saas_promotion_redemptions')
      .insert({
        promotion_code_id: promotion.id,
        organization_id: organizationId,
        subscription_id: sync.saasSubscriptionId,
        target_plan_id: plan.id,
        redeemed_by: auth.userId,
        status: 'applied',
      });

    if (redemptionError) {
      return NextResponse.json({ success: false, error: redemptionError.message }, { status: 500 });
    }

    await admin
      .from('saas_promotion_codes')
      .update({ redemption_count: promotion.redemption_count + 1 })
      .eq('id', promotion.id);

    logAudit('subscription.promotion_code_redeemed', {
      entityType: 'SUBSCRIPTION',
      entityId: sync.saasSubscriptionId,
      organizationId,
      promotionCodeId: promotion.id,
      promotionLabel: promotion.label,
      targetPlan: plan.slug,
      billingCycle: promotion.billing_cycle,
      currentPeriodEnd: endIso,
    }, { id: auth.userId, email: auth.email, role: 'SUPER_ADMIN' });

    return NextResponse.json({
      success: true,
      message: `Suscripcion activada con el plan ${plan.name}`,
      subscription: {
        id: sync.saasSubscriptionId,
        planId: plan.id,
        planSlug: plan.slug,
        billingCycle: promotion.billing_cycle,
        currentPeriodStart: sync.currentPeriodStart,
        currentPeriodEnd: endIso,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno del servidor';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
