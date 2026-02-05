import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/app/api/admin/_utils/audit';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { newPlanId, billingCycle } = body;

    if (!newPlanId || !billingCycle) {
      return NextResponse.json(
        { error: 'Plan y ciclo de facturación requeridos' },
        { status: 400 }
      );
    }

    // Obtener la organización del usuario
    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select(`
        organization_id,
        is_owner,
        organization:organizations(
          id,
          name,
          slug,
          subscription_plan,
          subscription_status
        )
      `)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: 'No estás asociado a ninguna organización' },
        { status: 404 }
      );
    }

    // Verificar que el usuario es owner o admin
    if (!membership.is_owner) {
      // Verificar si es admin
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('role:roles(name)')
        .eq('user_id', user.id)
        .eq('is_active', true);

      const isAdmin = userRoles?.some((ur: any) => 
        ur.role?.name === 'ADMIN' || ur.role?.name === 'SUPER_ADMIN'
      );

      if (!isAdmin) {
        return NextResponse.json(
          { error: 'Solo los administradores pueden cambiar el plan' },
          { status: 403 }
        );
      }
    }

    const org = membership.organization as any;

    // Obtener el nuevo plan
    const { data: newPlan, error: planError } = await supabase
      .from('saas_plans')
      .select('*')
      .eq('id', newPlanId)
      .single();

    if (planError || !newPlan) {
      return NextResponse.json(
        { error: 'Plan no encontrado' },
        { status: 404 }
      );
    }

    // Actualizar la organización con el nuevo plan
    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        subscription_plan: newPlan.slug.toUpperCase(),
        subscription_status: 'ACTIVE',
        settings: {
          ...(org.settings || {}),
          billingCycle,
          lastPlanChange: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', org.id);

    if (updateError) {
      console.error('Error updating organization:', updateError);
      return NextResponse.json(
        { error: 'Error al actualizar el plan' },
        { status: 500 }
      );
    }

    // Registrar auditoría
    logAudit('subscription.plan_changed', {
      userId: user.id,
      organizationId: org.id,
      oldPlan: org.subscription_plan,
      newPlan: newPlan.slug,
      billingCycle,
    });

    // Calcular días hasta renovación
    const createdDate = new Date(org.created_at || new Date());
    const nextRenewal = new Date(createdDate);
    nextRenewal.setMonth(nextRenewal.getMonth() + 1);
    const daysUntilRenewal = Math.ceil((nextRenewal.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    // Devolver la suscripción actualizada
    const subscription = {
      id: org.id,
      organizationId: org.id,
      plan: {
        id: newPlan.id,
        name: newPlan.name,
        slug: newPlan.slug,
        priceMonthly: newPlan.price_monthly || 0,
        priceYearly: newPlan.price_yearly || 0,
        features: newPlan.features || [],
        limits: {
          maxUsers: newPlan.max_users || 1,
          maxProducts: newPlan.max_products || 20,
          maxTransactionsPerMonth: newPlan.max_transactions_per_month || 50,
          maxLocations: newPlan.max_locations || 1,
        },
        description: newPlan.description,
        currency: newPlan.currency || 'PYG',
        trialDays: newPlan.trial_days || 0,
      },
      status: 'active',
      billingCycle,
      currentPeriodStart: org.created_at,
      currentPeriodEnd: nextRenewal.toISOString(),
      cancelAtPeriodEnd: false,
      daysUntilRenewal,
      createdAt: org.created_at,
      isOrgAdmin: membership.is_owner || false,
    };

    return NextResponse.json({ 
      success: true, 
      subscription,
      message: `Plan cambiado exitosamente a ${newPlan.name}` 
    });
  } catch (error) {
    console.error('Error changing plan:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
