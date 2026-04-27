import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getRequestOperationalContext } from '@/app/api/_utils/operational-context';

function getBackendBaseURL(): string | null {
  const url = process.env.BACKEND_URL;
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\/+$/, '') + '/api';
}

function getBackendHeaders(
  accessToken: string | undefined,
  organizationId: string,
  context: ReturnType<typeof getRequestOperationalContext>,
): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'x-organization-id': organizationId,
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (context.branchId) headers['x-branch-id'] = context.branchId;
  if (context.posId) { headers['x-pos-id'] = context.posId; headers['x-register-id'] = context.posId; }
  return headers;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await params;
    const saleId = (rawId || '').trim();
    if (!saleId) return NextResponse.json({ error: 'Missing sale id' }, { status: 400 });

    const supabase = await createClient();
    const client = supabase as unknown as { auth: { getUser: () => Promise<{ data: { user: unknown } }>; getSession: () => Promise<{ data: { session: { access_token?: string } | null } }> }; from: (table: string) => unknown };
    const { data: { user } } = await client.auth.getUser();
    const { data: { session } } = await client.auth.getSession();
    const accessToken: string | undefined = session?.access_token;
    const canQuery = typeof client.from === 'function' && !!user;

    const orgId = (request.headers.get('x-organization-id') || '').trim();
    if (!orgId) return NextResponse.json({ error: 'Organization header missing' }, { status: 400 });

    const include = (new URL(request.url).searchParams.get('include') || '').toLowerCase();
    const includeItems = include.includes('items');
    const includeProduct = include.includes('product') || includeItems;

    if (canQuery) {
      const baseFields = '*, customer:customers (id, name, email, phone)';
      const itemsFields = includeItems
        ? ', sale_items (id, sale_id, product_id, quantity, unit_price, total_price, discount_amount' + (includeProduct ? ', products (id, name, sku)' : '') + ')'
        : '';
      const selectFields = baseFields + itemsFields;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: sale, error } = await (supabase as unknown as Record<string, any>)
        .from('sales')
        .select(selectFields)
        .eq('organization_id', orgId)
        .eq('id', saleId)
        .maybeSingle();

      if (!error && sale) {
        return NextResponse.json({ success: true, sale });
      }
    }

    // Fallback to backend
    const backendBase = getBackendBaseURL();
    if (!backendBase) return NextResponse.json({ error: 'Backend URL not configured' }, { status: 500 });
    const context = getRequestOperationalContext(request, {} as Parameters<typeof getRequestOperationalContext>[1]);
    const res = await fetch(`${backendBase.replace(/\/$/, '')}/sales/${saleId}?include=${encodeURIComponent(include)}`, {
      headers: getBackendHeaders(accessToken, orgId, context),
    });
    if (!res.ok) {
      const details = await res.text().catch(() => 'Unknown error');
      return NextResponse.json({ error: `Backend error: ${res.status}`, details }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json({ success: true, sale: data.sale || data });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch sale', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

