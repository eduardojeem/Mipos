import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { dedupeCanonicalPlans, getCanonicalPlanAliases, getCanonicalPlanDisplayName, normalizePlanSlug } from '@/lib/plan-catalog';

interface SaasPlanRow {
    id: string;
    name: string;
    slug: string;
    price_monthly: number;
    price_yearly: number;
    features: string[];
    max_users?: number | null;
    max_products?: number | null;
    max_transactions_per_month?: number | null;
    max_locations?: number | null;
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

        const canonicalPlans = dedupeCanonicalPlans((plans || []) as SaasPlanRow[], (current, candidate) => {
            if (!current) return candidate;
            const aliases = getCanonicalPlanAliases(candidate.slug);
            const currentIndex = aliases.indexOf(String(current.slug || '').toLowerCase());
            const candidateIndex = aliases.indexOf(String(candidate.slug || '').toLowerCase());
            return candidateIndex !== -1 && (currentIndex === -1 || candidateIndex < currentIndex) ? candidate : current;
        });

        const formattedPlans = canonicalPlans.map((plan: SaasPlanRow) => ({
            id: plan.id,
            name: getCanonicalPlanDisplayName(plan.slug),
            slug: normalizePlanSlug(plan.slug),
            priceMonthly: Number(plan.price_monthly || 0),
            priceYearly: Number(plan.price_yearly || 0),
            features: plan.features || [],
            limits: plan.limits || {
                maxUsers: Number(plan.max_users || 0) || 1,
                maxProducts: Number(plan.max_products || 0) || 20,
                maxTransactionsPerMonth: Number(plan.max_transactions_per_month || 0) || 50,
                maxLocations: Number(plan.max_locations || 0) || 1,
            },
            description: plan.description,
            currency: plan.currency || 'PYG',
            trialDays: plan.trial_days || 0,
            // Calcular ahorro anual
            yearlyDiscount: plan.price_yearly && plan.price_monthly
                ? Math.round((1 - (Number(plan.price_yearly) / 12) / Number(plan.price_monthly)) * 100)
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
