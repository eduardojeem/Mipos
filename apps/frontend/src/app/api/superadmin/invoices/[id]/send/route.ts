import { NextRequest, NextResponse } from 'next/server';
import { assertSuperAdmin } from '@/app/api/_utils/auth';
import { createAdminClient } from '@/lib/supabase/server';

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export async function POST(
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

    const { data: invoice, error: loadError } = await admin
      .from('invoices')
      .select('id,status,metadata')
      .eq('id', id)
      .single();

    if (loadError || !invoice) {
      return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const metadata = {
      ...asRecord((invoice as { metadata?: unknown }).metadata),
      last_sent_at: now,
      delivery_status: 'queued'
    };

    const { data, error } = await admin
      .from('invoices')
      .update({ metadata, updated_at: now })
      .eq('id', id)
      .select('id,metadata')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'Factura marcada para envio. Configura el proveedor de email para despacho real.'
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
