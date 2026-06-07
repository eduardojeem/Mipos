import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase';
import { getValidatedOrganizationId } from '@/lib/organization';

// La tabla puede no existir (42P01) o no tener organization_id (42703)
function isMissingTableOrColumn(error: { code?: string } | null) {
  return error?.code === '42P01' || error?.code === '42703';
}

export async function GET(request: NextRequest) {
  try {
    const orgId = (await getValidatedOrganizationId(request)) || '';
    if (!orgId) return NextResponse.json([]);

    const cookieStore = await cookies();
    const supabase = await createServerClient(cookieStore);

    const { data, error } = await supabase
      .from('price_alerts')
      .select(`
        *,
        product:products (id, name)
      `)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      if (isMissingTableOrColumn(error)) {
        return NextResponse.json([]);
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const alerts = data?.map((alert: any) => ({
      id: alert.id,
      productId: alert.product_id,
      productName: alert.product?.name || 'Unknown Product',
      targetPrice: alert.target_price,
      condition: alert.condition,
      threshold: alert.threshold,
      isActive: alert.is_active,
      createdAt: alert.created_at,
      lastTriggered: alert.last_triggered,
      notificationEmail: alert.notification_email
    })) || [];

    return NextResponse.json(alerts);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const orgId = (await getValidatedOrganizationId(request)) || '';
    if (!orgId) {
      return NextResponse.json({ error: 'Organization header missing' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = await createServerClient(cookieStore);

    if (!body.productId || body.targetPrice == null || !body.condition) {
      return NextResponse.json({ error: 'Faltan campos requeridos (productId, targetPrice, condition)' }, { status: 400 });
    }
    const target = Number(body.targetPrice);
    if (!Number.isFinite(target) || target < 0) {
      return NextResponse.json({ error: 'El precio objetivo debe ser >= 0' }, { status: 400 });
    }

    // Verificar que el producto pertenece a la organización
    const { data: product } = await supabase
      .from('products')
      .select('id')
      .eq('id', body.productId)
      .eq('organization_id', orgId)
      .maybeSingle();
    if (!product) {
      return NextResponse.json({ error: 'Producto no encontrado en la organización' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('price_alerts')
      .insert({
        product_id: body.productId,
        target_price: target,
        condition: body.condition,
        threshold: body.threshold,
        is_active: body.isActive ?? true,
        notification_email: body.notificationEmail,
        organization_id: orgId,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
