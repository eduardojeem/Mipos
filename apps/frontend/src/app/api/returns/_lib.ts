import type { NextRequest } from 'next/server';
import { getUserOrganizationId } from '@/app/api/_utils/organization';
import { getValidatedOrganizationId } from '@/lib/organization';
import { createAdminClient } from '@/lib/supabase-admin';

export type ReturnDbStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
export type ReturnRefundMethod = 'CASH' | 'CARD' | 'TRANSFER' | 'OTHER';

type ReturnOperationalContext = {
  branchId?: string;
  posId?: string;
};

type ReturnItemRow = {
  id?: string | null;
  product_id?: string | null;
  productId?: string | null;
  quantity?: number | string | null;
  unit_price?: number | string | null;
  unitPrice?: number | string | null;
  reason?: string | null;
  original_sale_item_id?: string | null;
  originalSaleItemId?: string | null;
  product?: {
    name?: string | null;
    sku?: string | null;
  } | null;
};

type ReturnRecordRow = {
  id: string;
  original_sale_id?: string | null;
  originalSaleId?: string | null;
  customer_id?: string | null;
  customerId?: string | null;
  customer?: {
    name?: string | null;
    full_name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  status?: string | null;
  reason?: string | null;
  refund_method?: string | null;
  refundMethod?: string | null;
  total_amount?: number | string | null;
  totalAmount?: number | string | null;
  notes?: string | null;
  processed_at?: string | null;
  processedAt?: string | null;
  processed_by?: string | null;
  processedBy?: string | null;
  created_at?: string | null;
  createdAt?: string | null;
  updated_at?: string | null;
  updatedAt?: string | null;
  items?: ReturnItemRow[] | null;
};

export type ReturnReadFilters = {
  search?: string | null;
  returnId?: string | null;
  status?: ReturnDbStatus | null;
  customerId?: string | null;
  originalSaleId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  refundMethod?: string | null;
};

const RETURN_STATUS_TRANSITIONS: Record<ReturnDbStatus, ReturnDbStatus[]> = {
  PENDING: ['APPROVED', 'REJECTED'],
  APPROVED: ['COMPLETED', 'REJECTED'],
  REJECTED: [],
  COMPLETED: [],
};

const RETURNS_COMPAT_SELECT = `
  id,
  original_sale_id,
  customer_id,
  status,
  reason,
  refund_method,
  total_amount,
  created_at,
  updated_at
`;

const RETURN_ITEMS_COMPAT_SELECT = `
  id,
  return_id,
  product_id,
  quantity,
  unit_price,
  reason,
  original_sale_item_id
`;

const RETURN_ITEMS_WITH_PRODUCT_SELECT = `
  id,
  return_id,
  product_id,
  quantity,
  unit_price,
  reason,
  original_sale_item_id,
  product:products(name, sku)
`;

const RETURN_READ_BATCH_SIZE = 250;

type HydratedCustomer = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
};

type HydratedProduct = {
  name?: string | null;
  sku?: string | null;
};

export type ReturnMutationItemInput = {
  originalSaleItemId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  reason?: string | null;
};

type SaleValidationItemRow = {
  id: string;
  product_id?: string | null;
  quantity?: number | string | null;
  unit_price?: number | string | null;
};

type SaleValidationRow = {
  id: string;
  customer_id?: string | null;
  created_at?: string | null;
  date?: string | null;
  sale_items?: SaleValidationItemRow[] | null;
};

type ExistingReturnItemQuantityRow = {
  original_sale_item_id?: string | null;
  quantity?: number | string | null;
};

type ExistingReturnRow = {
  id?: string | null;
  items?: ExistingReturnItemQuantityRow[] | null;
};

type ReturnSaleValidationResult =
  | {
      ok: true;
      normalizedItems: ReturnMutationItemInput[];
      sale: {
        customerId: string | null;
        saleDate: string | null;
        items: SaleValidationItemRow[];
      };
    }
  | {
      ok: false;
      status: number;
      error: string;
    };

function safeNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundTo2(value: number): number {
  return Math.round(value * 100) / 100;
}

function clampText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, maxLength);
}

function normalizeReturnFilterDate(value: unknown, boundary: 'start' | 'end'): string | null {
  const trimmed = String(value || '').trim();
  if (!trimmed) {
    return null;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    if (boundary === 'start') {
      parsed.setUTCHours(0, 0, 0, 0);
    } else {
      parsed.setUTCHours(23, 59, 59, 999);
    }
  }

  return parsed.toISOString();
}

export function normalizeReturnFilterStartDate(value: unknown): string | null {
  return normalizeReturnFilterDate(value, 'start');
}

export function normalizeReturnFilterEndDate(value: unknown): string | null {
  return normalizeReturnFilterDate(value, 'end');
}

export function parseBoundedInteger(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsed));
}

export function isMissingColumnError(error: unknown): boolean {
  const message = String((error as { message?: string })?.message || '').toLowerCase();
  const details = String((error as { details?: string })?.details || '').toLowerCase();
  const code = String((error as { code?: string })?.code || '').toUpperCase();

  return (
    code === 'PGRST204' ||
    code === '42703' ||
    message.includes('column') && message.includes('does not exist') ||
    details.includes('column') && details.includes('does not exist')
  );
}

export function isMissingRelationError(error: unknown): boolean {
  const message = String((error as { message?: string })?.message || '').toLowerCase();
  const details = String((error as { details?: string })?.details || '').toLowerCase();
  const code = String((error as { code?: string })?.code || '').toUpperCase();

  return (
    code === 'PGRST200' ||
    code === 'PGRST201' ||
    message.includes('relationship') ||
    message.includes('relation') ||
    details.includes('relationship') ||
    details.includes('relation')
  );
}

export function isReturnReadCompatibilityError(error: unknown): boolean {
  return isMissingColumnError(error) || isMissingRelationError(error);
}

export function normalizeReturnStatusToDb(value: unknown): ReturnDbStatus | null {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'PROCESSED' || normalized === 'COMPLETED') return 'COMPLETED';
  if (normalized === 'PENDING') return 'PENDING';
  if (normalized === 'APPROVED') return 'APPROVED';
  if (normalized === 'REJECTED') return 'REJECTED';
  return null;
}

export function normalizeReturnStatusToUi(value: unknown): 'pending' | 'approved' | 'processed' | 'rejected' {
  const normalized = normalizeReturnStatusToDb(value);
  if (normalized === 'COMPLETED') return 'processed';
  if (normalized === 'APPROVED') return 'approved';
  if (normalized === 'REJECTED') return 'rejected';
  return 'pending';
}

export function parseReturnRefundMethod(value: unknown): ReturnRefundMethod | null {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === 'card') return 'CARD';
  if (normalized === 'bank_transfer' || normalized === 'transfer' || normalized === 'wire') return 'TRANSFER';
  if (normalized === 'cash') return 'CASH';
  if (normalized === 'other') return 'OTHER';
  return null;
}

export function normalizeRefundMethodToDb(value: unknown): ReturnRefundMethod {
  return parseReturnRefundMethod(value) || 'OTHER';
}

export function normalizeRefundMethodToUi(value: unknown): 'cash' | 'card' | 'bank_transfer' | 'other' {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'CARD') return 'card';
  if (normalized === 'TRANSFER' || normalized === 'BANK_TRANSFER') return 'bank_transfer';
  if (normalized === 'CASH') return 'cash';
  return 'other';
}

export function getReturnDisplayNumber(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

export function getRequestedReturnsOrganizationId(request: NextRequest): string | null {
  const { searchParams } = new URL(request.url);
  const requested =
    searchParams.get('organizationId') ||
    searchParams.get('organization_id') ||
    request.headers.get('x-organization-id') ||
    request.cookies.get('x-organization-id')?.value ||
    null;

  const normalized = String(requested || '').trim();
  return normalized || null;
}

async function organizationExists(organizationId: string): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('organizations')
      .select('id')
      .eq('id', organizationId)
      .maybeSingle();

    return !error && Boolean(data?.id);
  } catch {
    return false;
  }
}

export async function resolveReturnsOrganizationId(
  request: NextRequest,
  auth?: { userId?: string | null; userRole?: string | null }
): Promise<string | null> {
  const validatedOrganizationId = await getValidatedOrganizationId(request);
  if (validatedOrganizationId) {
    return validatedOrganizationId;
  }

  const requestedOrganizationId = getRequestedReturnsOrganizationId(request);
  const normalizedRole = String(auth?.userRole || '').trim().toUpperCase();
  const userId = String(auth?.userId || '').trim();

  if (!requestedOrganizationId) {
    return userId ? await getUserOrganizationId(userId) : null;
  }

  if (userId === 'mock-user' || userId === 'mock-user-id') {
    return requestedOrganizationId;
  }

  if (normalizedRole === 'SUPER_ADMIN') {
    return (await organizationExists(requestedOrganizationId)) ? requestedOrganizationId : null;
  }

  return null;
}

export function aggregateReturnItems(items: ReturnMutationItemInput[]) {
  const normalizedItems = new Map<string, ReturnMutationItemInput>();

  for (const item of items) {
    const originalSaleItemId = String(item.originalSaleItemId || '').trim();
    if (!originalSaleItemId) {
      return { ok: false as const, error: 'Each return item must include its original sale item.' };
    }

    const existing = normalizedItems.get(originalSaleItemId);
    if (!existing) {
      normalizedItems.set(originalSaleItemId, {
        originalSaleItemId,
        productId: String(item.productId || '').trim(),
        quantity: safeNumber(item.quantity),
        unitPrice: roundTo2(safeNumber(item.unitPrice)),
        reason: item.reason || null,
      });
      continue;
    }

    if (String(existing.productId) !== String(item.productId)) {
      return {
        ok: false as const,
        error: `Conflicting product references for sale item ${originalSaleItemId}.`,
      };
    }

    if (Math.abs(existing.unitPrice - safeNumber(item.unitPrice)) > 0.01) {
      return {
        ok: false as const,
        error: `Conflicting prices for sale item ${originalSaleItemId}.`,
      };
    }

    existing.quantity += safeNumber(item.quantity);
    if (!existing.reason && item.reason) {
      existing.reason = item.reason;
    }
  }

  return {
    ok: true as const,
    items: Array.from(normalizedItems.values()),
  };
}

export function mapReturnItem(item: ReturnItemRow) {
  return {
    id: item.id || item.original_sale_item_id || item.originalSaleItemId || item.product_id || item.productId || '',
    productId: item.product_id || item.productId || '',
    productName: item.product?.name || 'Producto desconocido',
    sku: item.product?.sku || '',
    quantity: safeNumber(item.quantity),
    unitPrice: safeNumber(item.unit_price ?? item.unitPrice),
    reason: item.reason || '',
    originalSaleItemId: item.original_sale_item_id || item.originalSaleItemId || item.id || null,
  };
}

export function mapReturnRecord(row: ReturnRecordRow) {
  return {
    id: row.id,
    returnNumber: getReturnDisplayNumber(row.id),
    saleId: row.original_sale_id || row.originalSaleId || '',
    originalSaleId: row.original_sale_id || row.originalSaleId || '',
    customerId: row.customer_id || row.customerId || null,
    customerName: row.customer?.name || row.customer?.full_name || 'Cliente sin nombre',
    customerEmail: row.customer?.email || '',
    customerPhone: row.customer?.phone || '',
    items: Array.isArray(row.items) ? row.items.map(mapReturnItem) : [],
    totalAmount: safeNumber(row.total_amount ?? row.totalAmount),
    reason: row.reason || '',
    notes: row.notes || '',
    status: normalizeReturnStatusToUi(row.status),
    refundMethod: normalizeRefundMethodToUi(row.refund_method ?? row.refundMethod),
    processedAt: row.processed_at || row.processedAt || null,
    processedBy: row.processed_by || row.processedBy || undefined,
    createdAt: row.created_at || row.createdAt || '',
    updatedAt: row.updated_at || row.updatedAt || '',
  };
}

export function matchesReturnSearchTerm(returnRecord: ReturnRecordRow | ReturnType<typeof mapReturnRecord>, term: string): boolean {
  const normalizedTerm = term.trim().toLowerCase();
  if (!normalizedTerm) {
    return true;
  }

  const customerName = String(
    'customerName' in returnRecord
      ? returnRecord.customerName
      : returnRecord.customer?.name || returnRecord.customer?.full_name || ''
  ).toLowerCase();
  const reason = String(returnRecord.reason || '').toLowerCase();
  const saleId = String(
    'saleId' in returnRecord
      ? returnRecord.saleId
      : returnRecord.original_sale_id || returnRecord.originalSaleId || ''
  ).toLowerCase();
  const returnId = String(returnRecord.id || '').toLowerCase();

  return (
    customerName.includes(normalizedTerm) ||
    reason.includes(normalizedTerm) ||
    saleId.includes(normalizedTerm) ||
    returnId.includes(normalizedTerm)
  );
}

export function calculateReturnsStats(
  rows: ReturnRecordRow[],
  totalSales: number = 0
) {
  const totals = {
    totalReturns: rows.length,
    totalAmount: 0,
    pendingReturns: 0,
    pendingAmount: 0,
    approvedReturns: 0,
    approvedAmount: 0,
    rejectedReturns: 0,
    rejectedAmount: 0,
    completedReturns: 0,
    completedAmount: 0,
    avgProcessingTime: 0,
    returnRate: 0,
  };

  let processedCount = 0;
  let totalProcessingHours = 0;

  for (const row of rows) {
    const amount = safeNumber(row.total_amount ?? row.totalAmount);
    const dbStatus = normalizeReturnStatusToDb(row.status);
    totals.totalAmount += amount;

    if (dbStatus === 'PENDING') {
      totals.pendingReturns += 1;
      totals.pendingAmount += amount;
    } else if (dbStatus === 'APPROVED') {
      totals.approvedReturns += 1;
      totals.approvedAmount += amount;
    } else if (dbStatus === 'REJECTED') {
      totals.rejectedReturns += 1;
      totals.rejectedAmount += amount;
    } else if (dbStatus === 'COMPLETED') {
      totals.completedReturns += 1;
      totals.completedAmount += amount;

      const createdAt = row.created_at || row.createdAt;
      const processedAt = row.processed_at || row.processedAt || row.updated_at || row.updatedAt;
      if (createdAt && processedAt) {
        const hours = (new Date(processedAt).getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
        if (Number.isFinite(hours) && hours >= 0) {
          totalProcessingHours += hours;
          processedCount += 1;
        }
      }
    }
  }

  totals.totalAmount = roundTo2(totals.totalAmount);
  totals.pendingAmount = roundTo2(totals.pendingAmount);
  totals.approvedAmount = roundTo2(totals.approvedAmount);
  totals.rejectedAmount = roundTo2(totals.rejectedAmount);
  totals.completedAmount = roundTo2(totals.completedAmount);
  totals.avgProcessingTime = processedCount > 0 ? roundTo2(totalProcessingHours / processedCount) : 0;
  totals.returnRate = totalSales > 0 ? roundTo2((rows.length / totalSales) * 100) : 0;

  return totals;
}

function getReturnRowCreatedAt(row: ReturnRecordRow): string | null {
  return row.created_at || row.createdAt || null;
}

function sortReturnRowsDesc(rows: ReturnRecordRow[]) {
  return [...rows].sort((left, right) => {
    const leftTime = new Date(getReturnRowCreatedAt(left) || 0).getTime();
    const rightTime = new Date(getReturnRowCreatedAt(right) || 0).getTime();
    return rightTime - leftTime;
  });
}

export function applyReturnReadFiltersToQuery(query: any, filters: ReturnReadFilters) {
  if (filters.returnId) query = query.eq('id', filters.returnId);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.customerId) query = query.eq('customer_id', filters.customerId);
  if (filters.originalSaleId) query = query.eq('original_sale_id', filters.originalSaleId);
  if (filters.startDate) query = query.gte('created_at', filters.startDate);
  if (filters.endDate) query = query.lte('created_at', filters.endDate);
  if (filters.refundMethod) query = query.eq('refund_method', filters.refundMethod);
  return query;
}

export function filterReturnRowsInMemory(rows: ReturnRecordRow[], filters: ReturnReadFilters) {
  const normalizedSearch = String(filters.search || '').trim().toLowerCase();
  const startTime = filters.startDate ? new Date(filters.startDate).getTime() : null;
  const endTime = filters.endDate ? new Date(filters.endDate).getTime() : null;
  const normalizedRefundMethod = filters.refundMethod ? String(filters.refundMethod).trim().toUpperCase() : null;

  return sortReturnRowsDesc(
    rows.filter((row) => {
      if (filters.returnId && row.id !== filters.returnId) {
        return false;
      }

      if (filters.status && normalizeReturnStatusToDb(row.status) !== filters.status) {
        return false;
      }

      if (filters.customerId && (row.customer_id || row.customerId || null) !== filters.customerId) {
        return false;
      }

      if (filters.originalSaleId && (row.original_sale_id || row.originalSaleId || null) !== filters.originalSaleId) {
        return false;
      }

      if (normalizedRefundMethod) {
        const refundMethod = String(row.refund_method || row.refundMethod || '').trim().toUpperCase();
        if (refundMethod !== normalizedRefundMethod) {
          return false;
        }
      }

      if (startTime !== null || endTime !== null) {
        const createdTime = new Date(getReturnRowCreatedAt(row) || 0).getTime();
        if (!Number.isFinite(createdTime)) {
          return false;
        }
        if (startTime !== null && createdTime < startTime) {
          return false;
        }
        if (endTime !== null && createdTime > endTime) {
          return false;
        }
      }

      if (normalizedSearch && !matchesReturnSearchTerm(row, normalizedSearch)) {
        return false;
      }

      return true;
    })
  );
}

export async function fetchAllPagedRows<T>(
  runBatch: (from: number, to: number) => Promise<{ data?: T[] | null; error?: { message?: string } | null }>
): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += RETURN_READ_BATCH_SIZE) {
    const result = await runBatch(offset, offset + RETURN_READ_BATCH_SIZE - 1);
    if (result.error) {
      throw result.error;
    }

    const batch = Array.isArray(result.data) ? result.data : [];
    rows.push(...batch);

    if (batch.length < RETURN_READ_BATCH_SIZE) {
      break;
    }
  }

  return rows;
}

async function fetchCustomersByIds(
  supabase: any,
  customerIds: string[]
): Promise<Map<string, HydratedCustomer>> {
  const ids = [...new Set(customerIds.filter(Boolean))];
  if (!ids.length) {
    return new Map<string, HydratedCustomer>();
  }

  let result = await supabase
    .from('customers')
    .select('id, name, email, phone')
    .in('id', ids);

  if (result.error && isMissingColumnError(result.error)) {
    result = await supabase
      .from('customers')
      .select('id, name')
      .in('id', ids);
  }

  if (result.error) {
    console.warn('[returns] Failed to hydrate customer data:', result.error.message);
    return new Map<string, HydratedCustomer>();
  }

  return new Map(
    (Array.isArray(result.data) ? result.data : []).map((row: any) => [
      row.id,
      {
        name: row.name ?? null,
        email: row.email ?? null,
        phone: row.phone ?? null,
      },
    ])
  );
}

async function fetchProductsByIds(
  supabase: any,
  productIds: string[]
): Promise<Map<string, HydratedProduct>> {
  const ids = [...new Set(productIds.filter(Boolean))];
  if (!ids.length) {
    return new Map<string, HydratedProduct>();
  }

  let result = await supabase
    .from('products')
    .select('id, name, sku')
    .in('id', ids);

  if (result.error && isMissingColumnError(result.error)) {
    result = await supabase
      .from('products')
      .select('id, name')
      .in('id', ids);
  }

  if (result.error) {
    console.warn('[returns] Failed to hydrate product data:', result.error.message);
    return new Map<string, HydratedProduct>();
  }

  return new Map(
    (Array.isArray(result.data) ? result.data : []).map((row: any) => [
      row.id,
      {
        name: row.name ?? null,
        sku: row.sku ?? null,
      },
    ])
  );
}

export async function hydrateReturnCustomers(supabase: any, rows: ReturnRecordRow[]) {
  const customerMap = await fetchCustomersByIds(
    supabase,
    rows.map((row) => row.customer_id || row.customerId || '').filter(Boolean)
  );

  if (!customerMap.size) {
    return rows;
  }

  return rows.map((row) => {
    if (row.customer?.name || row.customer?.full_name) {
      return row;
    }

    const customer = customerMap.get(row.customer_id || row.customerId || '');
    if (!customer) {
      return row;
    }

    return {
      ...row,
      customer: {
        name: customer.name ?? null,
        email: customer.email ?? null,
        phone: customer.phone ?? null,
      },
    };
  });
}

async function fetchReturnItemsCompat(supabase: any, returnId: string) {
  const result = await supabase
    .from('return_items')
    .select(RETURN_ITEMS_WITH_PRODUCT_SELECT)
    .eq('return_id', returnId)
    .order('created_at', { ascending: true });

  if (!result.error) {
    return Array.isArray(result.data) ? result.data : [];
  }

  if (!isReturnReadCompatibilityError(result.error)) {
    throw new Error(result.error.message);
  }

  const fallback = await supabase
    .from('return_items')
    .select(RETURN_ITEMS_COMPAT_SELECT)
    .eq('return_id', returnId)
    .order('created_at', { ascending: true });

  if (fallback.error) {
    throw new Error(fallback.error.message);
  }

  const rows = Array.isArray(fallback.data) ? fallback.data : [];
  const productMap = await fetchProductsByIds(
    supabase,
    rows.map((row: any) => row.product_id).filter(Boolean)
  );

  return rows.map((row: any) => ({
    ...row,
    product: productMap.get(row.product_id || '') || null,
  }));
}

async function fetchOrganizationSaleIdsCompat(
  supabase: any,
  organizationId: string,
  originalSaleId?: string | null
) {
  if (originalSaleId) {
    const result = await supabase
      .from('sales')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('id', originalSaleId)
      .limit(1);

    if (result.error) {
      if (isMissingColumnError(result.error)) {
        return null;
      }
      throw new Error(result.error.message);
    }

    return new Set(
      (Array.isArray(result.data) ? result.data : []).map((row: any) => String(row.id))
    );
  }

  try {
    const rows = await fetchAllPagedRows<{ id: string }>((from, to) =>
      supabase
        .from('sales')
        .select('id')
        .eq('organization_id', organizationId)
        .range(from, to)
    );

    return new Set(rows.map((row) => String(row.id)));
  } catch (error) {
    if (isMissingColumnError(error)) {
      return null;
    }
    throw error;
  }
}

export async function fetchReturnRowsCompat(
  supabase: any,
  params: {
    organizationId: string;
    filters?: ReturnReadFilters;
  }
) {
  const filters = params.filters || {};

  try {
    return await fetchAllPagedRows<ReturnRecordRow>((from, to) => {
      let query = supabase
        .from('returns')
        .select(RETURNS_COMPAT_SELECT)
        .eq('organization_id', params.organizationId)
        .order('created_at', { ascending: false })
        .range(from, to);

      query = applyReturnReadFiltersToQuery(query, filters);
      return query;
    });
  } catch (error) {
    if (!isMissingColumnError(error)) {
      throw new Error(String((error as { message?: string } | null)?.message || error));
    }
  }

  const scopedSaleIds = await fetchOrganizationSaleIdsCompat(
    supabase,
    params.organizationId,
    filters.originalSaleId
  );

  if (scopedSaleIds === null) {
    console.warn('[returns] Legacy returns schema without organization_id; using unscoped compatibility read.');
  } else {
    console.warn('[returns] Legacy returns schema without organization_id; scoping compatibility read via sales.');
    if (scopedSaleIds.size === 0) {
      return [];
    }
  }

  const legacyRows = await fetchAllPagedRows<ReturnRecordRow>((from, to) => {
    let query = supabase
      .from('returns')
      .select(RETURNS_COMPAT_SELECT)
      .order('created_at', { ascending: false })
      .range(from, to);

    query = applyReturnReadFiltersToQuery(query, filters);
    return query;
  });

  if (!scopedSaleIds) {
    return legacyRows;
  }

  return legacyRows.filter((row) =>
    scopedSaleIds.has(String(row.original_sale_id || row.originalSaleId || ''))
  );
}

export async function validateReturnAgainstOriginalSale(
  supabase: any,
  params: {
    organizationId: string;
    originalSaleId: string;
    items: ReturnMutationItemInput[];
    excludeReturnId?: string | null;
    maxReturnDays?: number | null;
  }
): Promise<ReturnSaleValidationResult> {
  const aggregatedItems = aggregateReturnItems(params.items);
  if (!aggregatedItems.ok) {
    return { ok: false, status: 400, error: aggregatedItems.error };
  }

  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .select(`
      id,
      customer_id,
      created_at,
      date,
      sale_items(
        id,
        product_id,
        quantity,
        unit_price
      )
    `)
    .eq('organization_id', params.organizationId)
    .eq('id', params.originalSaleId)
    .maybeSingle();

  if (saleError) {
    return { ok: false, status: 500, error: saleError.message };
  }

  if (!sale) {
    return { ok: false, status: 404, error: 'Original sale not found' };
  }

  const saleRecord = sale as SaleValidationRow;
  const saleDateRaw = saleRecord.created_at || saleRecord.date || null;

  if (params.maxReturnDays != null) {
    const saleDate = saleDateRaw ? new Date(saleDateRaw) : null;
    if (!saleDate || Number.isNaN(saleDate.getTime())) {
      return { ok: false, status: 400, error: 'Original sale has an invalid date' };
    }

    const daysSinceSale = Math.floor(
      (Date.now() - saleDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceSale > params.maxReturnDays) {
      return {
        ok: false,
        status: 400,
        error: `No se pueden devolver productos de una venta con mas de ${params.maxReturnDays} dias.`,
      };
    }
  }

  let existingReturnsQuery = supabase
    .from('returns')
    .select(`
      id,
      items:return_items(
        original_sale_item_id,
        quantity
      )
    `)
    .eq('organization_id', params.organizationId)
    .eq('original_sale_id', params.originalSaleId)
    .in('status', ['APPROVED', 'COMPLETED']);

  if (params.excludeReturnId) {
    existingReturnsQuery = existingReturnsQuery.neq('id', params.excludeReturnId);
  }

  const { data: existingReturns, error: existingReturnsError } = await existingReturnsQuery;
  if (existingReturnsError) {
    return { ok: false, status: 500, error: existingReturnsError.message };
  }

  const alreadyReturnedByItem = new Map<string, number>();
  for (const existingReturn of (existingReturns || []) as ExistingReturnRow[]) {
    const returnItems = Array.isArray(existingReturn.items) ? existingReturn.items : [];
    for (const returnItem of returnItems) {
      const key = String(returnItem.original_sale_item_id || '').trim();
      if (!key) continue;
      alreadyReturnedByItem.set(key, (alreadyReturnedByItem.get(key) || 0) + safeNumber(returnItem.quantity));
    }
  }

  const saleItems = Array.isArray(saleRecord.sale_items) ? saleRecord.sale_items : [];
  const saleItemsById = new Map<string, SaleValidationItemRow>(
    saleItems.map((item) => [String(item.id), item])
  );

  for (const item of aggregatedItems.items) {
    const originalSaleItem = saleItemsById.get(item.originalSaleItemId);
    if (!originalSaleItem) {
      return {
        ok: false,
        status: 400,
        error: `Sale item ${item.originalSaleItemId} not found in original sale`,
      };
    }

    if (String(originalSaleItem.product_id || '') !== String(item.productId || '')) {
      return {
        ok: false,
        status: 400,
        error: `Product mismatch for sale item ${item.originalSaleItemId}`,
      };
    }

    const expectedPrice = safeNumber(originalSaleItem.unit_price);
    if (Math.abs(expectedPrice - item.unitPrice) > 0.01) {
      return {
        ok: false,
        status: 400,
        error: `El precio del item ${item.originalSaleItemId} no coincide con la venta original.`,
      };
    }

    const alreadyReturned = alreadyReturnedByItem.get(item.originalSaleItemId) || 0;
    const availableToReturn = safeNumber(originalSaleItem.quantity) - alreadyReturned;
    if (item.quantity > availableToReturn) {
      return {
        ok: false,
        status: 400,
        error: `No se pueden devolver ${item.quantity} unidades. Solo ${availableToReturn} disponibles.`,
      };
    }
  }

  return {
    ok: true,
    normalizedItems: aggregatedItems.items,
    sale: {
      customerId: saleRecord.customer_id || null,
      saleDate: saleDateRaw,
      items: saleItems,
    },
  };
}

export function getReturnOperationalContext(request: NextRequest): ReturnOperationalContext {
  const branchId = request.headers.get('x-branch-id')?.trim() || undefined;
  const posId =
    request.headers.get('x-pos-id')?.trim() ||
    request.headers.get('x-register-id')?.trim() ||
    undefined;

  return { branchId, posId };
}

async function findOpenCashSession(
  supabase: any,
  organizationId: string,
  context: ReturnOperationalContext
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
    console.warn('[returns] Failed to fetch scoped cash session:', result.error.message);
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

async function insertInventoryMovementForReturn(
  supabase: any,
  organizationId: string,
  userId: string | null | undefined,
  returnId: string,
  productId: string,
  quantity: number,
) {
  const fullPayload = {
    product_id: productId,
    organization_id: organizationId,
    quantity,
    type: 'RETURN',
    movement_type: 'IN',
    reference_type: 'RETURN',
    reference_id: returnId,
    user_id: userId,
    created_at: new Date().toISOString(),
    notes: `Devolución #${getReturnDisplayNumber(returnId)}`,
  };

  const { error } = await supabase
    .from('inventory_movements')
    .insert(fullPayload);

  if (!error) {
    return;
  }

  if (!isMissingColumnError(error)) {
    console.warn('[returns] Failed to insert inventory movement:', error.message);
    return;
  }

  await supabase
    .from('inventory_movements')
    .insert({
      product_id: productId,
      quantity,
      movement_type: 'IN',
      reference_type: 'RETURN',
      reference_id: returnId,
      user_id: userId,
    });
}

async function insertCashMovementForReturn(
  supabase: any,
  organizationId: string,
  userId: string | null | undefined,
  returnId: string,
  amount: number,
  context: ReturnOperationalContext
) {
  if (!(amount > 0)) {
    return;
  }

  const openSession = await findOpenCashSession(supabase, organizationId, context);
  if (!openSession?.id) {
    return;
  }

  const basePayload = {
    session_id: openSession.id,
    organization_id: organizationId,
    type: 'RETURN',
    amount: -Math.abs(roundTo2(amount)),
    reason: `Devolución #${getReturnDisplayNumber(returnId)}`,
    reference_type: 'RETURN',
    reference_id: returnId,
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
    console.warn('[returns] Failed to insert scoped cash movement:', error.message);
    return;
  }

  await supabase
    .from('cash_movements')
    .insert(basePayload);
}

export async function fetchMappedReturnById(
  supabase: any,
  returnId: string,
  organizationId: string
) {
  const { data, error } = await supabase
    .from('returns')
    .select(`
      id,
      original_sale_id,
      customer_id,
      status,
      reason,
      refund_method,
      total_amount,
      notes,
      processed_at,
      created_at,
      updated_at,
      customer:customers(name, email, phone),
      items:return_items(
        id,
        product_id,
        quantity,
        unit_price,
        reason,
        original_sale_item_id,
        product:products(name, sku)
      )
    `)
    .eq('organization_id', organizationId)
    .eq('id', returnId)
    .maybeSingle();

  if (!error) {
    return data ? mapReturnRecord(data) : null;
  }

  if (!isReturnReadCompatibilityError(error)) {
    throw new Error(error.message);
  }

  const compatRows = await fetchReturnRowsCompat(supabase, {
    organizationId,
    filters: { returnId },
  });

  const compatRow = compatRows[0];
  if (!compatRow) {
    return null;
  }

  const [hydratedRow] = await hydrateReturnCustomers(supabase, [compatRow]);
  const items = await fetchReturnItemsCompat(supabase, returnId);

  return mapReturnRecord({
    ...hydratedRow,
    items,
  });
}

export function canTransitionReturnStatus(currentStatus: unknown, nextStatus: unknown): boolean {
  const current = normalizeReturnStatusToDb(currentStatus);
  const next = normalizeReturnStatusToDb(nextStatus);

  if (!current || !next) {
    return false;
  }

  return RETURN_STATUS_TRANSITIONS[current].includes(next);
}

export async function processReturnLocally(
  supabase: any,
  params: {
    returnId: string;
    organizationId: string;
    userId?: string | null;
    context: ReturnOperationalContext;
  }
) {
  type ProductStockRow = {
    id: string;
    name?: string | null;
    stock_quantity?: number | null;
    max_stock?: number | null;
  };

  const { returnId, organizationId, userId, context } = params;
  const now = new Date().toISOString();

  const { data: returnRecord, error: returnError } = await supabase
    .from('returns')
    .select(`
      id,
      original_sale_id,
      organization_id,
      status,
      refund_method,
      reason,
      total_amount,
      items:return_items(
        id,
        product_id,
        quantity,
        unit_price,
        reason,
        original_sale_item_id
      )
    `)
    .eq('organization_id', organizationId)
    .eq('id', returnId)
    .maybeSingle();

  if (returnError) {
    throw new Error(returnError.message);
  }

  if (!returnRecord) {
    return { status: 404, error: 'Return not found' };
  }

  if (normalizeReturnStatusToDb(returnRecord.status) !== 'APPROVED') {
    return { status: 400, error: 'Only approved returns can be processed' };
  }

  const items = Array.isArray(returnRecord.items)
    ? (returnRecord.items as ReturnItemRow[]).map(mapReturnItem)
    : [];
  if (!items.length) {
    return { status: 400, error: 'Return has no items to process' };
  }

  const saleValidation = await validateReturnAgainstOriginalSale(supabase, {
    organizationId,
    originalSaleId: String(returnRecord.original_sale_id || ''),
    items: items.map((item) => ({
      originalSaleItemId: String(item.originalSaleItemId || ''),
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      reason: item.reason || null,
    })),
    excludeReturnId: returnId,
  });

  if (!saleValidation.ok) {
    return { status: saleValidation.status, error: saleValidation.error };
  }

  const productTotals = new Map<string, { quantity: number; productName: string }>();
  for (const item of items) {
    if (!item.productId) {
      return { status: 400, error: 'Return contains an invalid product reference' };
    }

    const current = productTotals.get(item.productId);
    productTotals.set(item.productId, {
      quantity: (current?.quantity || 0) + item.quantity,
      productName: item.productName || current?.productName || 'este producto',
    });
  }

  const productIds = Array.from(productTotals.keys());
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, name, stock_quantity, max_stock')
    .in('id', productIds);

  if (productsError) {
    throw new Error(productsError.message);
  }

  const productsById = new Map<string, ProductStockRow>(
    ((products || []) as ProductStockRow[]).map((product) => [String(product.id), product])
  );

  for (const [productId, entry] of productTotals) {
    const product = productsById.get(productId);
    if (!product) {
      return { status: 404, error: `Producto ${productId} no encontrado` };
    }

    const item = { quantity: entry.quantity };
    const currentStock = safeNumber(product.stock_quantity);
    const maxStock = product.max_stock == null ? Number.POSITIVE_INFINITY : safeNumber(product.max_stock);
    const nextStock = currentStock + entry.quantity;

    if (nextStock > maxStock) {
      return {
        status: 400,
        error: `No se pueden devolver ${item.quantity} unidades de ${product.name || 'este producto'}. Excedería el stock máximo.`,
      };
    }
  }

  const rollbackStocks: Array<{ productId: string; previousStock: number }> = [];
  let claimedReturn = false;

  try {
    const { data: claimed, error: claimError } = await supabase
      .from('returns')
      .update({
        status: 'COMPLETED',
        processed_at: now,
        updated_at: now,
      })
      .eq('id', returnId)
      .eq('organization_id', organizationId)
      .eq('status', 'APPROVED')
      .select('id')
      .maybeSingle();

    if (claimError) {
      throw new Error(claimError.message);
    }

    if (!claimed?.id) {
      return { status: 409, error: 'Return already processed or no longer approved' };
    }

    claimedReturn = true;

    for (const [productId, entry] of productTotals) {
      const product = productsById.get(productId);
      const previousStock = safeNumber(product?.stock_quantity);
      const nextStock = previousStock + entry.quantity;

      const { error: updateError } = await supabase
        .from('products')
        .update({ stock_quantity: nextStock })
        .eq('id', productId)
        .eq('organization_id', organizationId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      rollbackStocks.push({ productId, previousStock });
    }
  } catch (error) {
    await Promise.all(
      rollbackStocks.map(({ productId, previousStock }) =>
        supabase
          .from('products')
          .update({ stock_quantity: previousStock })
          .eq('id', productId)
          .eq('organization_id', organizationId)
      )
    );

    if (claimedReturn) {
      await supabase
        .from('returns')
        .update({
          status: 'APPROVED',
          processed_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', returnId)
        .eq('organization_id', organizationId);
    }

    throw error;
  }

  const totalAmount = safeNumber(returnRecord.total_amount);

  await Promise.all(
    items.map((item: ReturnType<typeof mapReturnItem>) =>
      insertInventoryMovementForReturn(
        supabase,
        organizationId,
        userId,
        returnId,
        item.productId,
        item.quantity
      ).catch((error) => {
        console.warn('[returns] Inventory movement sync skipped:', error);
      })
    )
  );

  if (normalizeRefundMethodToDb(returnRecord.refund_method) === 'CASH') {
    await insertCashMovementForReturn(
      supabase,
      organizationId,
      userId,
      returnId,
      totalAmount,
      context
    ).catch((error) => {
      console.warn('[returns] Cash movement sync skipped:', error);
    });
  }

  const completeReturn = await fetchMappedReturnById(supabase, returnId, organizationId);
  return {
    status: 200,
    data: completeReturn,
  };
}

export function sanitizeReturnNotes(value: unknown): string | null {
  return clampText(value, 1000);
}
