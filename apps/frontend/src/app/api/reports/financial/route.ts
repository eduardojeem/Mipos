import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const branchId = searchParams.get('branchId');
    const posId = searchParams.get('posId');

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Start date and end date are required' }, { status: 400 });
    }

    const orgId = (request.headers.get('x-organization-id') || '').trim();
    if (!orgId) {
      return NextResponse.json({ error: 'Organization header missing' }, { status: 400 });
    }

    const supabase = await createClient();

    // Get sales (revenue) for the period
    let salesQuery = supabase
      .from('sales')
      .select('id, total_amount, created_at, status')
      .eq('organization_id', orgId) // Filter by Organization
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .eq('status', 'completed');

    if (branchId) salesQuery = salesQuery.eq('branch_id', branchId);
    if (posId) salesQuery = salesQuery.eq('pos_id', posId);

    const { data: salesData, error: salesError } = await salesQuery;

    if (salesError) throw salesError;

    // Calculate total revenue
    const totalRevenue = (salesData || []).reduce((sum: number, sale: any) => sum + (sale.total_amount || 0), 0);

    // Get expenses for the period (if expenses table exists)
    let expensesQuery = supabase
      .from('expenses')
      .select('amount, category, created_at')
      .eq('organization_id', orgId) // Filter by Organization
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (branchId) expensesQuery = expensesQuery.eq('branch_id', branchId);

    const { data: expensesData } = await expensesQuery; // Don't throw error if table doesn't exist

    // Calculate total expenses
    const totalExpenses = (expensesData || []).reduce((sum: number, expense: any) => sum + (expense.amount || 0), 0);

    // Calculate financial metrics
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Revenue by month
    const revenueByMonthMap = new Map<string, { revenue: number; expenses: number }>();

    // Process sales by month
    (salesData || []).forEach((sale: any) => {
      const month = new Date(sale.created_at).toISOString().slice(0, 7); // YYYY-MM format
      const existing = revenueByMonthMap.get(month) || { revenue: 0, expenses: 0 };
      existing.revenue += sale.total_amount || 0;
      revenueByMonthMap.set(month, existing);
    });

    // Process expenses by month
    (expensesData || []).forEach((expense: any) => {
      const month = new Date(expense.created_at).toISOString().slice(0, 7);
      const existing = revenueByMonthMap.get(month) || { revenue: 0, expenses: 0 };
      existing.expenses += expense.amount || 0;
      revenueByMonthMap.set(month, existing);
    });

    const revenueByMonth = Array.from(revenueByMonthMap.entries())
      .map(([month, data]) => ({
        month: new Date(month + '-01').toLocaleDateString('es-ES', { year: 'numeric', month: 'short' }),
        revenue: data.revenue,
        expenses: data.expenses,
        profit: data.revenue - data.expenses
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Expense breakdown by category
    const expensesByCategory = new Map<string, number>();
    (expensesData || []).forEach((expense: any) => {
      const category = expense.category || 'Sin categoría';
      expensesByCategory.set(category, (expensesByCategory.get(category) || 0) + (expense.amount || 0));
    });

    const expenseBreakdown = Array.from(expensesByCategory.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);

    // Calculate previous period for trends
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    const periodDays = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (24 * 60 * 60 * 1000));
    const prevEnd = new Date(startDateObj.getTime());
    const prevStart = new Date(prevEnd.getTime() - periodDays * 24 * 60 * 60 * 1000);

    // Previous period sales
    let prevSalesQuery = supabase
      .from('sales')
      .select('total_amount')
      .eq('organization_id', orgId) // Filter by Organization
      .gte('created_at', prevStart.toISOString().split('T')[0])
      .lte('created_at', prevEnd.toISOString().split('T')[0])
      .eq('status', 'completed');

    if (branchId) prevSalesQuery = prevSalesQuery.eq('branch_id', branchId);
    if (posId) prevSalesQuery = prevSalesQuery.eq('pos_id', posId);

    const { data: prevSalesData } = await prevSalesQuery;

    // Previous period expenses
    let prevExpensesQuery = supabase
      .from('expenses')
      .select('amount')
      .eq('organization_id', orgId) // Filter by Organization
      .gte('created_at', prevStart.toISOString().split('T')[0])
      .lte('created_at', prevEnd.toISOString().split('T')[0]);

    if (branchId) prevExpensesQuery = prevExpensesQuery.eq('branch_id', branchId);

    const { data: prevExpensesData } = await prevExpensesQuery;

    const prevRevenue = (prevSalesData || []).reduce((sum: number, sale: any) => sum + (sale.total_amount || 0), 0);
    const prevExpenses = (prevExpensesData || []).reduce((sum: number, expense: any) => sum + (expense.amount || 0), 0);
    const prevProfit = prevRevenue - prevExpenses;
    const prevMargin = prevRevenue > 0 ? (prevProfit / prevRevenue) * 100 : 0;

    const calculatePercentage = (current: number, previous: number) => 
      previous > 0 ? ((current - previous) / previous) * 100 : (current > 0 ? 100 : 0);

    const trends = {
      revenuePct: calculatePercentage(totalRevenue, prevRevenue),
      expensesPct: calculatePercentage(totalExpenses, prevExpenses),
      profitPct: calculatePercentage(netProfit, prevProfit),
      marginPct: calculatePercentage(profitMargin, prevMargin)
    };

    const result = {
      totalRevenue,
      totalExpenses,
      netProfit,
      profitMargin,
      revenueByMonth,
      expenseBreakdown,
      trends,
      previousPeriod: {
        totalRevenue: prevRevenue,
        totalExpenses: prevExpenses,
        netProfit: prevProfit,
        profitMargin: prevMargin
      },
      lastUpdated: new Date().toISOString()
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Financial report error:', error);
    
    return NextResponse.json({
      totalRevenue: 0,
      totalExpenses: 0,
      netProfit: 0,
      profitMargin: 0,
      revenueByMonth: [],
      expenseBreakdown: [],
      trends: { revenuePct: 0, expensesPct: 0, profitPct: 0, marginPct: 0 },
      previousPeriod: { totalRevenue: 0, totalExpenses: 0, netProfit: 0, profitMargin: 0 },
      lastUpdated: new Date().toISOString(),
      error: 'Could not fetch financial report data'
    });
  }
}