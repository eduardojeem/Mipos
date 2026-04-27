import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase';
import { createAdminClient } from '@/lib/supabase/server';
import { getUserOrganizationId, validateOrganizationAccess } from '@/app/api/_utils/organization';

type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'void' | 'overdue';

type InvoiceItem = {
  description: string;
  quantity: number;
  unitPrice: number;
};

function parseCount(value: unknown) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 5;
  return Math.min(25, Math.max(1, Math.floor(num)));
}

function computeTotals(items: InvoiceItem[], discount: number, tax: number) {
  const safeItems = (Array.isArray(items) ? items : [])
    .map((it) => {
      const description = String(it.description || '').trim();
      const quantity = Number(it.quantity);
      const unitPrice = Number(it.unitPrice);
      if (!description) return null;
      if (!Number.isFinite(quantity) || quantity <= 0) return null;
      if (!Number.isFinite(unitPrice) || unitPrice < 0) return null;
      return {
        description,
        quantity,
        unitPrice,
        total: quantity * unitPrice,
      };
    })
    .filter(Boolean) as Array<{ description: string; quantity: number; unitPrice: number; total: number }>;

  const subtotal = safeItems.reduce((sum, it) => sum + it.total, 0);
  const safeDiscount = Number.isFinite(discount) ? Math.max(0, discount) : 0;
  const safeTax = Number.isFinite(tax) ? Math.max(0, tax) : 0;
  const total = Math.max(0, subtotal - safeDiscount + safeTax);

  return { items: safeItems, subtotal, discount: safeDiscount, tax: safeTax, total };
}

function ymd(date: Date) {
  return date.toISOString().slice(0, 10);
}

function randomSuffix() {
  return Math.floor(Math.random() * 9000) + 1000;
}

async function resolveOrgAndUser(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = await createServerClient(cookieStore);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false as const, status: 401, body: { error: 'Authentication required' } };
  }

  const headerOrgId = (request.headers.get('x-organization-id') || '').trim();
  let organizationId = headerOrgId;
  if (!organizationId) {
    const resolvedOrgId = await getUserOrganizationId(user.id);
    if (resolvedOrgId) organizationId = resolvedOrgId;
  }

  if (!organizationId) {
    return { ok: false as const, status: 400, body: { error: 'Organization required' } };
  }

  return { ok: true as const, user, organizationId };
}

export async function POST(request: NextRequest) {
  try {
    const enabled =
      process.env.ENABLE_DEMO_DATA === 'true' ||
      process.env.NEXT_PUBLIC_ENABLE_DEMO_DATA === 'true' ||
      process.env.NODE_ENV !== 'production';

    if (!enabled) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const auth = await resolveOrgAndUser(request);
    if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

    const membershipOk = await validateOrganizationAccess(auth.user.id, auth.organizationId);
    if (!membershipOk) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const count = parseCount(body?.count);
    const force = Boolean(body?.force);

    const supabase = await createAdminClient();

    if (!force) {
      const { count: existingCount, error: countError } = await supabase
        .from('pos_invoices')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', auth.organizationId);

      if (countError) {
        return NextResponse.json({ error: countError.message || 'Failed to check invoices' }, { status: 500 });
      }

      if ((existingCount || 0) > 0) {
        return NextResponse.json({ inserted: 0, skipped: true });
      }
    }

    const now = new Date();
    const baseCustomers = [
      { name: 'Cliente Demo', email: 'cliente@example.com', phone: '+54 11 5555-0000' },
      { name: 'Consumidor Final', email: null, phone: null },
      { name: 'Empresa Ejemplo SRL', email: 'compras@empresa-ejemplo.com', phone: '+54 11 4444-1234' },
      { name: 'Cliente Mostrador', email: null, phone: null },
    ];

    const baseItems: InvoiceItem[][] = [
      [
        { description: 'Suscripción mensual', quantity: 1, unitPrice: 49.99 },
        { description: 'Soporte extendido', quantity: 1, unitPrice: 15.0 },
      ],
      [
        { description: 'Producto A', quantity: 2, unitPrice: 12.5 },
        { description: 'Producto B', quantity: 1, unitPrice: 25.0 },
      ],
      [
        { description: 'Servicio técnico', quantity: 1, unitPrice: 80.0 },
      ],
      [
        { description: 'Paquete de horas', quantity: 3, unitPrice: 20.0 },
        { description: 'Descuento promo', quantity: 1, unitPrice: 0 },
      ],
    ];

    const statusPool: InvoiceStatus[] = ['draft', 'issued', 'paid', 'overdue', 'void'];
    const inserts = Array.from({ length: count }).map((_, idx) => {
      const customer = baseCustomers[idx % baseCustomers.length];
      const items = baseItems[idx % baseItems.length];
      const issued = new Date(now);
      issued.setDate(now.getDate() - (idx * 3 + 2));

      const due = new Date(issued);
      due.setDate(issued.getDate() + 10);

      const status = statusPool[idx % statusPool.length];
      const discount = idx % 3 === 0 ? 5 : 0;
      const tax = idx % 2 === 0 ? 0 : 3.5;
      const totals = computeTotals(items, discount, tax);

      return {
        organization_id: auth.organizationId,
        invoice_number: `DEMO-${ymd(now).replace(/-/g, '')}-${idx + 1}-${randomSuffix()}`,
        status,
        currency: 'USD',
        issued_date: ymd(issued),
        due_date: status === 'paid' || status === 'void' ? null : ymd(due),
        customer_id: null,
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone,
        customer_address: customer.name === 'Empresa Ejemplo SRL' ? 'Av. Siempre Viva 123' : null,
        customer_tax_id: customer.name === 'Empresa Ejemplo SRL' ? '30-12345678-9' : null,
        items: totals.items,
        subtotal: totals.subtotal,
        discount: totals.discount,
        tax: totals.tax,
        total: totals.total,
        notes: 'Factura de ejemplo generada automáticamente.',
        updated_at: new Date().toISOString(),
        updated_by: auth.user.id,
      };
    });

    const { error: insertError, data } = await supabase
      .from('pos_invoices')
      .insert(inserts)
      .select('id');

    if (insertError) {
      return NextResponse.json({ error: insertError.message || 'Failed to seed invoices' }, { status: 500 });
    }

    return NextResponse.json({ inserted: (data || []).length, skipped: false });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message || 'Unexpected error' }, { status: 500 });
  }
}
