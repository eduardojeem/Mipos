import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase';
import { getValidatedOrganizationId } from '@/lib/organization';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const orgId = (await getValidatedOrganizationId(request)) || '';
    if (!orgId) {
      return NextResponse.json({ error: 'Organization header missing' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = await createServerClient(cookieStore);

    if (body.targetPrice != null) {
      const target = Number(body.targetPrice);
      if (!Number.isFinite(target) || target < 0) {
        return NextResponse.json({ error: 'El precio objetivo debe ser >= 0' }, { status: 400 });
      }
    }

    const { data, error } = await supabase
      .from('price_alerts')
      .update({
        product_id: body.productId,
        target_price: body.targetPrice,
        condition: body.condition,
        threshold: body.threshold,
        is_active: body.isActive,
        notification_email: body.notificationEmail,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('organization_id', orgId) // multi-tenant guard
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: 'Alerta no encontrada' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const orgId = (await getValidatedOrganizationId(request)) || '';
    if (!orgId) {
      return NextResponse.json({ error: 'Organization header missing' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = await createServerClient(cookieStore);

    const { error } = await supabase
      .from('price_alerts')
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId); // multi-tenant guard

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
