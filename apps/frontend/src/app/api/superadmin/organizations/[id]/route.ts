import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { structuredLogger } from '@/lib/logger';

const COMPONENT = 'SuperAdminOrganizationDetailAPI';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const supabase = await createClient();
    
    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Role check
    const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single();
    if (userData?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

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
  try {
    const { id } = params;
    const supabase = await createClient();
    const body = await request.json();
    
    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    const { data: userData } = await supabase.from('users').select('role').eq('id', user?.id).single();
    if (userData?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

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
