export interface DashboardRecentSale {
  id: string;
  customer_name: string;
  total: number;
  created_at: string;
  payment_method: string;
}

export interface DashboardOverviewData {
  todaySales: number;
  monthSales: number;
  totalCustomers: number;
  totalProducts: number;
  activeOrders: number;
  lowStockCount: number;
  todaySalesCount: number;
  averageTicket: number;
  webOrders: {
    pending: number;
    confirmed: number;
    preparing: number;
    shipped: number;
    delivered: number;
    todayTotal: number;
    todayRevenue: number;
  };
  recentSales: DashboardRecentSale[];
  lastUpdated: string;
  isQuickMode: boolean;
}

export interface DashboardSummaryData {
  daily: Array<{
    day: string;
    orders: number;
    revenue: number;
  }>;
  categories: Array<{
    name: string;
    value: number;
    items: number;
  }>;
  topProducts: Array<{
    id: string;
    name: string;
    category: string;
    sales: number;
    revenue: number;
    stock: number;
  }>;
  totals: {
    orders: number;
    revenue: number;
    previousOrders: number;
    previousRevenue: number;
  };
  lastUpdated: string;
}

export type DashboardTimeRange = '24h' | '7d' | '30d' | '90d' | '1y';
