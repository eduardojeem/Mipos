import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { structuredLogger } from '@/lib/logger';
import { assertSuperAdmin } from '@/app/api/_utils/auth';

const COMPONENT = 'SuperAdminOrganizationDetailAPI';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await assertSuperAdmin(request);
  if (!('ok' in auth) || auth.ok === false) {
      return NextResponse.json(auth.body, { status: auth.status });
  }

  try {
    const { id } = params;
    const supabase = await createClient();

    const { data: organization, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      structuredLogger.error('Error fetching organization detail', error, { 
        component: COMPONENT, 
        action: 'GET', 
        metadata: { id } 
      });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, organization });
  } catch (error) {
    structuredLogger.error('Unexpected error in GET organization detail', error as Error, { 
      component: COMPONENT,
      action: 'GET'
    });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await assertSuperAdmin(request);
  if (!('ok' in auth) || auth.ok === false) {
      return NextResponse.json(auth.body, { status: auth.status });
  }

  try {
    const { id } = params;
    const supabase = await createClient();
    const body = await request.json();

    const { data, error } = await supabase
      .from('organizations')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      structuredLogger.error('Error updating organization detail', error, { 
        component: COMPONENT, 
        action: 'PATCH', 
        metadata: { id } 
      });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, organization: data });
  } catch (error) {
    structuredLogger.error('Unexpected error in PATCH organization detail', error as Error, { 
      component: COMPONENT,
      action: 'PATCH'
    });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
