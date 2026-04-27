import type { NextRequest } from 'next/server';
import { getValidatedOrganizationId } from '@/lib/organization';

export interface CustomerSummaryData {
  total: number;
  active: number;
  inactive: number;
  vip: number;
  wholesale: number;
  regular: number;
  newThisMonth: number;
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  highValue: number;
  frequent: number;
  growthRate: number;
  activeRate: number;
  generatedAt: string;
}

type CustomerSummaryRow = {
  customer_type: string | null;
  is_active: boolean | null;
  total_purchases: number | null;
  total_orders: number | null;
  created_at: string | null;
};

type PurchaseHistorySale = {
  id: string;
  total: number;
  created_at: string;
  status?: string | null;
  sale_items?: Array<{
    quantity: number;
    unit_price: number;
    products?: {
      id?: string | null;
      name?: string | null;
    } | null;
  }>;
};

export function getRequestedOrganizationId(request: NextRequest): string | null {
  const requested = request.headers.get('x-organization-id')?.trim();
  return requested || null;
}

export async function resolveCustomerOrganizationId(
  request: NextRequest,
  userRole?: string | null
): Promise<string | null> {
  const requestedOrgId = getRequestedOrganizationId(request);

  if (requestedOrgId && String(userRole || '').toUpperCase() === 'SUPER_ADMIN') {
    return requestedOrgId;
  }

  return getValidatedOrganizationId(request);
}

export function sanitizeNullableText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

export function generateCustomerCode(name: string): string {
  const prefix = 'CL';
  const nameCode = name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
  const timestamp = Date.now().toString().slice(-6);
  return `${prefix}${nameCode}${timestamp}`;
}

export function mapCustomerTypeToDb(uiType?: string | null): 'REGULAR' | 'VIP' | 'WHOLESALE' {
  const normalized = uiType?.toLowerCase();
  if (normalized === 'wholesale') return 'WHOLESALE';
  if (normalized === 'vip') return 'VIP';
  return 'REGULAR';
}

export function mapCustomerTypeToUI(dbType?: string | null): 'regular' | 'vip' | 'wholesale' {
  const normalized = dbType?.toUpperCase();
  if (normalized === 'WHOLESALE') return 'wholesale';
  if (normalized === 'VIP') return 'vip';
  return 'regular';
}

export function determineCustomerSegment(
  totalOrders: number,
  totalSpent: number
): 'new' | 'regular' | 'frequent' | 'vip' | 'at_risk' | 'dormant' {
  if (totalOrders <= 2) return 'new';
  if (totalOrders >= 25 || totalSpent > 50000) return 'vip';
  if (totalOrders >= 11) return 'frequent';
  return 'regular';
}

export function calculateCustomerRiskScore(
  lastPurchase: string | null | undefined,
  totalOrders: number
): number {
  let riskScore = 0;

  const daysSinceLastPurchase = lastPurchase
    ? Math.floor((Date.now() - new Date(lastPurchase).getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  if (daysSinceLastPurchase > 180) riskScore += 50;
  else if (daysSinceLastPurchase > 90) riskScore += 30;
  else if (daysSinceLastPurchase > 30) riskScore += 15;

  if (totalOrders < 3) riskScore += 20;
  else if (totalOrders < 10) riskScore += 10;

  return Math.min(riskScore, 100);
}

export function calculateCustomerLifetimeValue(
  totalSpent: number,
  totalOrders: number,
  createdAt: string | null | undefined
): number {
  if (totalOrders === 0 || !createdAt) {
    return 0;
  }

  const avgOrderValue = totalSpent / totalOrders;
  const daysSinceFirstPurchase = Math.floor(
    (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  const purchaseFrequency = daysSinceFirstPurchase > 0 ? totalOrders / (daysSinceFirstPurchase / 30) : 0;

  const profitMargin = 0.3;
  const expectedLifetime = 24;

  return Math.round(avgOrderValue * purchaseFrequency * profitMargin * expectedLifetime * 100) / 100;
}

function transformPurchaseHistory(purchaseHistory: PurchaseHistorySale[]) {
  return purchaseHistory.map((sale) => ({
    orderNumber: `#${sale.id.slice(0, 8).toUpperCase()}`,
    date: sale.created_at,
    total: sale.total,
    items: sale.sale_items?.reduce((sum: number, item) => sum + item.quantity, 0) || 0,
    status: sale.status || 'completed',
    products: sale.sale_items?.map((item) => ({
      id: item.products?.id || '',
      name: item.products?.name || 'Product',
      quantity: item.quantity,
      price: item.unit_price,
    })) || [],
  }));
}

export function transformCustomerRecord(
  customer: any,
  options: { purchaseHistory?: PurchaseHistorySale[] } = {}
) {
  const totalSpent = Number(customer.total_purchases) || 0;
  const totalOrders = Number(customer.total_orders) || 0;

  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    address: customer.address,
    tax_id: customer.tax_id,
    ruc: customer.ruc,
    customer_code: customer.customer_code,
    customer_type: customer.customer_type,
    status: customer.status || (customer.is_active === false ? 'inactive' : 'active'),
    birth_date: customer.birth_date,
    notes: customer.notes,
    is_active: customer.is_active,
    customerCode: customer.customer_code,
    customerType: mapCustomerTypeToUI(customer.customer_type),
    totalSpent,
    totalOrders,
    lastPurchase: customer.last_purchase,
    birthDate: customer.birth_date,
    created_at: customer.created_at,
    updated_at: customer.updated_at,
    segment: determineCustomerSegment(totalOrders, totalSpent),
    riskScore: calculateCustomerRiskScore(customer.last_purchase, totalOrders),
    lifetimeValue: calculateCustomerLifetimeValue(totalSpent, totalOrders, customer.created_at),
    ...(options.purchaseHistory ? { purchaseHistory: transformPurchaseHistory(options.purchaseHistory) } : {}),
  };
}

function calculateGrowthRate(currentPeriodCount: number, previousPeriodCount: number): number {
  if (previousPeriodCount === 0) {
    return currentPeriodCount > 0 ? 100 : 0;
  }

  return Math.round((((currentPeriodCount - previousPeriodCount) / previousPeriodCount) * 100) * 100) / 100;
}

export function buildCustomerSummary(
  rows: CustomerSummaryRow[],
  now: Date = new Date()
): CustomerSummaryData {
  const nowMs = now.getTime();
  const thirtyDaysAgoMs = nowMs - 30 * 24 * 60 * 60 * 1000;
  const sixtyDaysAgoMs = nowMs - 60 * 24 * 60 * 60 * 1000;

  let active = 0;
  let inactive = 0;
  let vip = 0;
  let wholesale = 0;
  let regular = 0;
  let newThisMonth = 0;
  let previousPeriod = 0;
  let totalRevenue = 0;
  let totalOrders = 0;
  let highValue = 0;
  let frequent = 0;

  for (const row of rows) {
    if (row.is_active) active += 1;
    else inactive += 1;

    const normalizedType = String(row.customer_type || '').toUpperCase();
    if (normalizedType === 'VIP') vip += 1;
    else if (normalizedType === 'WHOLESALE') wholesale += 1;
    else regular += 1;

    const createdAtMs = row.created_at ? new Date(row.created_at).getTime() : NaN;
    if (Number.isFinite(createdAtMs)) {
      if (createdAtMs >= thirtyDaysAgoMs) newThisMonth += 1;
      else if (createdAtMs >= sixtyDaysAgoMs) previousPeriod += 1;
    }

    const purchases = Number(row.total_purchases) || 0;
    const orders = Number(row.total_orders) || 0;

    totalRevenue += purchases;
    totalOrders += orders;
    if (purchases > 10000) highValue += 1;
    if (orders > 10) frequent += 1;
  }

  const total = rows.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  return {
    total,
    active,
    inactive,
    vip,
    wholesale,
    regular,
    newThisMonth,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalOrders,
    avgOrderValue: Math.round(avgOrderValue * 100) / 100,
    highValue,
    frequent,
    growthRate: calculateGrowthRate(newThisMonth, previousPeriod),
    activeRate: total > 0 ? Math.round((active / total) * 100 * 100) / 100 : 0,
    generatedAt: now.toISOString(),
  };
}
