import { createAdminClient } from '@/lib/supabase/server';
import { getValidatedOrganizationId } from '@/lib/organization';
import {
  DEFAULT_STOCK_ALERT_CONFIG,
  formatCoverageLabel,
  getEffectiveMinThreshold,
  getSeverityForStock,
  getWarningBoundary,
  normalizeStockAlertConfig,
  severityWeight,
  type StockAlertConfig,
  type StockAlertItem,
  type StockAlertTrendItem,
  type StockAlertsResponse,
  type StockAlertsStats,
} from '@/lib/stock-alerts';
import { NextRequest } from 'next/server';

type AdminClient = Awaited<ReturnType<typeof createAdminClient>>;

type ProductRow = {
  id: string;
  name: string;
  sku: string | null;
  stock_quantity: number | null;
  min_stock: number | null;
  max_stock: number | null;
  sale_price: number | null;
  cost_price: number | null;
  category_id: string | null;
  supplier_id: string | null;
  updated_at: string | null;
  categories?: { id: string; name: string } | null;
  suppliers?: { id: string; name: string } | null;
};

type InventoryMovementRow = {
  product_id: string;
  type: string | null;
  quantity: number | null;
  created_at: string | null;
};

type BusinessConfigRow = {
  value?: Record<string, unknown> | null;
};

export interface StockAlertsQueryInput {
  search?: string | null;
  severity?: string | null;
  category?: string | null;
  supplier?: string | null;
  threshold?: number | null;
  limit?: number | null;
}

const PRODUCT_SELECT = `
  id,
  name,
  sku,
  stock_quantity,
  min_stock,
  max_stock,
  sale_price,
  cost_price,
  category_id,
  supplier_id,
  updated_at,
  categories!products_category_id_fkey (
    id,
    name
  ),
  suppliers!products_supplier_id_fkey (
    id,
    name
  )
`;

function safeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function getStockAlertsContext(request: NextRequest) {
  const organizationId = await getValidatedOrganizationId(request);

  if (!organizationId) {
    return { error: 'Organization required', organizationId: null, adminClient: null } as const;
  }

  const adminClient = await createAdminClient();

  return { organizationId, adminClient } as const;
}

async function loadBusinessConfig(
  adminClient: AdminClient,
  organizationId: string
): Promise<Record<string, unknown>> {
  const { data } = await adminClient
    .from('settings')
    .select('value')
    .eq('key', 'business_config')
    .eq('organization_id', organizationId)
    .maybeSingle();

  const row = data as BusinessConfigRow | null;
  return row?.value && isRecord(row.value) ? row.value : {};
}

export async function loadStockAlertConfig(
  adminClient: AdminClient,
  organizationId: string
): Promise<StockAlertConfig> {
  const businessConfig = await loadBusinessConfig(adminClient, organizationId);
  const storeSettings = isRecord(businessConfig.storeSettings) ? businessConfig.storeSettings : {};
  const fallbackThreshold = Math.max(
    0,
    Math.round(safeNumber(storeSettings.lowStockThreshold, DEFAULT_STOCK_ALERT_CONFIG.globalMinThreshold))
  );

  const { data } = await adminClient
    .from('settings')
    .select('value')
    .eq('key', 'stock_alerts_config')
    .eq('organization_id', organizationId)
    .maybeSingle();

  const row = data as BusinessConfigRow | null;
  return normalizeStockAlertConfig(row?.value, fallbackThreshold);
}

export async function persistStockAlertConfig(
  adminClient: AdminClient,
  organizationId: string,
  config: StockAlertConfig
) {
  const now = new Date().toISOString();

  const normalized = normalizeStockAlertConfig(config, config.globalMinThreshold);

  const { error } = await adminClient
    .from('settings')
    .upsert(
      {
        key: 'stock_alerts_config',
        organization_id: organizationId,
        value: normalized,
        updated_at: now,
      },
      { onConflict: 'organization_id,key' }
    );

  if (error) {
    throw error;
  }

  const currentBusinessConfig = await loadBusinessConfig(adminClient, organizationId);
  const currentStoreSettings = isRecord(currentBusinessConfig.storeSettings)
    ? currentBusinessConfig.storeSettings
    : {};

  const nextBusinessConfig = {
    ...currentBusinessConfig,
    storeSettings: {
      ...currentStoreSettings,
      lowStockThreshold: normalized.globalMinThreshold,
    },
    updatedAt: now,
  };

  await adminClient
    .from('settings')
    .upsert(
      {
        key: 'business_config',
        organization_id: organizationId,
        value: nextBusinessConfig,
        updated_at: now,
      },
      { onConflict: 'organization_id,key' }
    );

  await adminClient
    .from('business_config')
    .upsert(
      {
        organization_id: organizationId,
        low_stock_threshold: normalized.globalMinThreshold,
        updated_at: now,
      },
      { onConflict: 'organization_id' }
    );

  return normalized;
}

async function fetchProducts(adminClient: AdminClient, organizationId: string) {
  let { data, error } = await adminClient
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('stock_quantity', { ascending: true });

  if (!error) {
    return (data || []) as ProductRow[];
  }

  const fallback = await adminClient
    .from('products')
    .select('id,name,sku,stock_quantity,min_stock,max_stock,sale_price,cost_price,category_id,supplier_id,updated_at')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('stock_quantity', { ascending: true });

  if (fallback.error) {
    throw fallback.error;
  }

  const rows = (fallback.data || []) as ProductRow[];
  const categoryIds = Array.from(new Set(rows.map((row) => row.category_id).filter(Boolean))) as string[];
  const supplierIds = Array.from(new Set(rows.map((row) => row.supplier_id).filter(Boolean))) as string[];

  let categoryMap = new Map<string, { id: string; name: string }>();
  let supplierMap = new Map<string, { id: string; name: string }>();

  if (categoryIds.length > 0) {
    const { data: categories } = await adminClient
      .from('categories')
      .select('id,name')
      .eq('organization_id', organizationId)
      .in('id', categoryIds);

    categoryMap = new Map((categories || []).map((item: any) => [item.id, item]));
  }

  if (supplierIds.length > 0) {
    const { data: suppliers } = await adminClient
      .from('suppliers')
      .select('id,name')
      .eq('organization_id', organizationId)
      .in('id', supplierIds);

    supplierMap = new Map((suppliers || []).map((item: any) => [item.id, item]));
  }

  return rows.map((row) => ({
    ...row,
    categories: row.category_id ? categoryMap.get(row.category_id) || null : null,
    suppliers: row.supplier_id ? supplierMap.get(row.supplier_id) || null : null,
  }));
}

async function fetchMovementSummary(
  adminClient: AdminClient,
  organizationId: string,
  productIds: string[]
) {
  if (productIds.length === 0) {
    return new Map<string, {
      outgoingUnits: number;
      lastMovementAt: string | null;
      lastSoldAt: string | null;
      lastMovementType: string | null;
    }>();
  }

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await adminClient
    .from('inventory_movements')
    .select('product_id,type,quantity,created_at')
    .eq('organization_id', organizationId)
    .in('product_id', productIds)
    .gte('created_at', since)
    .order('created_at', { ascending: false });

  if (error) {
    return new Map();
  }

  const summary = new Map<
    string,
    {
      outgoingUnits: number;
      lastMovementAt: string | null;
      lastSoldAt: string | null;
      lastMovementType: string | null;
    }
  >();

  for (const movement of (data || []) as InventoryMovementRow[]) {
    const current = summary.get(movement.product_id) || {
      outgoingUnits: 0,
      lastMovementAt: null,
      lastSoldAt: null,
      lastMovementType: null,
    };

    if (!current.lastMovementAt && movement.created_at) {
      current.lastMovementAt = movement.created_at;
      current.lastMovementType = movement.type || null;
    }

    const type = String(movement.type || '').toUpperCase();
    const quantity = Math.max(0, Math.round(safeNumber(movement.quantity, 0)));
    const isOutgoing = type === 'SALE' || type === 'OUT';

    if (isOutgoing) {
      current.outgoingUnits += quantity;
      if (!current.lastSoldAt && movement.created_at) {
        current.lastSoldAt = movement.created_at;
      }
    }

    summary.set(movement.product_id, current);
  }

  return summary;
}

function filterAlerts(
  alerts: StockAlertItem[],
  input: StockAlertsQueryInput
) {
  const search = String(input.search || '').trim().toLowerCase();
  const severity = String(input.severity || '').trim().toLowerCase();
  const category = String(input.category || '').trim().toLowerCase();
  const supplier = String(input.supplier || '').trim().toLowerCase();

  return alerts.filter((alert) => {
    if (search) {
      const haystack = [
        alert.productName,
        alert.sku,
        alert.category,
        alert.supplier || '',
      ]
        .join(' ')
        .toLowerCase();

      if (!haystack.includes(search)) {
        return false;
      }
    }

    if (severity && severity !== 'all' && alert.severity !== severity) {
      return false;
    }

    if (category && category !== 'all') {
      const categoryMatch =
        alert.categoryId?.toLowerCase() === category || alert.category.toLowerCase() === category;

      if (!categoryMatch) {
        return false;
      }
    }

    if (supplier && supplier !== 'all') {
      const supplierMatch =
        alert.supplierId?.toLowerCase() === supplier || (alert.supplier || '').toLowerCase() === supplier;

      if (!supplierMatch) {
        return false;
      }
    }

    return true;
  });
}

function productMatchesScope(product: ProductRow, input: StockAlertsQueryInput) {
  const search = String(input.search || '').trim().toLowerCase();
  const category = String(input.category || '').trim().toLowerCase();
  const supplier = String(input.supplier || '').trim().toLowerCase();

  if (search) {
    const haystack = [
      product.name,
      product.sku || '',
      product.categories?.name || '',
      product.suppliers?.name || '',
    ]
      .join(' ')
      .toLowerCase();

    if (!haystack.includes(search)) {
      return false;
    }
  }

  if (category && category !== 'all') {
    const categoryMatch =
      product.category_id?.toLowerCase() === category ||
      (product.categories?.name || '').toLowerCase() === category;

    if (!categoryMatch) {
      return false;
    }
  }

  if (supplier && supplier !== 'all') {
    const supplierMatch =
      product.supplier_id?.toLowerCase() === supplier ||
      (product.suppliers?.name || '').toLowerCase() === supplier;

    if (!supplierMatch) {
      return false;
    }
  }

  return true;
}

function buildStats(alerts: StockAlertItem[], totalProducts: number): StockAlertsStats {
  const criticalAlerts = alerts.filter((item) => item.severity === 'critical').length;
  const lowStockAlerts = alerts.filter((item) => item.severity === 'low').length;
  const warningAlerts = alerts.filter((item) => item.severity === 'warning').length;
  const outOfStockAlerts = alerts.filter((item) => item.currentStock === 0).length;
  const estimatedReplenishmentCost = alerts.reduce((sum, item) => sum + item.replenishmentCost, 0);
  const days = alerts
    .map((item) => item.estimatedDaysLeft)
    .filter((value): value is number => value !== null && Number.isFinite(value));

  return {
    criticalAlerts,
    lowStockAlerts,
    warningAlerts,
    outOfStockAlerts,
    totalProducts,
    healthyProducts: Math.max(0, totalProducts - alerts.length),
    estimatedReplenishmentCost,
    avgDaysToStockout:
      days.length > 0
        ? Number((days.reduce((sum, value) => sum + value, 0) / days.length).toFixed(1))
        : null,
  };
}

function buildTrendItems(alerts: StockAlertItem[]) {
  return alerts
    .slice()
    .sort((a, b) => {
      const severityDelta = severityWeight(a.severity) - severityWeight(b.severity);
      if (severityDelta !== 0) return severityDelta;

      const aDays = a.estimatedDaysLeft ?? Number.POSITIVE_INFINITY;
      const bDays = b.estimatedDaysLeft ?? Number.POSITIVE_INFINITY;
      if (aDays !== bDays) return aDays - bDays;

      return b.stockGap - a.stockGap;
    })
    .slice(0, 6)
    .map<StockAlertTrendItem>((alert) => ({
      productId: alert.productId,
      productName: alert.productName,
      severity: alert.severity,
      currentStock: alert.currentStock,
      minThreshold: alert.minThreshold,
      stockGap: alert.stockGap,
      estimatedDaysLeft: alert.estimatedDaysLeft,
      dailySalesVelocity: alert.dailySalesVelocity,
      weeklyUnitsSold: Number((alert.dailySalesVelocity * 7).toFixed(1)),
      trend:
        alert.dailySalesVelocity > 0
          ? 'down'
          : alert.stockGap === 0
            ? 'stable'
            : 'up',
    }));
}

function uniqueOptions(items: Array<{ value: string | null; label: string | null }>) {
  return Array.from(
    items.reduce((map, item) => {
      const value = String(item.value || '').trim();
      const label = String(item.label || '').trim();

      if (!value || !label) {
        return map;
      }

      map.set(value, { value, label });
      return map;
    }, new Map<string, { value: string; label: string }>())
      .values()
  ).sort((a, b) => a.label.localeCompare(b.label));
}

export async function getStockAlertsData(
  adminClient: AdminClient,
  organizationId: string,
  input: StockAlertsQueryInput = {}
): Promise<StockAlertsResponse> {
  const [config, products] = await Promise.all([
    loadStockAlertConfig(adminClient, organizationId),
    fetchProducts(adminClient, organizationId),
  ]);

  const thresholdOverride =
    input.threshold !== null && input.threshold !== undefined && Number.isFinite(Number(input.threshold))
      ? Math.max(0, Math.round(Number(input.threshold)))
      : null;

  const effectiveConfig = thresholdOverride !== null
    ? {
        ...config,
        globalMinThreshold: thresholdOverride,
      }
    : config;

  const scopedProducts = products.filter((product) => productMatchesScope(product, input));

  const candidateProducts = scopedProducts
    .map((product) => {
      const currentStock = Math.max(0, Math.round(safeNumber(product.stock_quantity, 0)));
      const minThreshold = getEffectiveMinThreshold(product.min_stock, effectiveConfig);
      const severity = getSeverityForStock(currentStock, minThreshold, effectiveConfig);

      if (!severity) {
        return null;
      }

      return {
        product,
        currentStock,
        minThreshold,
        severity,
      };
    })
    .filter(
      (
        item
      ): item is {
        product: ProductRow;
        currentStock: number;
        minThreshold: number;
        severity: NonNullable<ReturnType<typeof getSeverityForStock>>;
      } => item !== null
    );

  const movementSummary = await fetchMovementSummary(
    adminClient,
    organizationId,
    candidateProducts.map((item) => item.product.id)
  );

  const derivedAlerts = candidateProducts
    .map<StockAlertItem>(({ product, currentStock, minThreshold, severity }) => {
      const maxThreshold = Math.max(
        minThreshold,
        Math.round(
          safeNumber(
            product.max_stock,
            Math.max(minThreshold, effectiveConfig.globalMaxThreshold)
          )
        )
      );
      const warningBoundary = Math.min(maxThreshold, getWarningBoundary(minThreshold, effectiveConfig));
      const summary = movementSummary.get(product.id);
      const outgoingUnits = safeNumber(summary?.outgoingUnits, 0);
      const dailySalesVelocity = outgoingUnits > 0 ? Number((outgoingUnits / 30).toFixed(2)) : 0;
      const estimatedDaysLeft =
        currentStock > 0 && dailySalesVelocity > 0
          ? Number((currentStock / dailySalesVelocity).toFixed(1))
          : null;
      const stockGap = Math.max(0, minThreshold - currentStock);
      const recommendedRestock = Math.max(0, warningBoundary - currentStock);
      const costPrice = safeNumber(product.cost_price, 0);

      return {
        id: product.id,
        productId: product.id,
        productName: product.name,
        sku: String(product.sku || 'Sin SKU'),
        currentStock,
        minThreshold,
        maxThreshold,
        severity,
        category: product.categories?.name || 'Sin categoria',
        categoryId: product.category_id || null,
        supplier: product.suppliers?.name || null,
        supplierId: product.supplier_id || null,
        unitPrice: safeNumber(product.sale_price, 0),
        costPrice,
        estimatedDaysLeft,
        dailySalesVelocity,
        stockGap,
        recommendedRestock,
        replenishmentCost: Number((recommendedRestock * costPrice).toFixed(2)),
        lastMovementAt: summary?.lastMovementAt || product.updated_at || null,
        lastSoldAt: summary?.lastSoldAt || null,
        coverageLabel: formatCoverageLabel(estimatedDaysLeft),
      };
    });

  const categories = uniqueOptions(
    derivedAlerts.map((alert) => ({
      value: alert.categoryId,
      label: alert.category,
    }))
  );
  const suppliers = uniqueOptions(
    derivedAlerts.map((alert) => ({
      value: alert.supplierId,
      label: alert.supplier,
    }))
  );

  const filteredAlerts = filterAlerts(derivedAlerts, input)
    .sort((a, b) => {
      const severityDelta = severityWeight(a.severity) - severityWeight(b.severity);
      if (severityDelta !== 0) return severityDelta;

      const aDays = a.estimatedDaysLeft ?? Number.POSITIVE_INFINITY;
      const bDays = b.estimatedDaysLeft ?? Number.POSITIVE_INFINITY;
      if (aDays !== bDays) return aDays - bDays;

      if (a.currentStock !== b.currentStock) return a.currentStock - b.currentStock;
      return a.productName.localeCompare(b.productName);
    })
    .slice(0, Math.max(1, Math.min(500, Math.round(safeNumber(input.limit, 250)))));

  return {
    success: true,
    data: filteredAlerts,
    alerts: filteredAlerts,
    stats: buildStats(filteredAlerts, scopedProducts.length),
    trends: buildTrendItems(filteredAlerts),
    filters: {
      categories,
      suppliers,
    },
    lastUpdated: new Date().toISOString(),
  };
}
