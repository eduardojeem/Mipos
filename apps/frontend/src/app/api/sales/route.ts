import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import api from '@/lib/api';

// Backend URL resolution removed in favor of centralized api client
// Helper: read backend base URL from env only (avoid self-calls)
function getBackendBaseURL(): string | null {
  const url = process.env.BACKEND_URL;
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\/+$/, '') + '/api';
}

// Normalize backend Prisma-style sale to frontend Supabase-style shape
const normalizeSale = (sale: any) => {
  if (!sale || typeof sale !== 'object') return sale;
  return {
    ...sale,
    // Core amounts
    total_amount: sale.total ?? sale.total_amount ?? 0,
    tax_amount: sale.tax ?? sale.tax_amount ?? undefined,
    discount_amount: sale.discount ?? sale.discount_amount ?? undefined,
    discount_type: sale.discount_type ?? sale.discountType ?? undefined,
    coupon_code: sale.coupon_code ?? sale.couponCode ?? undefined,
    // Payment fields
    payment_method: sale.paymentMethod ?? sale.payment_method ?? 'CASH',
    // Timestamps
    created_at: sale.created_at ?? sale.date ?? sale.createdAt ?? undefined,
    updated_at: sale.updated_at ?? sale.updatedAt ?? undefined,
    // Relations
    customer_id: sale.customerId ?? sale.customer_id ?? sale.customer?.id ?? undefined,
    user_id: sale.userId ?? sale.user_id ?? sale.user?.id ?? undefined,
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
    const page = Number(searchParams.get('page') || 1);
    const limit = Number(searchParams.get('limit') || 50);
    const customerId = searchParams.get('customer_id') || undefined;

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
      const baseFields = 'id, customer_id, user_id, total_amount, tax_amount, discount_amount, payment_method, status, sale_type, notes, created_at, updated_at, customer:customers (id, name, email, phone)';
      const itemsFields = includeItems
        ? ', sale_items (id, sale_id, product_id, quantity, unit_price, total_price, discount_amount' + (includeProduct ? ', products (id, name, sku)' : '') + ')'
        : '';
      const selectFields = baseFields + itemsFields;

      let query = (supabase as any)
        .from('sales')
        .select(selectFields, { count: 'exact' })
        .order('created_at', { ascending: false });

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
          return { ...rest, items };
        }) : sales;
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
      const headers: Record<string, string> = { 'Accept': 'application/json' };
      if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

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
      const result = {
        success: true,
        message: 'Venta simulada (modo desarrollo, sin Supabase)',
        sale: {
          id: mockSaleId,
          created_at: now,
          status: 'COMPLETED',
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
        const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
        if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
        // Mapear al esquema esperado por el backend Prisma
        const backendPayload = {
          customerId: body?.customer_id ?? undefined,
          items: Array.isArray(body?.items) ? body.items.map((it: any) => ({
            productId: it.product_id,
            quantity: Number(it.quantity),
            unitPrice: Number(it.unit_price),
          })) : [],
          paymentMethod: body?.payment_method ?? 'CASH',
          discount: Number(body?.discount_amount) || 0,
          discountType: (body?.discount_type === 'PERCENTAGE' || body?.discount_type === 'FIXED_AMOUNT') ? body.discount_type : 'FIXED_AMOUNT',
          tax: Number(body?.tax_amount) || 0,
          notes: body?.coupon_code ? `${body?.notes ?? ''}`.trim() : (body?.notes ?? ''),
        };
        const res = await fetch(url, { method: 'POST', body: JSON.stringify(backendPayload), headers, signal: controller.signal });
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

      const rpcPayload = {
        p_customer_id: body.customer_id ?? null,
        p_user_id: userId,
        p_total_amount: totalAmount,
        p_tax_amount: taxAmount,
        p_discount_amount: discountAmount,
        p_payment_method: body.payment_method ?? 'CASH',
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
          const paymentMethod = String(rpcResult.payment_method || body.payment_method || 'CASH').toUpperCase();
          const total = Number(rpcResult.total_amount || body.total_amount || 0);
          const netCash = (typeof body.cashReceived === 'number' ? Number(body.cashReceived) : 0) - (typeof body.change === 'number' ? Number(body.change) : 0);
          const mixedCash = Array.isArray(body.mixedPayments)
            ? body.mixedPayments.filter((p: any) => String(p.type).toUpperCase() === 'CASH').reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)
            : 0;
          const cashAmount = paymentMethod === 'CASH' ? (netCash > 0 ? netCash : total) : mixedCash;
          if (cashAmount && cashAmount > 0) {
            const { data: openSession } = await (supabase as any)
              .from('cash_sessions')
              .select('id, session_status')
              .eq('session_status', 'open')
              .order('opening_time', { ascending: false })
              .limit(1)
              .maybeSingle();
            if (openSession?.id) {
              await (supabase as any)
                .from('cash_movements')
                .insert({
                  session_id: openSession.id,
                  type: 'SALE',
                  amount: cashAmount,
                  reason: `Venta #${rpcResult.id}`,
                  reference_type: 'SALE',
                  reference_id: String(rpcResult.id),
                });
            }
          }
        } catch (syncErr) {
          console.warn('[sales] Cash sync (RPC) error:', syncErr);
        }
        return NextResponse.json({ success: true, sale: rpcResult }, { status: 200 });
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

    const salePayload: any = {
      customer_id: customer_id ?? null,
      total_amount: totalAmount,
      tax_amount: taxAmount || null,
      discount_amount: discountAmount || null,
      payment_method: payment_method || 'CASH',
      status: 'COMPLETED',
      sale_type: sale_type || 'RETAIL',
      notes: notes || null,
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
        const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
        if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
        const backendPayload = {
          customerId: body?.customer_id ?? undefined,
          items: Array.isArray(body?.items) ? body.items.map((it: any) => ({
            productId: it.product_id,
            quantity: Number(it.quantity),
            unitPrice: Number(it.unit_price),
          })) : [],
          paymentMethod: body?.payment_method ?? 'CASH',
          discount: Number(body?.discount_amount) || 0,
          discountType: (body?.discount_type === 'PERCENTAGE' || body?.discount_type === 'FIXED_AMOUNT') ? body.discount_type : 'FIXED_AMOUNT',
          tax: Number(body?.tax_amount) || 0,
          notes: body?.coupon_code ? `${body?.notes ?? ''}`.trim() : (body?.notes ?? ''),
        };
        const res = await fetch(url, { method: 'POST', body: JSON.stringify(backendPayload), headers, signal: controller.signal });
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
    const { data: saleFull, error: saleFullError } = await (supabase as any)
      .from('sales')
      .select(`
        id, customer_id, user_id, total_amount, tax_amount, discount_amount, discount_type, coupon_code, payment_method, status, sale_type, notes, created_at, updated_at,
        customer:customers(id, name, email, phone),
        items:sale_items(
          id, sale_id, product_id, quantity, unit_price, total_price, discount_amount, created_at, updated_at,
          product:products(id, name, sku, price)
        )
      `)
      .eq('id', insertedSale.id)
      .single();

    if (!saleFullError && saleFull) {
      try {
        const paymentMethod = String(saleFull.payment_method || body.payment_method || 'CASH').toUpperCase();
        const total = Number(saleFull.total_amount || body.total_amount || 0);
        const netCash = (typeof body.cashReceived === 'number' ? Number(body.cashReceived) : 0) - (typeof body.change === 'number' ? Number(body.change) : 0);
        const mixedCash = Array.isArray(body.mixedPayments)
          ? body.mixedPayments.filter((p: any) => String(p.type).toUpperCase() === 'CASH').reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)
          : 0;
        const cashAmount = paymentMethod === 'CASH' ? (netCash > 0 ? netCash : total) : mixedCash;
        if (cashAmount && cashAmount > 0) {
          const { data: openSession } = await (supabase as any)
            .from('cash_sessions')
            .select('id, session_status')
            .eq('session_status', 'open')
            .order('opening_time', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (openSession?.id) {
            await (supabase as any)
              .from('cash_movements')
              .insert({
                session_id: openSession.id,
                type: 'SALE',
                amount: cashAmount,
                reason: `Venta #${saleFull.id}`,
                reference_type: 'SALE',
                reference_id: String(saleFull.id),
              });
          }
        }
      } catch (syncErr) {
        console.warn('[sales] Cash sync error:', syncErr);
      }
      return NextResponse.json({ success: true, sale: saleFull }, { status: 200 });
    }

    // Si el select con relaciones falla, devolver base
    try {
      const paymentMethod = String(insertedSale.payment_method || body.payment_method || 'CASH').toUpperCase();
      const total = Number(insertedSale.total_amount || body.total_amount || 0);
      const netCash = (typeof body.cashReceived === 'number' ? Number(body.cashReceived) : 0) - (typeof body.change === 'number' ? Number(body.change) : 0);
      const mixedCash = Array.isArray(body.mixedPayments)
        ? body.mixedPayments.filter((p: any) => String(p.type).toUpperCase() === 'CASH').reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)
        : 0;
      const cashAmount = paymentMethod === 'CASH' ? (netCash > 0 ? netCash : total) : mixedCash;
      if (cashAmount && cashAmount > 0) {
        const { data: openSession } = await (supabase as any)
          .from('cash_sessions')
          .select('id, session_status')
          .eq('session_status', 'open')
          .order('opening_time', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (openSession?.id) {
          await (supabase as any)
            .from('cash_movements')
            .insert({
              session_id: openSession.id,
              type: 'SALE',
              amount: cashAmount,
              reason: `Venta #${insertedSale.id}`,
              reference_type: 'SALE',
              reference_id: String(insertedSale.id),
            });
        }
      }
    } catch (syncErr) {
      console.warn('[sales] Cash sync (base) error:', syncErr);
    }
    return NextResponse.json({ success: true, sale: { ...insertedSale, items: insertedItems || [] } }, { status: 200 });

  } catch (error) {
    console.error('Error in sales API route:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
