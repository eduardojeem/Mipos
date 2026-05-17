import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getRequestOperationalContext } from '@/app/api/_utils/operational-context';
import { getUserOrganizationId } from '@/app/api/_utils/organization';

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

    let orgId = (request.headers.get('x-organization-id') || '').trim();
    if (!orgId && user?.id) {
      const resolved = await getUserOrganizationId(user.id);
      if (resolved) orgId = resolved;
    }
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
      const { data: sale, error: supabaseError } = await (supabase as unknown as Record<string, any>)
        .from('sales')
        .select(selectFields)
        .eq('organization_id', orgId)
        .eq('id', saleId)
        .maybeSingle();

      if (!supabaseError && sale) {
        // Normalize snake_case Supabase fields to match the Prisma/backend format
        // so the frontend only needs to handle one shape.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const normalized = {
          ...sale,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          saleItems: Array.isArray((sale as any).sale_items)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ? (sale as any).sale_items.map((item: any) => ({
                ...item,
                product: item.products ?? item.product ?? null,
                products: undefined,
              }))
            : undefined,
          sale_items: undefined,
        };
        return NextResponse.json({ success: true, sale: normalized });
      }

      if (!supabaseError && !sale) {
        return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
      }

      // Supabase returned an error — try backend if available, else surface the error
      const backendBase = getBackendBaseURL();
      if (!backendBase) {
        return NextResponse.json(
          { error: 'Failed to fetch sale', details: supabaseError?.message ?? 'Unknown Supabase error' },
          { status: 500 },
        );
      }
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
    }

    // canQuery=false — Supabase client unavailable, must use backend
    const backendBase = getBackendBaseURL();
    if (!backendBase) return NextResponse.json({ error: 'Backend URL not configured and Supabase client unavailable' }, { status: 503 });
    const context2 = getRequestOperationalContext(request, {} as Parameters<typeof getRequestOperationalContext>[1]);
    const res2 = await fetch(`${backendBase.replace(/\/$/, '')}/sales/${saleId}?include=${encodeURIComponent(include)}`, {
      headers: getBackendHeaders(accessToken, orgId, context2),
    });
    if (!res2.ok) {
      const details = await res2.text().catch(() => 'Unknown error');
      return NextResponse.json({ error: `Backend error: ${res2.status}`, details }, { status: res2.status });
    }
    const data2 = await res2.json();
    return NextResponse.json({ success: true, sale: data2.sale || data2 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch sale', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

