import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { assertSuperAdmin } from '@/app/api/_utils/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // In Next.js 15, params is a Promise
) {
  const auth = await assertSuperAdmin(request);
  if (!('ok' in auth) || auth.ok === false) {
      return NextResponse.json(auth.body, { status: auth.status });
  }

  try {
    const { id } = await params;
    const supabaseAdmin = await createAdminClient();

    // 1. Encontrar la organización a partir de la suscripcion id en saas_subscriptions
    const { data: saasSub, error: saasErr } = await supabaseAdmin
      .from('saas_subscriptions')
      .select('organization_id')
      .eq('id', id)
      .single();

    if (saasErr || !saasSub) {
      return NextResponse.json({ error: 'Suscripción no encontrada' }, { status: 404 });
    }

    // 2. Encontrar el plan activo en plan_subscriptions para la organización
    const { data: planSub, error: planSubErr } = await supabaseAdmin
      .from('plan_subscriptions')
      .select('id, plan_type')
      .eq('company_id', saasSub.organization_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (planSubErr || !planSub) {
       // A fallback for empty usage if plan_subscriptions not created yet
       return NextResponse.json({
          success: true,
          data: {
             usage: { usersCount: 0, productsCount: 0, salesCount: 0, storageUsed: 0, apiCallsCount: 0 },
             limits: { users: 0, products: 0, sales: 0, storage: 0, apiCalls: 0 }
          }
       });
    }

    // 3. Buscar limites y uso desde usage_limits
    const { data: limitsData } = await supabaseAdmin
      .from('usage_limits')
      .select('feature_type, limit_value, current_usage')
      .eq('subscription_id', planSub.id);

    const usageLimitsList = limitsData || [];

    const getLimit = (feature: string) => {
       const fd = usageLimitsList.find(l => l.feature_type === feature);
       // 999999 is unlimited, -1 representation on frontend
       const val = fd ? fd.limit_value : 0;
       return val >= 999999 ? -1 : val;
    };
    const getUsage = (feature: string) => {
       const fd = usageLimitsList.find(l => l.feature_type === feature);
       return fd ? fd.current_usage : 0;
    };

    return NextResponse.json({
       success: true,
       data: {
          usage: {
            usersCount: getUsage('users'),
            productsCount: getUsage('products'),
            salesCount: getUsage('sales'),
            storageUsed: getUsage('storage'),
            apiCallsCount: getUsage('api_calls')
          },
          limits: {
            users: getLimit('users'),
            products: getLimit('products'),
            sales: getLimit('sales'),
            storage: getLimit('storage'),
            apiCalls: getLimit('api_calls')
          }
       }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
