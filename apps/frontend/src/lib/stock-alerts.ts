export type StockAlertSeverity = 'critical' | 'low' | 'warning';
export type StockAlertFrequency = 'hourly' | 'daily' | 'weekly';

export interface StockAlertConfig {
  globalMinThreshold: number;
  globalMaxThreshold: number;
  criticalThreshold: number;
  warningThreshold: number;
  enableEmailAlerts: boolean;
  enablePushNotifications: boolean;
  autoCreateOrders: boolean;
  checkFrequency: StockAlertFrequency;
}

export interface StockAlertItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  minThreshold: number;
  maxThreshold: number | null;
  severity: StockAlertSeverity;
  category: string;
  categoryId: string | null;
  supplier: string | null;
  supplierId: string | null;
  unitPrice: number;
  costPrice: number;
  estimatedDaysLeft: number | null;
  dailySalesVelocity: number;
  stockGap: number;
  recommendedRestock: number;
  replenishmentCost: number;
  lastMovementAt: string | null;
  lastSoldAt: string | null;
  coverageLabel: string;
}

export interface StockAlertsStats {
  criticalAlerts: number;
  lowStockAlerts: number;
  warningAlerts: number;
  outOfStockAlerts: number;
  totalProducts: number;
  healthyProducts: number;
  estimatedReplenishmentCost: number;
  avgDaysToStockout: number | null;
}

export interface StockAlertTrendItem {
  productId: string;
  productName: string;
  severity: StockAlertSeverity;
  currentStock: number;
  minThreshold: number;
  stockGap: number;
  estimatedDaysLeft: number | null;
  dailySalesVelocity: number;
  weeklyUnitsSold: number;
  trend: 'up' | 'down' | 'stable';
}

export interface StockAlertFilterOption {
  value: string;
  label: string;
}

export interface StockAlertsResponse {
  success: true;
  data: StockAlertItem[];
  alerts: StockAlertItem[];
  stats: StockAlertsStats;
  trends: StockAlertTrendItem[];
  filters: {
    categories: StockAlertFilterOption[];
    suppliers: StockAlertFilterOption[];
  };
  lastUpdated: string;
}

export const DEFAULT_STOCK_ALERT_CONFIG: StockAlertConfig = {
  globalMinThreshold: 10,
  globalMaxThreshold: 80,
  criticalThreshold: 5,
  warningThreshold: 15,
  enableEmailAlerts: true,
  enablePushNotifications: true,
  autoCreateOrders: false,
  checkFrequency: 'daily',
};

function safeNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeStockAlertConfig(
  value: unknown,
  fallbackThreshold = DEFAULT_STOCK_ALERT_CONFIG.globalMinThreshold
): StockAlertConfig {
  const source =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Partial<StockAlertConfig>)
      : {};

  const globalMinThreshold = Math.max(
    0,
    Math.round(safeNumber(source.globalMinThreshold, fallbackThreshold))
  );
  const globalMaxThreshold = Math.max(
    globalMinThreshold,
    Math.round(safeNumber(source.globalMaxThreshold, Math.max(globalMinThreshold * 4, 80)))
  );
  const criticalThreshold = Math.max(
    0,
    Math.round(safeNumber(source.criticalThreshold, Math.max(1, Math.floor(globalMinThreshold / 2))))
  );
  const warningThreshold = Math.max(
    0,
    Math.round(safeNumber(source.warningThreshold, Math.max(globalMinThreshold, 15)))
  );
  const checkFrequency: StockAlertFrequency =
    source.checkFrequency === 'hourly' ||
    source.checkFrequency === 'weekly' ||
    source.checkFrequency === 'daily'
      ? source.checkFrequency
      : DEFAULT_STOCK_ALERT_CONFIG.checkFrequency;

  return {
    globalMinThreshold,
    globalMaxThreshold,
    criticalThreshold,
    warningThreshold,
    enableEmailAlerts:
      typeof source.enableEmailAlerts === 'boolean'
        ? source.enableEmailAlerts
        : DEFAULT_STOCK_ALERT_CONFIG.enableEmailAlerts,
    enablePushNotifications:
      typeof source.enablePushNotifications === 'boolean'
        ? source.enablePushNotifications
        : DEFAULT_STOCK_ALERT_CONFIG.enablePushNotifications,
    autoCreateOrders:
      typeof source.autoCreateOrders === 'boolean'
        ? source.autoCreateOrders
        : DEFAULT_STOCK_ALERT_CONFIG.autoCreateOrders,
    checkFrequency,
  };
}

export function getEffectiveMinThreshold(
  productMinThreshold: number | null | undefined,
  config: StockAlertConfig
) {
  const threshold = Math.round(safeNumber(productMinThreshold, config.globalMinThreshold));
  return Math.max(0, threshold || config.globalMinThreshold);
}

export function getCriticalBoundary(minThreshold: number, config: StockAlertConfig) {
  if (minThreshold <= 0) {
    return Math.max(0, config.criticalThreshold);
  }

  return Math.max(1, Math.min(minThreshold, config.criticalThreshold));
}

export function getWarningBoundary(minThreshold: number, config: StockAlertConfig) {
  return Math.max(minThreshold, minThreshold + Math.max(0, config.warningThreshold));
}

export function getSeverityForStock(
  currentStock: number,
  minThreshold: number,
  config: StockAlertConfig
): StockAlertSeverity | null {
  if (currentStock < 0) {
    return 'critical';
  }

  const criticalBoundary = getCriticalBoundary(minThreshold, config);
  const warningBoundary = getWarningBoundary(minThreshold, config);

  if (currentStock === 0 || currentStock <= criticalBoundary) {
    return 'critical';
  }

  if (currentStock <= minThreshold) {
    return 'low';
  }

  if (currentStock <= warningBoundary) {
    return 'warning';
  }

  return null;
}

export function formatCoverageLabel(daysLeft: number | null) {
  if (daysLeft === null || !Number.isFinite(daysLeft)) {
    return 'Sin velocidad';
  }

  if (daysLeft < 1) {
    return 'Menos de 1 dia';
  }

  if (daysLeft <= 7) {
    return `${daysLeft.toFixed(1)} dias`;
  }

  return `${Math.round(daysLeft)} dias`;
}

export function severityWeight(severity: StockAlertSeverity) {
  switch (severity) {
    case 'critical':
      return 0;
    case 'low':
      return 1;
    case 'warning':
      return 2;
    default:
      return 3;
  }
}
