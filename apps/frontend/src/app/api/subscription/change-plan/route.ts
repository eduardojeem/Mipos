import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();

        // Verificar autenticación
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        // Obtener datos del request
        const body = await request.json();
        const { newPlanId, billingCycle } = body;

        if (!newPlanId || !billingCycle) {
            return NextResponse.json({
                error: 'Plan ID y ciclo de facturación son requeridos'
            }, { status: 400 });
        }

        if (billingCycle !== 'monthly' && billingCycle !== 'yearly') {
            return NextResponse.json({
                error: 'Ciclo de facturación inválido. Debe ser "monthly" o "yearly"'
            }, { status: 400 });
        }

        // Obtener la organización del usuario y verificar permisos
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

        // Verificar que el usuario sea ADMIN o OWNER
        if (userOrgData.role !== 'ADMIN' && userOrgData.role !== 'OWNER') {
            return NextResponse.json({
                error: 'No tienes permisos para cambiar el plan. Solo administradores pueden realizar esta acción.'
            }, { status: 403 });
        }

        // Verificar que el plan existe y está activo
        const { data: newPlan, error: planError } = await supabase
            .from('saas_plans')
            .select('*')
            .eq('id', newPlanId)
            .eq('is_active', true)
            .single();

        if (planError || !newPlan) {
            return NextResponse.json({
                error: 'Plan no encontrado o no está activo'
            }, { status: 404 });
        }

        // Calcular fechas del nuevo período
        const now = new Date();
        const periodStart = now.toISOString();
        const periodEnd = new Date(now);
        if (billingCycle === 'monthly') {
            periodEnd.setMonth(periodEnd.getMonth() + 1);
        } else {
            periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        }

        // Verificar si existe una suscripción
        const { data: existingSub } = await supabase
            .from('saas_subscriptions')
            .select('id')
            .eq('organization_id', userOrgData.organization_id)
            .single();

        let updatedSubscription;

        if (existingSub) {
            // Actualizar suscripción existente
            const { data, error: updateError } = await supabase
                .from('saas_subscriptions')
                .update({
                    plan_id: newPlanId,
                    billing_cycle: billingCycle,
                    current_period_start: periodStart,
                    current_period_end: periodEnd.toISOString(),
                    status: 'active',
                    cancel_at_period_end: false,
                    updated_at: now.toISOString(),
                })
                .eq('id', existingSub.id)
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
            currency
          )
        `)
                .single();

            if (updateError) {
                console.error('Error updating subscription:', updateError);
                return NextResponse.json({ error: updateError.message }, { status: 500 });
            }

            updatedSubscription = data;
        } else {
            // Crear nueva suscripción
            const { data, error: createError } = await supabase
                .from('saas_subscriptions')
                .insert({
                    organization_id: userOrgData.organization_id,
                    plan_id: newPlanId,
                    billing_cycle: billingCycle,
                    current_period_start: periodStart,
                    current_period_end: periodEnd.toISOString(),
                    status: 'active',
                    cancel_at_period_end: false,
                })
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
            currency
          )
        `)
                .single();

            if (createError) {
                console.error('Error creating subscription:', createError);
                return NextResponse.json({ error: createError.message }, { status: 500 });
            }

            updatedSubscription = data;
        }

        // Formatear respuesta
        const formattedSubscription = {
            id: updatedSubscription.id,
            organizationId: updatedSubscription.organization_id,
            plan: {
                id: updatedSubscription.saas_plans?.id,
                name: updatedSubscription.saas_plans?.name,
                slug: updatedSubscription.saas_plans?.slug,
                priceMonthly: updatedSubscription.saas_plans?.price_monthly,
                priceYearly: updatedSubscription.saas_plans?.price_yearly,
                features: updatedSubscription.saas_plans?.features || [],
                limits: updatedSubscription.saas_plans?.limits || {},
                description: updatedSubscription.saas_plans?.description,
                currency: updatedSubscription.saas_plans?.currency || 'USD',
            },
            status: updatedSubscription.status,
            billingCycle: updatedSubscription.billing_cycle,
            currentPeriodStart: updatedSubscription.current_period_start,
            currentPeriodEnd: updatedSubscription.current_period_end,
            cancelAtPeriodEnd: updatedSubscription.cancel_at_period_end,
            createdAt: updatedSubscription.created_at,
        };

        return NextResponse.json({
            success: true,
            subscription: formattedSubscription,
            message: 'Plan actualizado correctamente',
        });

    } catch (error) {
        console.error('Error in change-plan API:', error);
        return NextResponse.json({
            error: 'Error interno del servidor'
        }, { status: 500 });
    }
}
