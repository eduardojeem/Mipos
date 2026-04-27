import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getRequestOperationalContext } from '@/app/api/_utils/operational-context';
import { getUserOrganizationId } from '@/app/api/_utils/organization';
import {
  buildSalePaymentDetails,
  getSaleDisplayPaymentMethod,
  type StoredSalePaymentDetails,
} from '@/lib/sales-payment-details';

// Backend URL resolution removed in favor of centralized api client
// Helper: read backend base URL from env only (avoid self-calls)
function getBackendBaseURL(): string | null {
  const url = process.env.BACKEND_URL;
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\/+$/, '') + '/api';
}

function isMissingColumnError(error: any): boolean {
  const message = String(error?.message || '').toLowerCase();
  const details = String(error?.details || '').toLowerCase();
  const code = String(error?.code || '').toUpperCase();
  return (
    code === 'PGRST204' ||
    code === '42703' ||
    message.includes('column') && message.includes('does not exist') ||
    details.includes('column') && details.includes('does not exist')
  );
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

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  if (context.branchId) {
    headers['x-branch-id'] = context.branchId;
  }

  if (context.posId) {
    headers['x-pos-id'] = context.posId;
    headers['x-register-id'] = context.posId;
  }

  return headers;
}

async function persistSaleOperationalFields(
  supabase: any,
  organizationId: string,
  saleId: string,
  paymentDetails: StoredSalePaymentDetails,
  context: ReturnType<typeof getRequestOperationalContext>,
) {
  const updates: Array<Record<string, unknown>> = [];

  updates.push({ payment_details: paymentDetails });

  if (context.branchId) {
    updates.push({ branch_id: context.branchId });
  }

  if (context.posId) {
    updates.push({ pos_id: context.posId });
  }

  if (paymentDetails.primaryMethod !== paymentDetails.legacyMethod) {
    updates.push({ payment_method: paymentDetails.primaryMethod });
  }

  for (const update of updates) {
    const { error } = await supabase
      .from('sales')
      .update(update)
      .eq('id', saleId)
      .eq('organization_id', organizationId);

    if (error && !isMissingColumnError(error)) {
      console.warn('[sales] Optional sales update failed:', error.message);
    }
  }
}

async function findOpenCashSession(
  supabase: any,
  organizationId: string,
  context: ReturnType<typeof getRequestOperationalContext>,
) {
  let query = supabase
    .from('cash_sessions')
    .select('id, status')
    .eq('organization_id', organizationId)
    .or('status.eq.OPEN,status.eq.open')
    .order('opened_at', { ascending: false })
    .limit(1);

  if (context.branchId) {
    query = query.eq('branch_id', context.branchId);
  }

  if (context.posId) {
    query = query.eq('pos_id', context.posId);
  }

  const result = await query.maybeSingle();
  if (!result.error) {
    return result.data ?? null;
  }

  if (!isMissingColumnError(result.error)) {
    console.warn('[sales] Failed to fetch open session with operational context:', result.error.message);
  }

  const fallback = await supabase
    .from('cash_sessions')
    .select('id, status')
    .eq('organization_id', organizationId)
    .or('status.eq.OPEN,status.eq.open')
    .order('opened_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return fallback.data ?? null;
}

async function insertCashMovementForSale(
  supabase: any,
  organizationId: string,
  userId: string | null | undefined,
  saleId: string,
  cashAmount: number,
  context: ReturnType<typeof getRequestOperationalContext>,
) {
  if (!(cashAmount > 0)) {
    return;
  }

  const openSession = await findOpenCashSession(supabase, organizationId, context);
  if (!openSession?.id) {
    return;
  }

  const basePayload = {
    session_id: openSession.id,
    organization_id: organizationId,
    type: 'SALE',
    amount: cashAmount,
    reason: `Venta #${saleId}`,
    reference_type: 'SALE',
    reference_id: String(saleId),
    created_by: userId,
  };

  const { error } = await supabase
    .from('cash_movements')
    .insert({
      ...basePayload,
      branch_id: context.branchId,
      pos_id: context.posId,
    });

  if (!error) {
    return;
  }

  if (!isMissingColumnError(error)) {
    console.warn('[sales] Cash sync with operational context failed:', error.message);
  }

  await supabase
    .from('cash_movements')
    .insert(basePayload);
}

// Normalize backend Prisma-style sale to frontend Supabase-style shape
const normalizeSale = (sale: any) => {
  if (!sale || typeof sale !== 'object') return sale;
  const paymentDetails = sale.payment_details ?? sale.paymentDetails ?? undefined;
  const paymentMethod = getSaleDisplayPaymentMethod(paymentDetails, sale);
  const normalizedPaymentDetails = paymentDetails
    ? buildSalePaymentDetails({
        paymentDetails,
        paymentMethod,
        totalAmount: sale.total ?? sale.total_amount,
      })
    : undefined;

  return {
    ...sale,
    // Core amounts
    total_amount: sale.total ?? sale.total_amount ?? 0,
    tax_amount: sale.tax ?? sale.tax_amount ?? undefined,
    discount_amount: sale.discount ?? sale.discount_amount ?? undefined,
    discount_type: sale.discount_type ?? sale.discountType ?? undefined,
    coupon_code: sale.coupon_code ?? sale.couponCode ?? undefined,
    // Payment fields
    payment_method: paymentMethod,
    payment_details: normalizedPaymentDetails ?? paymentDetails,
    mixedPayments: normalizedPaymentDetails?.payments,
    cashReceived: normalizedPaymentDetails?.cashReceived ?? sale.cashReceived ?? sale.cash_received,
    change: normalizedPaymentDetails?.change ?? sale.change ?? sale.change_amount,
    transferReference: normalizedPaymentDetails?.transferReference ?? sale.transferReference ?? sale.transfer_reference,
    // Timestamps
    created_at: sale.created_at ?? sale.date ?? sale.createdAt ?? undefined,
    updated_at: sale.updated_at ?? sale.updatedAt ?? undefined,
    // Relations
    customer_id: sale.customerId ?? sale.customer_id ?? sale.customer?.id ?? undefined,
    user_id: sale.userId ?? sale.user_id ?? sale.user?.id ?? undefined,
    branch_id: sale.branch_id ?? sale.branchId ?? undefined,
    pos_id: sale.pos_id ?? sale.posId ?? sale.register_id ?? sale.registerId ?? undefined,
    items: sale.items ?? sale.saleItems ?? [],
  };
};

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await (supabase as any).auth.getUser();
    const canUseSupabase = typeof (supabase as any).from === 'function';
    const canQuery = canUseSupabase && !!user && !userError;

    // Optionally get access token for backend proxy
    const { data: { session } } = await (supabase as any).auth.getSession();
    const accessToken: string | undefined = session?.access_token;

    // Parse query params
    const { searchParams } = new URL(request.url);
    let orgId = (request.headers.get('x-organization-id') || '').trim();
    if (!orgId && user?.id) {
      const resolved = await getUserOrganizationId(user.id);
      if (resolved) orgId = resolved;
    }
    if (!orgId) {
      return NextResponse.json({ error: 'Organization header missing' }, { status: 400 });
    }

    const page = Number(searchParams.get('page') || 1);
    const limit = Number(searchParams.get('limit') || 50);
    const customerId = searchParams.get('customer_id') || undefined;
    const sortParam = searchParams.get('sort') || '';

    // Normalización robusta de casing y mapeos
    const normalize = (v?: string | null) => (v ? v.trim().toUpperCase() : undefined);
    const normalizeStatus = (v?: string | null) => {
      const n = normalize(v);
      if (!n) return undefined;
      // Aceptar variantes comunes
      if (n === 'CANCELED') return 'CANCELLED';
      if (n === 'PENDIENTE') return 'PENDING';
      if (n === 'COMPLETADA' || n === 'COMPLETED') return 'COMPLETED';
      return n;
    };
    const normalizePaymentMethod = (v?: string | null) => {
      const n = normalize(v);
      if (!n) return undefined;
      // Unificar sinónimos
      if (n === 'OTHERS') return 'OTHER';
      if (n === 'BANK_TRANSFER' || n === 'TRANSFERENCIA') return 'TRANSFER';
      if (n === 'TARJETA') return 'CARD';
      if (n === 'EFECTIVO') return 'CASH';
      if (n === 'BILLETERA' || n === 'DIGITAL_WALLET') return 'QR';
      return n;
    };
  const normalizeSaleType = (v?: string | null) => {
    const n = normalize(v);
    if (!n) return undefined;
    if (n === 'MAYORISTA') return 'WHOLESALE';
    if (n === 'MINORISTA') return 'RETAIL';
    return n;
  };

    const status = normalizeStatus(searchParams.get('status'));
    const paymentMethod = normalizePaymentMethod(searchParams.get('payment_method'));
    const dateFrom = searchParams.get('date_from') || undefined;
    const dateTo = searchParams.get('date_to') || undefined;
    const saleType = normalizeSaleType(searchParams.get('sale_type'));
    const saleId = (searchParams.get('id') || searchParams.get('sale_id') || undefined) || undefined;
    const [sortFieldRaw, sortDirectionRaw] = sortParam.split(':');
    const allowedSortFields = new Set(['created_at', 'updated_at', 'total_amount']);
    const sortField = allowedSortFields.has(sortFieldRaw) ? sortFieldRaw : 'created_at';
    const sortAscending = String(sortDirectionRaw || 'desc').toLowerCase() === 'asc';
    const includeRaw = (searchParams.get('include') || '').toLowerCase();
    const includeItems = includeRaw.includes('items');
    const includeProduct = includeRaw.includes('product') || includeItems;
  // Soportar snake_case y camelCase para min/max, además de amount_range
  const amountRangeRaw = searchParams.get('amount_range') ?? searchParams.get('amountRange') ?? undefined;
  const minAmountParam = searchParams.get('min_amount') ?? searchParams.get('minAmount');
  const maxAmountParam = searchParams.get('max_amount') ?? searchParams.get('maxAmount');
  // Descuentos
  const minDiscountParam = searchParams.get('min_discount') ?? searchParams.get('minDiscount');
  const maxDiscountParam = searchParams.get('max_discount') ?? searchParams.get('maxDiscount');
  // Cupón
  const couponCodeParam = searchParams.get('coupon_code') ?? searchParams.get('couponCode');
  const hasCouponParam = searchParams.get('has_coupon') ?? searchParams.get('hasCoupon');
    const parseRange = (r?: string | null): { min?: number; max?: number } => {
      const s = (r || '').trim();
      if (!s) return {};
      if (/^\d+\+$/.test(s)) {
        const m = Number(s.slice(0, -1));
        return Number.isFinite(m) ? { min: m } : {};
      }
      const rangeMatch = s.match(/^(\d+)-(\d+)$/);
      if (rangeMatch) {
        const min = Number(rangeMatch[1]);
        const max = Number(rangeMatch[2]);
        return {
          min: Number.isFinite(min) ? min : undefined,
          max: Number.isFinite(max) ? max : undefined,
        };
      }
      const singleMatch = s.match(/^(\d+)$/);
      if (singleMatch) {
        const min = Number(singleMatch[1]);
        return Number.isFinite(min) ? { min } : {};
      }
      return {};
    };
  const rangeFromParam = parseRange(amountRangeRaw);
  const minAmount = minAmountParam != null ? Number(minAmountParam) : rangeFromParam.min;
  const maxAmount = maxAmountParam != null ? Number(maxAmountParam) : rangeFromParam.max;
  const minDiscount = minDiscountParam != null ? Number(minDiscountParam) : undefined;
  const maxDiscount = maxDiscountParam != null ? Number(maxDiscountParam) : undefined;
  const couponCode = couponCodeParam ? String(couponCodeParam).trim() : undefined;
  const hasCoupon = typeof hasCouponParam === 'string'
    ? ['true','1','yes','si'].includes(hasCouponParam.toLowerCase())
      ? true
      : ['false','0','no'].includes(hasCouponParam.toLowerCase())
        ? false
        : undefined
    : undefined;

    if (canQuery) {
      const baseFields = '*, customer:customers (id, name, email, phone)';
      const itemsFields = includeItems
        ? ', sale_items (id, sale_id, product_id, quantity, unit_price, total_price, discount_amount' + (includeProduct ? ', products (id, name, sku)' : '') + ')'
        : '';
      const selectFields = baseFields + itemsFields;

      let query = (supabase as any)
        .from('sales')
        .select(selectFields, { count: 'exact' })
        .eq('organization_id', orgId)
        .order(sortField, { ascending: sortAscending });

      if (saleId) query = query.eq('id', saleId);
      if (customerId) query = query.eq('customer_id', customerId);
      if (status) query = query.eq('status', status);
      if (paymentMethod) query = query.eq('payment_method', paymentMethod);
      if (saleType) query = query.eq('sale_type', saleType);
      if (minAmount !== undefined) query = query.gte('total_amount', minAmount);
      if (maxAmount !== undefined) query = query.lte('total_amount', maxAmount);
      if (dateFrom) query = query.gte('created_at', `${dateFrom}T00:00:00`);
      if (dateTo) query = query.lte('created_at', `${dateTo}T23:59:59`);
      if (minDiscount !== undefined) query = query.gte('discount_amount', minDiscount);
      if (maxDiscount !== undefined) query = query.lte('discount_amount', maxDiscount);
      if (typeof hasCoupon === 'boolean') {
        if (hasCoupon) {
          query = query.not('coupon_code', 'is', null);
        } else {
          query = query.is('coupon_code', null);
        }
      }
      if (couponCode) query = query.ilike('coupon_code', `%${couponCode}%`);

      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data: sales, error, count } = await query.range(from, to);
      if (!error && Array.isArray(sales)) {
        const normalized = includeItems ? (sales as any[]).map((s: any) => {
          const items = Array.isArray(s.sale_items)
            ? s.sale_items.map((it: any) => ({
                id: it.id,
                sale_id: it.sale_id,
                product_id: it.product_id,
                quantity: Number(it.quantity || 0),
                unit_price: Number(it.unit_price || 0),
                total_price: Number(it.total_price ?? (Number(it.quantity || 0) * Number(it.unit_price || 0)) - Number(it.discount_amount || 0)),
                discount_amount: Number(it.discount_amount || 0),
                product: it.products ? { id: it.products.id, name: it.products.name, sku: it.products.sku } : undefined,
              }))
            : [];
          const { sale_items, ...rest } = s;
          return normalizeSale({ ...rest, items });
        }) : (sales as any[]).map((sale) => normalizeSale(sale));
        const pagination = {
          page,
          limit,
          total: count ?? sales.length,
          pages: count ? Math.ceil(count / limit) : 1,
        };
        return NextResponse.json({ success: true, sales: normalized, data: normalized, count: (normalized as any[]).length, pagination }, { headers: { 'X-Data-Source': 'supabase' } });
      }

      // If Supabase returned an error, fall back to backend proxy next
      console.warn('[sales] Supabase query error, falling back to backend:', error?.message);
    }

    // Fallback/proxy to backend (avoid self-calling Next API)

    try {
      const backendBase = getBackendBaseURL();
      const isDev = process.env.NODE_ENV !== 'production';
      if (!backendBase) {
        // No backend configured; safe dev fallback
        if (isDev) {
          const pagination = { page, limit, total: 0, pages: 0 };
          return NextResponse.json({ success: true, sales: [], data: [], count: 0, pagination }, { headers: { 'X-Data-Source': 'mock' } });
        }
        return NextResponse.json({ error: 'Backend URL not configured' }, { status: 500 });
      }

      const params: Record<string, any> = Object.fromEntries(searchParams.entries());
      // Map frontend params to backend expected names
      if (params.date_from) { params.startDate = params.date_from; delete params.date_from; }
      if (params.date_to) { params.endDate = params.date_to; delete params.date_to; }
      if (params.customer_id) { params.customerId = params.customer_id; delete params.customer_id; }
      if (params.payment_method) {
        params.paymentMethod = normalizePaymentMethod(params.payment_method);
        delete params.payment_method;
      }
      delete params.sort;
      if (params.status) {
        params.status = normalizeStatus(params.status);
      }
      if (params.sale_type) {
        params.saleType = normalizeSaleType(params.sale_type);
        delete params.sale_type;
      }
      // Normalizar min/max y amount_range para el backend (camelCase)
      // Preferir valores explícitos si existen
      if (params.min_amount != null) {
        const v = Number(params.min_amount);
        if (Number.isFinite(v)) params.minAmount = v;
        delete params.min_amount;
      }
      if (params.max_amount != null) {
        const v = Number(params.max_amount);
        if (Number.isFinite(v)) params.maxAmount = v;
        delete params.max_amount;
      }
      // Descuentos a camelCase
      if (params.min_discount != null) {
        const v = Number(params.min_discount);
        if (Number.isFinite(v)) params.minDiscount = v;
        delete params.min_discount;
      }
      if (params.max_discount != null) {
        const v = Number(params.max_discount);
        if (Number.isFinite(v)) params.maxDiscount = v;
        delete params.max_discount;
      }
      if (params.coupon_code != null) {
        params.couponCode = String(params.coupon_code);
        delete params.coupon_code;
      }
      if (params.has_coupon != null) {
        const raw = String(params.has_coupon).toLowerCase();
        params.hasCoupon = ['true','1','yes','si'].includes(raw) ? 'yes' : ['false','0','no'].includes(raw) ? 'no' : undefined;
        delete params.has_coupon;
      }
      if (params.minAmount == null && params.min_amount == null && params.amount_range != null) {
        const r = String(params.amount_range);
        const pr = parseRange(r);
        if (typeof pr.min === 'number' && Number.isFinite(pr.min)) params.minAmount = pr.min;
        if (typeof pr.max === 'number' && Number.isFinite(pr.max)) params.maxAmount = pr.max;
        delete params.amount_range;
      }
      // También soportar camelCase amountRange
      if (params.minAmount == null && params.amountRange != null) {
        const r = String(params.amountRange);
        const pr = parseRange(r);
        if (typeof pr.min === 'number' && Number.isFinite(pr.min)) params.minAmount = pr.min;
        if (typeof pr.max === 'number' && Number.isFinite(pr.max)) params.maxAmount = pr.max;
        delete params.amountRange;
      }
      const qs = new URLSearchParams(params).toString();
      const url = `${backendBase.replace(/\/$/, '')}/sales${qs ? `?${qs}` : ''}`;

      // 10s timeout using AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      // Incluir cabeceras de organización y contexto operativo también en GET fallback
      const operationalContext = getRequestOperationalContext(request, {} as any);
      const headers = getBackendHeaders(accessToken, orgId, operationalContext);

      const res = await fetch(url, { signal: controller.signal, headers });
      clearTimeout(timeoutId);
      if (!res.ok) {
        const details = await res.text().catch(() => 'Unknown error');
        // Safe dev fallback on 4xx/5xx in development
        if (isDev && (res.status === 404 || res.status === 401 || res.status === 403 || res.status >= 500)) {
          const pagination = { page, limit, total: 0, pages: 0 };
          return NextResponse.json({ success: true, sales: [], data: [], count: 0, pagination }, { headers: { 'X-Data-Source': 'mock' } });
        }
        return NextResponse.json({ error: `Backend error: ${res.status}`, details }, { status: res.status });
      }

      const data = await res.json();
      const rawSales = data.sales || data.data || [];
      const sales = Array.isArray(rawSales) ? rawSales.map(normalizeSale) : [];
      const pagination = data.pagination || { page, limit, total: sales.length, pages: 1 };
      return NextResponse.json({ success: true, sales, data: sales, count: sales.length, pagination }, { headers: { 'X-Data-Source': 'backend' } });
    } catch (err: any) {
      const isDev = process.env.NODE_ENV !== 'production';
      // Network/timeout errors -> dev fallback
      if (isDev) {
        const pagination = { page, limit, total: 0, pages: 0 };
        return NextResponse.json({ success: true, sales: [], data: [], count: 0, pagination }, { headers: { 'X-Data-Source': 'mock' } });
      }
      const statusCode = err?.status ?? err?.response?.status ?? 500;
      const details = err?.response?.data || err?.message || 'Unknown error';
      return NextResponse.json({ error: `Backend error: ${statusCode}`, details }, { status: statusCode });
    }
  } catch (error) {
    console.error('Error in sales API route:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const operationalContext = getRequestOperationalContext(request, body);

    const orgId = (request.headers.get('x-organization-id') || '').trim();
    if (!orgId) {
      return NextResponse.json({ error: 'Organization header missing' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: userError } = await (supabase as any).auth.getUser();

    const isDev = process.env.NODE_ENV !== 'production';
    const hasSupabaseEnv = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const canUseSupabase = !!user && !userError && hasSupabaseEnv && typeof (supabase as any).from === 'function';

    // Optionally get access token for backend proxy
    const { data: { session } } = await (supabase as any).auth.getSession();
    const accessToken: string | undefined = session?.access_token;

    if (isDev && !canUseSupabase) {
      const now = new Date().toISOString();
      const mockSaleId = `mock-sale-${Date.now()}`;
      const paymentDetails = buildSalePaymentDetails({
        paymentMethod: body?.payment_method ?? 'CASH',
        totalAmount: body?.total_amount ?? body?.total,
        mixedPayments: body?.mixedPayments,
        paymentDetails: body?.payment_details,
        cashReceived: body?.cashReceived,
        change: body?.change,
        transferReference: body?.transfer_reference ?? body?.transferReference,
      });
      const result = {
        success: true,
        message: 'Venta simulada (modo desarrollo, sin Supabase)',
        sale: {
          id: mockSaleId,
          created_at: now,
          status: 'COMPLETED',
          payment_method: paymentDetails.primaryMethod,
          payment_details: paymentDetails,
          branch_id: operationalContext.branchId,
          pos_id: operationalContext.posId,
          ...body,
        },
      };
      return NextResponse.json(result, { status: 200 });
    }

    if (!canUseSupabase) {

      try {
        const backendBase = getBackendBaseURL();
        if (!backendBase) return NextResponse.json({ error: 'Backend URL not configured' }, { status: 500 });

        const url = `${backendBase.replace(/\/$/, '')}/sales`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        // Mapear al esquema esperado por el backend Prisma
        const backendPayload = {
          customerId: body?.customer_id ?? undefined,
          items: Array.isArray(body?.items) ? body.items.map((it: any) => ({
            productId: it.product_id,
            quantity: Number(it.quantity),
            unitPrice: Number(it.unit_price),
          })) : [],
          paymentMethod: body?.payment_method ?? 'CASH',
          mixedPayments: Array.isArray(body?.mixedPayments) ? body.mixedPayments : undefined,
          paymentDetails: body?.payment_details,
          discount: Number(body?.discount_amount) || 0,
          discountType: (body?.discount_type === 'PERCENTAGE' || body?.discount_type === 'FIXED_AMOUNT') ? body.discount_type : 'FIXED_AMOUNT',
          tax: Number(body?.tax_amount) || 0,
          notes: body?.coupon_code ? `${body?.notes ?? ''}`.trim() : (body?.notes ?? ''),
          cashReceived: typeof body?.cashReceived === 'number' ? Number(body.cashReceived) : undefined,
          change: typeof body?.change === 'number' ? Number(body.change) : undefined,
          transferReference: body?.transfer_reference ?? body?.transferReference,
          branchId: operationalContext.branchId ?? undefined,
          posId: operationalContext.posId ?? undefined,
        };
        const res = await fetch(url, {
          method: 'POST',
          body: JSON.stringify(backendPayload),
          headers: getBackendHeaders(accessToken, orgId, operationalContext),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!res.ok) {
          const details = await res.text().catch(() => 'Unknown error');
          return NextResponse.json({ error: `Backend error: ${res.status}`, details }, { status: res.status });
        }
        const backendData = await res.json();
        const rawSale = backendData?.sale ?? backendData;
        const normalized = normalizeSale(rawSale);
        return NextResponse.json({ success: true, sale: normalized }, { status: 200 });
      } catch (err: any) {
        const statusCode = err?.status ?? err?.response?.status ?? 500;
        const details = err?.response?.data || err?.message || 'Unknown error';
        return NextResponse.json({ error: `Backend error: ${statusCode}`, details }, { status: statusCode });
      }
    }

    // Supabase RPC preferred path (if available)
    try {
      const userId = user?.id ?? null;
      const items = Array.isArray(body.items) ? body.items : [];
      const subtotal = items.reduce((sum: number, it: any) => {
        const qty = Number(it.quantity ?? 0);
        const price = Number(it.unit_price ?? it.price ?? 0);
        return sum + qty * price;
      }, 0);
      const taxAmount = Number(body.tax_amount ?? body.tax ?? 0);
      const discountAmount = Number(body.discount_amount ?? body.discount ?? 0);
      const totalAmount = Number(body.total_amount ?? body.total ?? (subtotal - discountAmount + taxAmount));
      const paymentDetails = buildSalePaymentDetails({
        paymentMethod: body.payment_method ?? 'CASH',
        totalAmount,
        mixedPayments: body.mixedPayments,
        paymentDetails: body.payment_details,
        cashReceived: body.cashReceived,
        change: body.change,
        transferReference: body.transfer_reference ?? body.transferReference,
      });

      const rpcPayload = {
        p_customer_id: body.customer_id ?? null,
        p_user_id: userId,
        p_total_amount: totalAmount,
        p_tax_amount: taxAmount,
        p_discount_amount: discountAmount,
        p_payment_method: paymentDetails.legacyMethod,
        p_status: body.status ?? 'COMPLETED',
        p_sale_type: body.sale_type ?? 'RETAIL',
        p_notes: body.notes ?? null,
        p_items: items,
      };

      const { data: rpcResult, error: rpcError } = await (supabase as any)
        .rpc('create_sale_with_items', rpcPayload);

      if (!rpcError && rpcResult) {
        // rpcResult is the full sale object (Option A)
        try {
          await persistSaleOperationalFields(supabase as any, orgId, String(rpcResult.id), paymentDetails, operationalContext);
          await insertCashMovementForSale(
            supabase as any,
            orgId,
            userId,
            String(rpcResult.id),
            paymentDetails.cashAmount,
            operationalContext,
          );
        } catch (syncErr) {
          console.warn('[sales] Cash sync (RPC) error:', syncErr);
        }
        return NextResponse.json({
          success: true,
          sale: normalizeSale({
            ...rpcResult,
            payment_method: paymentDetails.primaryMethod,
            payment_details: paymentDetails,
            branch_id: operationalContext.branchId,
            pos_id: operationalContext.posId,
          }),
        }, { status: 200 });
      }
    } catch (rpcErr: any) {
      console.warn('[sales] RPC create_sale_with_items failed, falling back to direct inserts:', rpcErr?.message || rpcErr);
    }

    // Fallback: direct inserts
    const { customer_id, items, payment_method, discount_amount, tax_amount, notes, sale_type } = body;

    // Calculate totals in case they were not provided
    const subtotal = Array.isArray(items) ? items.reduce((sum: number, it: any) => sum + (Number(it.quantity) * Number(it.unit_price)), 0) : 0;
    const discountAmount = Number(discount_amount) || 0;
    const taxAmount = Number(tax_amount) || 0;
    const totalAmount = subtotal - discountAmount + taxAmount;
    const paymentDetails = buildSalePaymentDetails({
      paymentMethod: payment_method || 'CASH',
      totalAmount,
      mixedPayments: body.mixedPayments,
      paymentDetails: body.payment_details,
      cashReceived: body.cashReceived,
      change: body.change,
      transferReference: body.transfer_reference ?? body.transferReference,
    });

    const salePayload: any = {
      customer_id: customer_id ?? null,
      total_amount: totalAmount,
      tax_amount: taxAmount || null,
      discount_amount: discountAmount || null,
      payment_method: paymentDetails.legacyMethod,
      status: 'COMPLETED',
      sale_type: sale_type || 'RETAIL',
      notes: notes || null,
      organization_id: orgId,
    };
    // Intentar incluir discount_type si la columna existe; en caso de error, habrá fallback al backend
    if (typeof body?.discount_type === 'string') {
      salePayload.discount_type = body.discount_type;
    }
    if (typeof body?.coupon_code === 'string') {
      salePayload.coupon_code = body.coupon_code;
    }

    const itemsPayload = Array.isArray(items) ? items.map((it: any) => ({
      product_id: it.product_id,
      quantity: Number(it.quantity),
      unit_price: Number(it.unit_price),
      total_price: Number(it.quantity) * Number(it.unit_price) - (Number(it.discount_amount) || 0),
      discount_amount: Number(it.discount_amount) || 0,
    })) : [];

    const { data: insertedSale, error: saleInsertError } = await (supabase as any)
      .from('sales')
      .insert(salePayload)
      .select('id, customer_id, user_id, total_amount, tax_amount, discount_amount, discount_type, coupon_code, payment_method, status, sale_type, notes, created_at, updated_at')
      .single();

    if (saleInsertError || !insertedSale) {
      console.warn('[sales] Supabase sale insert error, falling back to backend:', saleInsertError?.message);

      try {
        const backendBase = getBackendBaseURL();
        if (!backendBase) return NextResponse.json({ error: 'Backend URL not configured' }, { status: 500 });
        const url = `${backendBase.replace(/\/$/, '')}/sales`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const backendPayload = {
          customerId: body?.customer_id ?? undefined,
          items: Array.isArray(body?.items) ? body.items.map((it: any) => ({
            productId: it.product_id,
            quantity: Number(it.quantity),
            unitPrice: Number(it.unit_price),
          })) : [],
          paymentMethod: body?.payment_method ?? 'CASH',
          mixedPayments: Array.isArray(body?.mixedPayments) ? body.mixedPayments : undefined,
          paymentDetails: body?.payment_details,
          discount: Number(body?.discount_amount) || 0,
          discountType: (body?.discount_type === 'PERCENTAGE' || body?.discount_type === 'FIXED_AMOUNT') ? body.discount_type : 'FIXED_AMOUNT',
          tax: Number(body?.tax_amount) || 0,
          notes: body?.coupon_code ? `${body?.notes ?? ''}`.trim() : (body?.notes ?? ''),
          cashReceived: typeof body?.cashReceived === 'number' ? Number(body.cashReceived) : undefined,
          change: typeof body?.change === 'number' ? Number(body.change) : undefined,
          transferReference: body?.transfer_reference ?? body?.transferReference,
          branchId: operationalContext.branchId ?? undefined,
          posId: operationalContext.posId ?? undefined,
        };
        const res = await fetch(url, {
          method: 'POST',
          body: JSON.stringify(backendPayload),
          headers: getBackendHeaders(accessToken, orgId, operationalContext),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!res.ok) {
          const details = await res.text().catch(() => 'Unknown error');
          return NextResponse.json({ error: `Backend error: ${res.status}`, details }, { status: res.status });
        }
        const backendData = await res.json();
        const rawSale = backendData?.sale ?? backendData;
        const normalized = normalizeSale(rawSale);
        return NextResponse.json({ success: true, sale: normalized }, { status: 200 });
      } catch (err: any) {
        const statusCode = err?.status ?? err?.response?.status ?? 500;
        const details = err?.response?.data || err?.message || 'Unknown error';
        return NextResponse.json({ error: `Backend error: ${statusCode}`, details }, { status: statusCode });
      }
    }

    const { data: insertedItems, error: itemsError } = await (supabase as any)
      .from('sale_items')
      .insert(itemsPayload.map((it: any) => ({ ...it, sale_id: insertedSale.id })))
      .select('id, sale_id, product_id, quantity, unit_price, total_price, discount_amount, created_at, updated_at');

    if (itemsError) {
      try { await (supabase as any).from('sales').delete().eq('id', insertedSale.id); } catch (rollbackErr) { console.error('Rollback failed:', rollbackErr); }
      return NextResponse.json({ error: 'Failed to insert sale items', details: itemsError.message }, { status: 500 });
    }

    // fetch con relaciones para respuesta completa
    await persistSaleOperationalFields(supabase as any, orgId, String(insertedSale.id), paymentDetails, operationalContext);

    const { data: saleFull, error: saleFullError } = await (supabase as any)
      .from('sales')
      .select(`
        *,
        customer:customers(id, name, email, phone),
        items:sale_items(
          id, sale_id, product_id, quantity, unit_price, total_price, discount_amount, created_at, updated_at,
          product:products(id, name, sku, price)
        )
      `)
      .eq('id', insertedSale.id)
      .eq('organization_id', orgId)
      .single();

    if (!saleFullError && saleFull) {
      try {
        await insertCashMovementForSale(
          supabase as any,
          orgId,
          user?.id,
          String(saleFull.id),
          paymentDetails.cashAmount,
          operationalContext,
        );
      } catch (syncErr) {
        console.warn('[sales] Cash sync error:', syncErr);
      }
      return NextResponse.json({
        success: true,
        sale: normalizeSale({
          ...saleFull,
          payment_method: paymentDetails.primaryMethod,
          payment_details: saleFull.payment_details ?? paymentDetails,
          branch_id: saleFull.branch_id ?? operationalContext.branchId,
          pos_id: saleFull.pos_id ?? operationalContext.posId,
        }),
      }, { status: 200 });
    }

    // Si el select con relaciones falla, devolver base
    try {
      await insertCashMovementForSale(
        supabase as any,
        orgId,
        user?.id,
        String(insertedSale.id),
        paymentDetails.cashAmount,
        operationalContext,
      );
    } catch (syncErr) {
      console.warn('[sales] Cash sync (base) error:', syncErr);
    }
    return NextResponse.json({
      success: true,
      sale: normalizeSale({
        ...insertedSale,
        payment_method: paymentDetails.primaryMethod,
        payment_details: paymentDetails,
        branch_id: operationalContext.branchId,
        pos_id: operationalContext.posId,
        items: insertedItems || [],
      }),
    }, { status: 200 });

  } catch (error) {
    console.error('Error in sales API route:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
