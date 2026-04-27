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

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

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

function generateInvoiceNumber() {
  const now = new Date();
  const y = String(now.getFullYear());
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `INV-${y}${m}${d}-${rand}`;
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

export async function GET(request: NextRequest) {
  try {
    const auth = await resolveOrgAndUser(request);
    if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

    const membershipOk = await validateOrganizationAccess(auth.user.id, auth.organizationId);
    if (!membershipOk) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parsePositiveInt(searchParams.get('page'), 1);
    const limit = Math.min(parsePositiveInt(searchParams.get('limit'), 25), 100);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const status = normalizeStatus(searchParams.get('status'));
    const search = searchParams.get('search')?.trim() || '';
    const fromDate = normalizeDate(searchParams.get('fromDate'));
    const toDate = normalizeDate(searchParams.get('toDate'));

    const supabase = await createAdminClient();

    let query = supabase
      .from('pos_invoices')
      .select(
        'id, invoice_number, status, currency, issued_date, due_date, customer_name, total, created_at, updated_at',
        { count: 'exact' }
      )
      .eq('organization_id', auth.organizationId);

    if (status) {
      query = query.eq('status', status);
    }

    if (search) {
      const s = search.replace(/%/g, '\\%').replace(/_/g, '\\_');
      query = query.or(`invoice_number.ilike.%${s}%,customer_name.ilike.%${s}%`);
    }

    if (fromDate) {
      query = query.gte('issued_date', fromDate);
    }

    if (toDate) {
      query = query.lte('issued_date', toDate);
    }

    const { data, error, count } = await query
      .order('issued_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      return NextResponse.json({ error: error.message || 'Failed to load invoices' }, { status: 500 });
    }

    return NextResponse.json({
      invoices: (data || []).map((row: any) => ({
        id: row.id,
        invoiceNumber: row.invoice_number,
        status: row.status,
        currency: row.currency,
        issuedDate: row.issued_date,
        dueDate: row.due_date,
        customerName: row.customer_name,
        total: Number(row.total || 0),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
      pagination: {
        page,
        limit,
        total: count || 0,
      },
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message || 'Unexpected error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const currency = safeText(body?.currency, 8) || 'USD';
    const issuedDate = normalizeDate(body?.issuedDate) || new Date().toISOString().slice(0, 10);
    const dueDate = normalizeDate(body?.dueDate);
    const status = normalizeStatus(body?.status) || 'draft';
    const notes = safeText(body?.notes, 1000);

    const customerId = safeText(body?.customerId, 80);
    const customerName = safeText(body?.customerName, 160);
    const customerEmail = safeText(body?.customerEmail, 160);
    const customerPhone = safeText(body?.customerPhone, 80);
    const customerAddress = safeText(body?.customerAddress, 240);
    const customerTaxId = safeText(body?.customerTaxId, 80);

    const itemsInput = Array.isArray(body?.items) ? (body.items as InvoiceItemInput[]) : [];
    const discount = Number(body?.discount || 0);
    const tax = Number(body?.tax || 0);
    const totals = computeTotals(itemsInput, discount, tax);

    if (totals.items.length === 0) {
      return NextResponse.json({ error: 'At least one item is required' }, { status: 400 });
    }

    const supabase = await createAdminClient();

    const explicitInvoiceNumber = safeText(body?.invoiceNumber, 60);
    let invoiceNumber = explicitInvoiceNumber || generateInvoiceNumber();

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const { data, error } = await supabase
        .from('pos_invoices')
        .insert({
          organization_id: auth.organizationId,
          invoice_number: invoiceNumber,
          status,
          currency,
          issued_date: issuedDate,
          due_date: dueDate,
          customer_id: customerId,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          customer_address: customerAddress,
          customer_tax_id: customerTaxId,
          items: totals.items,
          subtotal: totals.subtotal,
          discount: totals.discount,
          tax: totals.tax,
          total: totals.total,
          notes,
          updated_at: new Date().toISOString(),
          updated_by: auth.user.id,
        })
        .select('id, invoice_number')
        .single();

      if (!error) {
        return NextResponse.json({
          id: (data as any).id,
          invoiceNumber: (data as any).invoice_number,
        });
      }

      const code = String((error as any)?.code || '').toUpperCase();
      const message = String((error as any)?.message || '').toLowerCase();
      const isUnique = code === '23505' || message.includes('duplicate key');
      if (!isUnique) {
        return NextResponse.json({ error: error.message || 'Failed to create invoice' }, { status: 500 });
      }

      invoiceNumber = generateInvoiceNumber();
    }

    return NextResponse.json({ error: 'Failed to generate unique invoice number' }, { status: 500 });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message || 'Unexpected error' }, { status: 500 });
  }
}

