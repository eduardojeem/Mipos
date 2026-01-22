import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get('supplierId');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '50');

    const cookieStore = await cookies();
    const supabase = await createServerClient(cookieStore);

    let query = supabase
      .from('supplier_alerts')
      .select(`
        *,
        supplier:suppliers (
          id,
          name,
          category
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (supplierId) {
      query = query.eq('supplier_id', supplierId);
    }

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (type && type !== 'all') {
      query = query.eq('type', type);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching alerts:', error);
      // Return mock data if table doesn't exist (error code 42P01 is undefined_table in Postgres)
      // or just return empty array/error
      if (error.code === '42P01') {
        return NextResponse.json({ alerts: [] }); 
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform data to match frontend interface if needed
    const alerts = data?.map((alert: any) => ({
      id: alert.id,
      type: alert.type,
      title: alert.title,
      description: alert.description,
      severity: alert.severity,
      status: alert.status,
      supplierId: alert.supplier_id,
      supplierName: alert.supplier?.name || 'Unknown Supplier',
      category: alert.supplier?.category || 'General',
      triggeredAt: alert.created_at, // Mapping created_at to triggeredAt as per frontend interface
      dueDate: alert.due_date,
      resolvedAt: alert.resolved_at,
      metadata: alert.metadata,
      createdAt: alert.created_at,
      updatedAt: alert.updated_at
    })) || [];

    return NextResponse.json({ alerts });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const cookieStore = await cookies();
    const supabase = await createServerClient(cookieStore);

    // Validate body
    if (!body.supplierId || !body.type || !body.title) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('supplier_alerts')
      .insert({
        supplier_id: body.supplierId,
        type: body.type,
        title: body.title,
        description: body.description,
        severity: body.severity || 'medium',
        status: 'active',
        due_date: body.dueDate,
        metadata: body.metadata,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating alert:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ alert: data });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, resolution_notes } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'Missing id or status' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = await createServerClient(cookieStore);

    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'resolved') {
      updateData.resolved_at = new Date().toISOString();
      if (resolution_notes) updateData.metadata = { resolution_notes }; // Append to metadata in real implementation
    }

    const { data, error } = await supabase
      .from('supplier_alerts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ alert: data });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
