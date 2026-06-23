import { NextRequest, NextResponse } from "next/server";
import { getValidatedOrganizationId } from "@/lib/organization";
import { fetchDashboardOverview } from "@/lib/dashboard/dashboard-data";
import { rateLimit, RATE_LIMITS } from "@/lib/middleware/rate-limit";

const rateLimiter = rateLimit(RATE_LIMITS.READ);

export async function GET(request: NextRequest) {
  const rateLimitResponse = rateLimiter(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const orgId = await getValidatedOrganizationId(request);
    const data = await fetchDashboardOverview(orgId);

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    console.error("Main dashboard summary error:", error);
    return NextResponse.json({
      todaySales: 0,
      todaySalesCount: 0,
      monthSales: 0,
      averageTicket: 0,
      totalCustomers: 0,
      totalProducts: 0,
      lowStockCount: 0,
      activeOrders: 0,
      webOrders: {
        pending: 0,
        confirmed: 0,
        preparing: 0,
        shipped: 0,
        delivered: 0,
        todayTotal: 0,
        todayRevenue: 0,
      },
      recentSales: [],
      lastUpdated: new Date().toISOString(),
      isQuickMode: true,
    });
  }
}
