import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener la organización del usuario
    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select(`
        organization_id,
        is_owner,
        role_id,
        organization:organizations(
          id,
          name,
          slug,
          subscription_plan,
          subscription_status,
          settings,
          created_at,
          updated_at
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

    const org = membership.organization as {
      id: string;
      name: string;
      slug: string;
      subscription_plan?: string;
      subscription_status?: string;
      settings?: Record<string, unknown>;
      created_at: string;
      updated_at: string;
    };
    
    // Obtener el plan desde saas_plans
    const { data: plan, error: planError } = await supabase
      .from('saas_plans')
      .select('*')
      .eq('slug', org.subscription_plan?.toLowerCase() || 'free')
      .single();

    if (planError || !plan) {
      // Si no se encuentra el plan, devolver un plan por defecto
      return NextResponse.json({
        subscription: {
          id: org.id,
          organizationId: org.id,
          plan: {
            id: 'free',
            name: 'Free',
            slug: 'free',
            priceMonthly: 0,
            priceYearly: 0,
            features: ['Funcionalidades básicas'],
            limits: {
              maxUsers: 1,
              maxProducts: 20,
              maxTransactionsPerMonth: 50,
              maxLocations: 1,
            },
            description: 'Plan gratuito',
            currency: 'PYG',
          },
          status: org.subscription_status?.toLowerCase() || 'active',
          billingCycle: 'monthly',
          currentPeriodStart: org.created_at,
          currentPeriodEnd: new Date(new Date(org.created_at).setMonth(new Date(org.created_at).getMonth() + 1)).toISOString(),
          cancelAtPeriodEnd: false,
          daysUntilRenewal: 30,
          createdAt: org.created_at,
          isOrgAdmin: membership.is_owner || false,
        },
      });
    }

    // Calcular días hasta renovación
    const createdDate = new Date(org.created_at);
    const nextRenewal = new Date(createdDate);
    nextRenewal.setMonth(nextRenewal.getMonth() + 1);
    const daysUntilRenewal = Math.ceil((nextRenewal.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    // Construir respuesta con datos reales
    const subscription = {
      id: org.id,
      organizationId: org.id,
      plan: {
        id: plan.id,
        name: plan.name,
        slug: plan.slug,
        priceMonthly: plan.price_monthly || 0,
        priceYearly: plan.price_yearly || 0,
        features: plan.features || [],
        limits: {
          maxUsers: plan.max_users || 1,
          maxProducts: plan.max_products || 20,
          maxTransactionsPerMonth: plan.max_transactions_per_month || 50,
          maxLocations: plan.max_locations || 1,
        },
        description: plan.description,
        currency: plan.currency || 'PYG',
        trialDays: plan.trial_days || 0,
      },
      status: org.subscription_status?.toLowerCase() || 'active',
      billingCycle: org.settings?.billingCycle || 'monthly',
      currentPeriodStart: org.created_at,
      currentPeriodEnd: nextRenewal.toISOString(),
      cancelAtPeriodEnd: false,
      daysUntilRenewal,
      createdAt: org.created_at,
      isOrgAdmin: membership.is_owner || false,
    };

    return NextResponse.json({ subscription });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
