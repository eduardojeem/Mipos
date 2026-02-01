import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');
    const customerId = searchParams.get('customerId');
    const branchId = searchParams.get('branchId');
    const posId = searchParams.get('posId');
    const paymentMethod = searchParams.get('paymentMethod');

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Start date and end date are required' }, { status: 400 });
    }

    const orgId = (request.headers.get('x-organization-id') || '').trim();
    if (!orgId) {
      return NextResponse.json({ error: 'Organization header missing' }, { status: 400 });
    }

    const supabase = await createClient();

    // Build sales query with filters
    let salesQuery = supabase
      .from('sales')
      .select(`
        id,
        total_amount,
        created_at,
        status,
        customer_id,
        payment_method,
        sale_items (
          product_id,
          quantity,
          unit_price,
          total_price,
          products (
            id,
            name,
            category_id
          )
        )
      `)
      .eq('organization_id', orgId) // Filter by Organization
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    // Apply filters
    if (status) salesQuery = salesQuery.eq('status', status);
    if (customerId) salesQuery = salesQuery.eq('customer_id', customerId);
    if (branchId) salesQuery = salesQuery.eq('branch_id', branchId);
    if (posId) salesQuery = salesQuery.eq('pos_id', posId);
    if (paymentMethod) salesQuery = salesQuery.eq('payment_method', paymentMethod);

    const { data: salesData, error: salesError } = await salesQuery;

    if (salesError) throw salesError;

    // Calculate metrics server-side
    const totalSales = (salesData || []).reduce((sum: number, sale: any) => sum + (sale.total_amount || 0), 0);
    const totalOrders = salesData?.length || 0;
    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    // Process top products
    const productSales = new Map<string, { name: string; sales: number; quantity: number }>();
    
    (salesData || []).forEach((sale: any) => {
      (sale.sale_items || []).forEach((item: any) => {
        const productId = item.product_id;
        const productName = item.products?.name || 'Producto Desconocido';
        const quantity = Number(item.quantity || 0);
        const totalPrice = Number(item.total_price || (item.unit_price * quantity) || 0);
        
        const existing = productSales.get(productId) || { name: productName, sales: 0, quantity: 0 };
        existing.sales += totalPrice;
        existing.quantity += quantity;
        productSales.set(productId, existing);
      });
    });

    const topProducts = Array.from(productSales.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 10);

    // Sales by date
    const salesByDateMap = new Map<string, { sales: number; orders: number }>();
    (salesData || []).forEach((sale: any) => {
      const date = new Date(sale.created_at).toISOString().split('T')[0];
      const existing = salesByDateMap.get(date) || { sales: 0, orders: 0 };
      existing.sales += sale.total_amount || 0;
      existing.orders += 1;
      salesByDateMap.set(date, existing);
    });

    const salesByDate = Array.from(salesByDateMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Sales by category
    const categorySales = new Map<string, number>();
    (salesData || []).forEach((sale: any) => {
      (sale.sale_items || []).forEach((item: any) => {
        const category = item.products?.category_id || 'Sin categoría';
        const totalPrice = Number(item.total_price || (item.unit_price * item.quantity) || 0);
        categorySales.set(category, (categorySales.get(category) || 0) + totalPrice);
      });
    });

    const salesByCategory = Array.from(categorySales.entries())
      .map(([category, sales]) => ({
        category,
        sales,
        percentage: totalSales > 0 ? (sales / totalSales) * 100 : 0,
      }))
      .sort((a, b) => b.sales - a.sales);

    // Calculate previous period for trends
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    const periodDays = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (24 * 60 * 60 * 1000));
    const prevEnd = new Date(startDateObj.getTime());
    const prevStart = new Date(prevEnd.getTime() - periodDays * 24 * 60 * 60 * 1000);

    let prevQuery = supabase
      .from('sales')
      .select('total_amount')
      .eq('organization_id', orgId) // Filter by Organization
      .gte('created_at', prevStart.toISOString().split('T')[0])
      .lte('created_at', prevEnd.toISOString().split('T')[0]);

    if (status) prevQuery = prevQuery.eq('status', status);
    if (branchId) prevQuery = prevQuery.eq('branch_id', branchId);
    if (posId) prevQuery = prevQuery.eq('pos_id', posId);
    if (paymentMethod) prevQuery = prevQuery.eq('payment_method', paymentMethod);

    const { data: prevData } = await prevQuery;
    const prevTotalSales = (prevData || []).reduce((sum: number, sale: any) => sum + (sale.total_amount || 0), 0);
    const prevTotalOrders = prevData?.length || 0;
    const prevAOV = prevTotalOrders > 0 ? prevTotalSales / prevTotalOrders : 0;

    const calculatePercentage = (current: number, previous: number) => 
      previous > 0 ? ((current - previous) / previous) * 100 : (current > 0 ? 100 : 0);

    const trends = {
      salesPct: calculatePercentage(totalSales, prevTotalSales),
      ordersPct: calculatePercentage(totalOrders, prevTotalOrders),
      aovPct: calculatePercentage(averageOrderValue, prevAOV),
    };

    const result = {
      totalSales,
      totalOrders,
      averageOrderValue,
      topProducts,
      salesByDate,
      salesByCategory,
      trends,
      previousPeriod: {
        totalSales: prevTotalSales,
        totalOrders: prevTotalOrders,
        averageOrderValue: prevAOV
      },
      lastUpdated: new Date().toISOString()
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Sales report error:', error);
    
    return NextResponse.json({
      totalSales: 0,
      totalOrders: 0,
      averageOrderValue: 0,
      topProducts: [],
      salesByDate: [],
      salesByCategory: [],
      trends: { salesPct: 0, ordersPct: 0, aovPct: 0 },
      previousPeriod: { totalSales: 0, totalOrders: 0, averageOrderValue: 0 },
      lastUpdated: new Date().toISOString(),
      error: 'Could not fetch sales report data'
    });
  }
}