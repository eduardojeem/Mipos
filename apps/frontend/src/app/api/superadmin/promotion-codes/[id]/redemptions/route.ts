import { NextRequest, NextResponse } from 'next/server';
import { assertSuperAdmin } from '@/app/api/_utils/auth';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await assertSuperAdmin(request);
  if (!('ok' in auth) || auth.ok === false) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  try {
    const { id } = await params;
    const admin = await createAdminClient();

    const { data: redemptions, error } = await admin
      .from('saas_promotion_redemptions')
      .select(`
        id,
        redeemed_at,
        status,
        error_message,
        organization:organizations (
          id,
          name,
          slug
        ),
        target_plan:saas_plans (
          id,
          name,
          slug
        )
      `)
      .eq('promotion_code_id', id)
      .order('redeemed_at', { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: redemptions,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
