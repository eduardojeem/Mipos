import { NextRequest, NextResponse } from 'next/server';
import { assertSuperAdmin } from '@/app/api/_utils/auth';
import { createAdminClient } from '@/lib/supabase/server';

type InvoiceStatus = 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';

type InvoiceRow = {
  id?: unknown;
  organization_id?: unknown;
  subscription_id?: unknown;
  invoice_number?: unknown;
  amount?: unknown;
  currency?: unknown;
  status?: unknown;
  due_date?: unknown;
  paid_at?: unknown;
  items?: unknown;
  metadata?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
  organizations?: unknown;
};

type SubscriptionRow = {
  organization_id?: unknown;
  billing_cycle?: unknown;
  status?: unknown;
  saas_plans?: unknown;
};

const statusValues: InvoiceStatus[] = ['draft', 'open', 'paid', 'void', 'uncollectible'];

function asRecord(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) return asRecord(value[0]);
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeStatus(value: unknown): InvoiceStatus {
  const status = asString(value, 'open').toLowerCase() as InvoiceStatus;
  return statusValues.includes(status) ? status : 'open';
}

function slugFromName(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'unknown';
}

function isOverdue(status: InvoiceStatus, dueDate: string) {
  return status === 'open' && Boolean(dueDate) && new Date(dueDate).getTime() < Date.now();
}

function daysOverdue(status: InvoiceStatus, dueDate: string) {
  if (!isOverdue(status, dueDate)) return 0;
  return Math.ceil((Date.now() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24));
}

function metadataUrl(metadata: Record<string, unknown> | null, key: string) {
  const value = metadata?.[key];
  return typeof value === 'string' && value.trim() ? value : null;
}

function formatInvoice(row: InvoiceRow, subscriptionsByOrg: Map<string, SubscriptionRow>) {
  const organization = asRecord(row.organizations);
  const metadata = asRecord(row.metadata);
  const organizationId = asString(row.organization_id, asString(organization?.id));
  const organizationName = asString(organization?.name, 'Organizacion sin nombre');
  const subscription = subscriptionsByOrg.get(organizationId);
  const plan = asRecord(subscription?.saas_plans);
  const status = normalizeStatus(row.status);
  const dueDate = asString(row.due_date);

  return {
    id: asString(row.id),
    organizationId,
    organizationName,
    organizationSlug: slugFromName(organizationName),
    subscriptionId: asString(row.subscription_id),
    invoiceNumber: asString(row.invoice_number, 'SIN-NUMERO'),
    amount: asNumber(row.amount),
    currency: asString(row.currency, 'USD'),
    status,
    overdue: isOverdue(status, dueDate),
    daysOverdue: daysOverdue(status, dueDate),
    dueDate,
    paidAt: asString(row.paid_at) || null,
    planName: asString(plan?.name, 'Plan no asociado'),
    billingCycle: asString(subscription?.billing_cycle, 'monthly'),
    subscriptionStatus: asString(subscription?.status),
    items: Array.isArray(row.items) ? row.items : [],
    pdfUrl: metadataUrl(metadata, 'pdf_url'),
    receiptUrl: metadataUrl(metadata, 'receipt_url'),
    lastSentAt: metadataUrl(metadata, 'last_sent_at'),
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at)
  };
}

function emptyResponse(page: number, limit: number) {
  return NextResponse.json({
    success: true,
    data: [],
    summary: {
      total: 0,
      open: 0,
      paid: 0,
      overdue: 0,
      void: 0,
      uncollectible: 0,
      outstandingAmount: 0,
      paidAmount: 0,
      overdueAmount: 0,
      collectionRate: 0
    },
    pagination: { page, limit, total: 0, pages: 0 }
  });
}

export async function GET(request: NextRequest) {
  const auth = await assertSuperAdmin(request);
  if (!('ok' in auth) || auth.ok === false) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10), 1), 100);
    const status = searchParams.get('status') || 'all';
    const search = searchParams.get('search')?.trim();
    const skip = (page - 1) * limit;
    const admin = await createAdminClient();

    let matchingOrgIds: string[] = [];
    if (search) {
      const { data: orgMatches } = await admin
        .from('organizations')
        .select('id')
        .ilike('name', `%${search}%`)
        .limit(200);

      matchingOrgIds = (orgMatches || []).map((org: { id: string }) => org.id).filter(Boolean);
    }

    const selectFields = `
      id,
      organization_id,
      subscription_id,
      invoice_number,
      amount,
      currency,
      status,
      due_date,
      paid_at,
      items,
      metadata,
      created_at,
      updated_at,
      organizations ( id, name )
    `;

    let query = admin.from('invoices').select(selectFields, { count: 'exact' });
    let summaryQuery = admin.from('invoices').select(selectFields);

    if (search) {
      const filters = [`invoice_number.ilike.%${search}%`];
      if (matchingOrgIds.length > 0) filters.push(`organization_id.in.(${matchingOrgIds.join(',')})`);
      query = query.or(filters.join(','));
      summaryQuery = summaryQuery.or(filters.join(','));
    }

    if (status !== 'all') {
      if (status === 'overdue') {
        query = query.eq('status', 'open').lt('due_date', new Date().toISOString());
      } else {
        query = query.ilike('status', status);
      }
    }

    query = query.range(skip, skip + limit - 1).order('created_at', { ascending: false });
    summaryQuery = summaryQuery.limit(5000);

    const [{ data: invoices, count, error }, { data: summaryRows }, { data: subscriptions }] = await Promise.all([
      query,
      summaryQuery,
      admin
        .from('saas_subscriptions')
        .select('organization_id,billing_cycle,status,saas_plans(name)')
        .order('created_at', { ascending: false })
    ]);

    if (error) {
      if (error.code === '42P01') return emptyResponse(page, limit);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const subscriptionsByOrg = new Map<string, SubscriptionRow>();
    ((subscriptions || []) as SubscriptionRow[]).forEach((subscription) => {
      const orgId = asString(subscription.organization_id);
      if (orgId && !subscriptionsByOrg.has(orgId)) subscriptionsByOrg.set(orgId, subscription);
    });

    const formattedData = ((invoices || []) as InvoiceRow[]).map((row) => formatInvoice(row, subscriptionsByOrg));
    const formattedSummaryRows = ((summaryRows || []) as InvoiceRow[]).map((row) => formatInvoice(row, subscriptionsByOrg));

    const summary = formattedSummaryRows.reduce(
      (acc, invoice) => {
        acc.total += 1;
        if (invoice.status === 'open') acc.open += 1;
        if (invoice.status === 'paid') acc.paid += 1;
        if (invoice.status === 'void') acc.void += 1;
        if (invoice.status === 'uncollectible') acc.uncollectible += 1;
        if (invoice.overdue) {
          acc.overdue += 1;
          acc.overdueAmount += invoice.amount;
        }
        if (invoice.status === 'open' || invoice.status === 'uncollectible') acc.outstandingAmount += invoice.amount;
        if (invoice.status === 'paid') acc.paidAmount += invoice.amount;
        return acc;
      },
      {
        total: 0,
        open: 0,
        paid: 0,
        overdue: 0,
        void: 0,
        uncollectible: 0,
        outstandingAmount: 0,
        paidAmount: 0,
        overdueAmount: 0,
        collectionRate: 0
      }
    );

    const collectible = summary.paidAmount + summary.outstandingAmount;
    summary.collectionRate = collectible > 0 ? Math.round((summary.paidAmount / collectible) * 100) : 0;

    return NextResponse.json(
      {
        success: true,
        data: formattedData,
        summary,
        pagination: {
          page,
          limit,
          total: count || 0,
          pages: Math.ceil((count || 0) / limit)
        }
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
