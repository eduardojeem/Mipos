import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface SaasPlan {
    id: string;
    name: string;
    slug: string;
    price_monthly: number;
    price_yearly: number;
    features: string[];
    limits?: {
        maxUsers?: number;
        maxProducts?: number;
        maxTransactionsPerMonth?: number;
        maxLocations?: number;
    };
    description?: string;
    currency?: string;
    trial_days?: number;
}

interface SaasSubscription {
    id: string;
    organization_id: string;
    plan_id: string;
    status: string;
    billing_cycle: 'monthly' | 'yearly';
    current_period_start: string;
    current_period_end: string;
    cancel_at_period_end: boolean;
    created_at: string;
    saas_plans?: SaasPlan;
}

export async function GET() {
    try {
        const supabase = await createClient();

        // Verificar autenticación
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        // Obtener la organización actual del usuario
        const { data: userOrgData, error: userOrgError } = await supabase
            .from('user_organizations')
            .select('organization_id, role')
            .eq('user_id', user.id)
            .single();

        if (userOrgError || !userOrgData) {
            return NextResponse.json({
                error: 'No se encontró organización para el usuario'
            }, { status: 404 });
        }

        // Obtener la suscripción con detalles del plan
        const { data: subscription, error: subError } = await supabase
            .from('saas_subscriptions')
            .select(`
        *,
        saas_plans (
          id,
          name,
          slug,
          price_monthly,
          price_yearly,
          features,
          limits,
          description,
          currency,
          trial_days
        )
      `)
            .eq('organization_id', userOrgData.organization_id)
            .single();

        if (subError) {
            // Si no hay suscripción, retornar null (usuario podría estar en plan free o sin asignar)
            if (subError.code === 'PGRST116') { // No rows returned
                return NextResponse.json({
                    success: true,
                    subscription: null,
                    message: 'No hay suscripción activa'
                });
            }
            console.error('Error fetching subscription:', subError);
            return NextResponse.json({ error: subError.message }, { status: 500 });
        }

        // Calcular días hasta renovación
        const daysUntilRenewal = subscription.current_period_end
            ? Math.ceil(
                (new Date(subscription.current_period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            )
            : 0;

        // Formatear respuesta
        const formattedSubscription = {
            id: subscription.id,
            organizationId: subscription.organization_id,
            plan: {
                id: subscription.saas_plans?.id,
                name: subscription.saas_plans?.name,
                slug: subscription.saas_plans?.slug,
                priceMonthly: subscription.saas_plans?.price_monthly,
                priceYearly: subscription.saas_plans?.price_yearly,
                features: subscription.saas_plans?.features || [],
                limits: subscription.saas_plans?.limits || {},
                description: subscription.saas_plans?.description,
                currency: subscription.saas_plans?.currency || 'USD',
                trialDays: subscription.saas_plans?.trial_days || 0,
            },
            status: subscription.status,
            billingCycle: subscription.billing_cycle,
            currentPeriodStart: subscription.current_period_start,
            currentPeriodEnd: subscription.current_period_end,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            daysUntilRenewal,
            createdAt: subscription.created_at,
            isOrgAdmin: userOrgData.role === 'ADMIN' || userOrgData.role === 'OWNER',
        };

        return NextResponse.json({
            success: true,
            subscription: formattedSubscription,
        });

    } catch (error) {
        console.error('Error in subscription API:', error);
        return NextResponse.json({
            error: 'Error interno del servidor'
        }, { status: 500 });
    }
}
