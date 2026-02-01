import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface SaasPlanRow {
    id: string;
    name: string;
    slug: string;
    price_monthly: number;
    price_yearly: number;
    features: string[];
    limits?: Record<string, number>;
    description?: string;
    currency?: string;
    trial_days?: number;
    is_active: boolean;
}


export async function GET() {
    try {
        const supabase = await createClient();

        // Obtener todos los planes activos
        const { data: plans, error } = await supabase
            .from('saas_plans')
            .select('*')
            .eq('is_active', true)
            .order('price_monthly', { ascending: true });

        if (error) {
            console.error('Error fetching plans:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Formatear planes
        const formattedPlans = (plans || []).map((plan: SaasPlanRow) => ({
            id: plan.id,
            name: plan.name,
            slug: plan.slug,
            priceMonthly: plan.price_monthly,
            priceYearly: plan.price_yearly,
            features: plan.features || [],
            limits: plan.limits || {},
            description: plan.description,
            currency: plan.currency || 'USD',
            trialDays: plan.trial_days || 0,
            // Calcular ahorro anual
            yearlyDiscount: plan.price_yearly && plan.price_monthly
                ? Math.round((1 - (plan.price_yearly / 12) / plan.price_monthly) * 100)
                : 0,
        }));

        return NextResponse.json({
            success: true,
            plans: formattedPlans,
        });

    } catch (error) {
        console.error('Error in plans API:', error);
        return NextResponse.json({
            error: 'Error interno del servidor'
        }, { status: 500 });
    }
}
