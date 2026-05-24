import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { resolveTenantContextFromHeaders } from '@/lib/domain/request-tenant';

type PurchaseQueryResult = {
  data: unknown[] | null;
  error: unknown;
};

function amount(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function isMissingBuyerColumnsError(error: unknown): boolean {
  const code = String((error as { code?: string })?.code || '');
  const message = String((error as { message?: string })?.message || '').toLowerCase();
  return code === '42703' || code === 'PGRST204' || message.includes('buyer_') || message.includes('schema cache');
}

const PURCHASE_SELECT = `
  id,
  order_number,
  customer_email,
  customer_name,
  total,
  subtotal,
  shipping_cost,
  status,
  payment_method,
  fulfillment_type,
  order_source,
  created_at,
  date,
  organization_id,
  buyer_type,
  buyer_user_id,
  buyer_organization_id,
  buyer_organization_name,
  order_items:sale_items (
    id,
    product_id,
    product_name,
    quantity,
    unit_price,
    total_price,
    subtotal,
    products (
      name
    )
  )
`;

const PURCHASE_BASE_SELECT = `
  id,
  order_number,
  customer_email,
  customer_name,
  total,
  subtotal,
  shipping_cost,
  status,
  payment_method,
  fulfillment_type,
  order_source,
  created_at,
  date,
  organization_id,
  buyer_type,
  buyer_user_id,
  buyer_organization_id,
  buyer_organization_name
`;

const LEGACY_PURCHASE_SELECT = `
  id,
  order_number,
  customer_email,
  customer_name,
  total,
  subtotal,
  shipping_cost,
  status,
  payment_method,
  fulfillment_type,
  order_source,
  created_at,
  date,
  organization_id,
  user_id,
  order_items:sale_items (
    id,
    product_id,
    product_name,
    quantity,
    unit_price,
    total_price,
    subtotal,
    products (
      name
    )
  )
`;

const LEGACY_PURCHASE_BASE_SELECT = `
  id,
  order_number,
  customer_email,
  customer_name,
  total,
  subtotal,
  shipping_cost,
  status,
  payment_method,
  fulfillment_type,
  order_source,
  created_at,
  date,
  organization_id,
  user_id
`;

function sortPurchaseRows(rows: Array<Record<string, unknown>>, limit: number) {
  return rows
    .sort((a, b) => {
      const left = new Date(text(a.created_at) || text(a.date)).getTime() || 0;
      const right = new Date(text(b.created_at) || text(b.date)).getTime() || 0;
      return right - left;
    })
    .slice(0, limit);
}

export async function GET(request: NextRequest) {
  try {
    const auth = await createClient();
    const admin = await createAdminClient();
    const { data: { user }, error: userError } = await auth.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || 20), 1), 50);
    const tenantOnly = searchParams.get('tenantOnly') === 'true';
    const tenantContext = await resolveTenantContextFromHeaders(request.headers);
    const tenantOrganizationId = tenantContext.kind === 'tenant' ? tenantContext.organization.id : null;
    let buyerOrganizationIds: string[] = [];

    try {
      const { data: memberships } = await admin
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id);

      buyerOrganizationIds = Array.from(
        new Set(
          (memberships || [])
            .map((membership: any) => text(membership.organization_id))
            .filter(Boolean),
        ),
      );
    } catch (membershipError) {
      console.warn('[profile/purchases] could not load buyer organizations:', membershipError);
    }

    const runPurchaseQuery = async (
      selectClause: string,
      applyFilter: (query: any) => any,
    ) => {
      let query = applyFilter(admin.from('sales').select(selectClause));

      if (tenantOnly && tenantOrganizationId) {
        query = query.eq('organization_id', tenantOrganizationId);
      }

      return query.order('created_at', { ascending: false }).limit(limit);
    };

    const normalizedEmail = String(user.email || '').trim().toLowerCase();
    const buildPrimaryQueries = (selectClause: string) => [
      runPurchaseQuery(selectClause, (query) => query.eq('buyer_user_id', user.id)),
      normalizedEmail
        ? runPurchaseQuery(selectClause, (query) => query.ilike('customer_email', normalizedEmail))
        : Promise.resolve({ data: [], error: null }),
      buyerOrganizationIds.length > 0
        ? runPurchaseQuery(selectClause, (query) => query.in('buyer_organization_id', buyerOrganizationIds))
        : Promise.resolve({ data: [], error: null }),
    ];

    const mergeResults = (results: PurchaseQueryResult[]) => {
      const deduped = new Map<string, Record<string, unknown>>();
      for (const result of results) {
        for (const row of result.data || []) {
          const id = text((row as Record<string, unknown>).id);
          if (id) deduped.set(id, row as Record<string, unknown>);
        }
      }

      return sortPurchaseRows(Array.from(deduped.values()), limit);
    };

    const primaryQueries = buildPrimaryQueries(PURCHASE_SELECT);

    const initialResults = await Promise.all(primaryQueries);
    const initialError = (initialResults as PurchaseQueryResult[]).find((result) => result.error)?.error;

    let purchases: Array<Record<string, unknown>> = [];

    if (initialError && isMissingBuyerColumnsError(initialError)) {
      const runLegacyFallback = async (selectClause: string) => {
        let fallback = admin
          .from('sales')
          .select(selectClause)
          .ilike('customer_email', normalizedEmail || '__missing_customer_email__')
          .order('created_at', { ascending: false })
          .limit(limit);

        if (tenantOnly && tenantOrganizationId) {
          fallback = fallback.eq('organization_id', tenantOrganizationId);
        }

        return fallback;
      };

      const fallbackResult = await runLegacyFallback(LEGACY_PURCHASE_SELECT);
      const safeFallbackResult = fallbackResult.error
        ? await runLegacyFallback(LEGACY_PURCHASE_BASE_SELECT)
        : fallbackResult;

      if (safeFallbackResult.error) {
        console.warn('[profile/purchases] legacy purchase lookup failed:', safeFallbackResult.error);
      }

      purchases = Array.isArray(safeFallbackResult.data)
        ? safeFallbackResult.data as unknown as Array<Record<string, unknown>>
        : [];
    } else {
      if (initialError) {
        console.warn('[profile/purchases] detailed purchase lookup failed, retrying without items:', initialError);
        const baseResults = await Promise.all(buildPrimaryQueries(PURCHASE_BASE_SELECT));
        const baseError = (baseResults as PurchaseQueryResult[]).find((result) => result.error)?.error;

        if (baseError) {
          console.warn('[profile/purchases] base purchase lookup failed:', baseError);
          purchases = [];
        } else {
          purchases = mergeResults(baseResults as PurchaseQueryResult[]);
        }
      } else {
        purchases = mergeResults(initialResults as PurchaseQueryResult[]);
      }
    }
    const organizationIds = Array.from(new Set(purchases.map((row: any) => text(row.organization_id)).filter(Boolean)));
    const organizationMap = new Map<string, { name: string; slug: string }>();

    if (organizationIds.length > 0) {
      const { data: orgs } = await admin
        .from('organizations')
        .select('id, name, slug')
        .in('id', organizationIds);

      for (const org of orgs || []) {
        organizationMap.set(String((org as any).id), {
          name: text((org as any).name) || 'Tienda',
          slug: text((org as any).slug),
        });
      }
    }

    return NextResponse.json({
      success: true,
      purchases: purchases.map((row: any) => {
        const seller = organizationMap.get(text(row.organization_id));
        return {
          id: text(row.id),
          orderNumber: text(row.order_number),
          sellerOrganizationId: text(row.organization_id),
          sellerName: seller?.name || 'Tienda',
          sellerSlug: seller?.slug || '',
          customerName: text(row.customer_name),
          customerEmail: text(row.customer_email),
          total: amount(row.total),
          subtotal: amount(row.subtotal),
          shippingCost: amount(row.shipping_cost),
          status: text(row.status) || 'PENDING',
          paymentMethod: text(row.payment_method),
          fulfillmentType: text(row.fulfillment_type) || (amount(row.shipping_cost) > 0 ? 'DELIVERY' : 'PICKUP'),
          orderSource: text(row.order_source),
          createdAt: text(row.created_at) || text(row.date),
          buyerType: text(row.buyer_type) || (text(row.buyer_organization_id) ? 'business' : text(row.customer_email).toLowerCase() === String(user.email || '').toLowerCase() ? 'customer' : 'guest'),
          buyerOrganizationId: text(row.buyer_organization_id) || null,
          buyerOrganizationName: text(row.buyer_organization_name) || null,
          items: Array.isArray(row.order_items)
            ? row.order_items.map((item: any) => {
                const quantity = amount(item.quantity);
                const unitPrice = amount(item.unit_price);
                const productRef = Array.isArray(item.products) ? item.products[0] : item.products;
                return {
                  id: text(item.id),
                  productId: text(item.product_id),
                  productName: text(item.product_name) || text(productRef?.name) || 'Producto',
                  quantity,
                  unitPrice,
                  subtotal: amount(item.subtotal) || amount(item.total_price) || quantity * unitPrice,
                };
              })
            : [],
        };
      }),
    });
  } catch (error) {
    console.error('[profile/purchases] error:', error);
    return NextResponse.json({ success: false, error: 'No se pudieron cargar tus compras' }, { status: 500 });
  }
}
