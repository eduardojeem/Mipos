import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createAdminClient();

    const { data: organizations, error, count } = await supabase
      .from('organizations')
      .select('id, name, slug, created_at', { count: 'exact' })
      .eq('subscription_status', 'ACTIVE')
      .order('created_at', { ascending: false })
      .limit(24);

    if (error) {
      console.error('Error fetching organizations:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      organizations: organizations || [],
      count: typeof count === 'number' ? count : organizations?.length || 0,
    });
  } catch (error) {
    console.error('Error in public organizations API:', error);
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
      },
      { status: 500 }
    );
  }
}
