import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { assertSuperAdmin } from '@/app/api/_utils/auth';

export async function POST(
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

    // 1. Get saas_subscription details
    const { data: saasSub, error: saasErr } = await supabaseAdmin
      .from('saas_subscriptions')
      .select('organization_id')
      .eq('id', id)
      .single();

    if (saasErr || !saasSub) {
      return NextResponse.json({ error: 'Suscripción no encontrada' }, { status: 404 });
    }

    // 2. Reactivate on saas_subscriptions
    await supabaseAdmin
      .from('saas_subscriptions')
      .update({ status: 'ACTIVE', updated_at: new Date().toISOString() })
      .eq('id', id);

    // 3. Reactivate plan_subscriptions
    await supabaseAdmin
      .from('plan_subscriptions')
      .update({ is_active: true })
      .eq('company_id', saasSub.organization_id);

    return NextResponse.json({
       success: true,
       message: 'Subscription reactivated successfully'
    });

  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
