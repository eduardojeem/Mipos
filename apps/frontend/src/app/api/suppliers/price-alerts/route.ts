import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = await createServerClient(cookieStore);

    const { data, error } = await supabase
      .from('price_alerts')
      .select(`
        *,
        product:products (id, name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === '42P01') {
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
    const cookieStore = await cookies();
    const supabase = await createServerClient(cookieStore);

    if (!body.productId || !body.targetPrice || !body.condition) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('price_alerts')
      .insert({
        product_id: body.productId,
        target_price: body.targetPrice,
        condition: body.condition,
        threshold: body.threshold,
        is_active: body.isActive ?? true,
        notification_email: body.notificationEmail
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
