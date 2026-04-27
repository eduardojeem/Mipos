import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase';
import { createAdminClient } from '@/lib/supabase/server';
import { getUserOrganizationId, validateOrganizationAccess } from '@/app/api/_utils/organization';
import { validateRole } from '@/app/api/_utils/role-validation';

type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'void' | 'overdue';

type InvoiceItemInput = {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
};

function normalizeStatus(value: unknown): InvoiceStatus | null {
  if (typeof value !== 'string') return null;
  const v = value.trim().toLowerCase();
  if (v === 'draft' || v === 'issued' || v === 'paid' || v === 'void' || v === 'overdue') return v;
  return null;
}

function normalizeDate(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  return trimmed;
}

function safeText(value: unknown, max: number) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function computeTotals(items: InvoiceItemInput[], discount: number, tax: number) {
  const safeItems = (Array.isArray(items) ? items : [])
    .map((item) => {
      const description = String(item.description || '').trim();
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);
      if (!description) return null;
      if (!Number.isFinite(quantity) || quantity <= 0) return null;
      if (!Number.isFinite(unitPrice) || unitPrice < 0) return null;
      const total = quantity * unitPrice;
      return {
        id: item.id ? String(item.id) : undefined,
        description,
        quantity,
        unitPrice,
        total,
      };
    })
    .filter(Boolean) as Array<{ id?: string; description: string; quantity: number; unitPrice: number; total: number }>;

  const subtotal = safeItems.reduce((sum, it) => sum + it.total, 0);
  const safeDiscount = Number.isFinite(discount) ? Math.max(0, discount) : 0;
  const safeTax = Number.isFinite(tax) ? Math.max(0, tax) : 0;
  const total = Math.max(0, subtotal - safeDiscount + safeTax);

  return {
    items: safeItems,
    subtotal,
    discount: safeDiscount,
    tax: safeTax,
    total,
  };
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
    const resolved = await getUserOrganizationId(user.id);
    if (resolved) organizationId = resolved;
  }

  if (!organizationId) {
    return { ok: false as const, status: 400, body: { error: 'Organization required' } };
  }

  return { ok: true as const, user, organizationId };
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await resolveOrgAndUser(request);
    if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

    const membershipOk = await validateOrganizationAccess(auth.user.id, auth.organizationId);
    if (!membershipOk) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { id } = await context.params;
    const invoiceId = String(id || '').trim();
    if (!invoiceId) {
      return NextResponse.json({ error: 'Missing invoice id' }, { status: 400 });
    }

    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from('pos_invoices')
      .select('*')
      .eq('organization_id', auth.organizationId)
      .eq('id', invoiceId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message || 'Failed to load invoice' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: (data as any).id,
      invoiceNumber: (data as any).invoice_number,
      status: (data as any).status,
      currency: (data as any).currency,
      issuedDate: (data as any).issued_date,
      dueDate: (data as any).due_date,
      customerId: (data as any).customer_id,
      customerName: (data as any).customer_name,
      customerEmail: (data as any).customer_email,
      customerPhone: (data as any).customer_phone,
      customerAddress: (data as any).customer_address,
      customerTaxId: (data as any).customer_tax_id,
      items: (data as any).items || [],
      subtotal: Number((data as any).subtotal || 0),
      discount: Number((data as any).discount || 0),
      tax: Number((data as any).tax || 0),
      total: Number((data as any).total || 0),
      notes: (data as any).notes || '',
      createdAt: (data as any).created_at,
      updatedAt: (data as any).updated_at,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message || 'Unexpected error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const roleValidation = await validateRole(request, {
      roles: ['ADMIN', 'SUPER_ADMIN', 'MANAGER'],
    });
    if (!roleValidation.ok) {
      return NextResponse.json(roleValidation.body, { status: roleValidation.status });
    }

    const auth = await resolveOrgAndUser(request);
    if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

    if (roleValidation.userRole !== 'SUPER_ADMIN') {
      const membershipOk = await validateOrganizationAccess(auth.user.id, auth.organizationId);
      if (!membershipOk) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    const { id } = await context.params;
    const invoiceId = String(id || '').trim();
    if (!invoiceId) {
      return NextResponse.json({ error: 'Missing invoice id' }, { status: 400 });
    }

    const supabase = await createAdminClient();

    const { data: current, error: loadError } = await supabase
      .from('pos_invoices')
      .select('id, status')
      .eq('organization_id', auth.organizationId)
      .eq('id', invoiceId)
      .maybeSingle();

    if (loadError) {
      return NextResponse.json({ error: loadError.message || 'Failed to load invoice' }, { status: 500 });
    }

    if (!current) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const body = await request.json();

    const nextStatus = normalizeStatus(body?.status);
    const dueDate = normalizeDate(body?.dueDate);
    const issuedDate = normalizeDate(body?.issuedDate);
    const notes = safeText(body?.notes, 1000);

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      updated_by: auth.user.id,
    };

    const currentStatus = String((current as any).status || 'draft').toLowerCase();
    const isDraft = currentStatus === 'draft';

    if (nextStatus) patch.status = nextStatus;
    if (dueDate !== null) patch.due_date = dueDate;
    if (issuedDate !== null) patch.issued_date = issuedDate;
    if (notes !== null) patch.notes = notes;

    if (isDraft) {
      const currency = safeText(body?.currency, 8);
      const customerId = safeText(body?.customerId, 80);
      const customerName = safeText(body?.customerName, 160);
      const customerEmail = safeText(body?.customerEmail, 160);
      const customerPhone = safeText(body?.customerPhone, 80);
      const customerAddress = safeText(body?.customerAddress, 240);
      const customerTaxId = safeText(body?.customerTaxId, 80);
      const invoiceNumber = safeText(body?.invoiceNumber, 60);

      if (currency) patch.currency = currency;
      if (invoiceNumber) patch.invoice_number = invoiceNumber;
      if (customerId !== null) patch.customer_id = customerId;
      if (customerName !== null) patch.customer_name = customerName;
      if (customerEmail !== null) patch.customer_email = customerEmail;
      if (customerPhone !== null) patch.customer_phone = customerPhone;
      if (customerAddress !== null) patch.customer_address = customerAddress;
      if (customerTaxId !== null) patch.customer_tax_id = customerTaxId;

      if (Array.isArray(body?.items)) {
        const itemsInput = body.items as InvoiceItemInput[];
        const discount = Number(body?.discount || 0);
        const tax = Number(body?.tax || 0);
        const totals = computeTotals(itemsInput, discount, tax);
        if (totals.items.length === 0) {
          return NextResponse.json({ error: 'At least one item is required' }, { status: 400 });
        }
        patch.items = totals.items;
        patch.subtotal = totals.subtotal;
        patch.discount = totals.discount;
        patch.tax = totals.tax;
        patch.total = totals.total;
      }
    } else {
      if (Array.isArray(body?.items) || body?.customerName || body?.discount || body?.tax) {
        return NextResponse.json({ error: 'Only draft invoices can be edited' }, { status: 400 });
      }
    }

    const { data: updated, error: updateError } = await supabase
      .from('pos_invoices')
      .update(patch)
      .eq('organization_id', auth.organizationId)
      .eq('id', invoiceId)
      .select('id, invoice_number, status, updated_at')
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message || 'Failed to update invoice' }, { status: 500 });
    }

    return NextResponse.json({
      id: (updated as any).id,
      invoiceNumber: (updated as any).invoice_number,
      status: (updated as any).status,
      updatedAt: (updated as any).updated_at,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message || 'Unexpected error' }, { status: 500 });
  }
}

