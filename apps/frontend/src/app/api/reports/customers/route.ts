import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface CustomerSale {
  id: string;
  total_amount?: number;
  created_at: string;
  status: string;
}

interface CustomerWithSales {
  id: string;
  name?: string;
  email?: string;
  created_at: string;
  sales?: CustomerSale[];
}

interface ProcessedCustomer {
  id: string;
  name: string;
  email?: string;
  created_at: string;
  totalSpent: number;
  orders: number;
  isNew: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const customerId = searchParams.get('customerId');
    const branchId = searchParams.get('branchId');
    const posId = searchParams.get('posId');

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Start date and end date are required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Get customers with their sales in the period
    let customersQuery = supabase
      .from('customers')
      .select(`
        id,
        name,
        email,
        created_at,
        sales!inner (
          id,
          total_amount,
          created_at,
          status
        )
      `);

    if (customerId) {
      customersQuery = customersQuery.eq('id', customerId);
    }

    const { data: customersData, error: customersError } = await customersQuery;

    if (customersError) throw customersError;

    // Filter sales by date range and calculate metrics
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    const processedCustomers: ProcessedCustomer[] = (customersData || []).map((customer: CustomerWithSales) => {
      const relevantSales = (customer.sales || []).filter((sale: CustomerSale) => {
        const saleDate = new Date(sale.created_at);
        return saleDate >= startDateObj && 
               saleDate <= endDateObj && 
               sale.status === 'completed';
      });

      const totalSpent = relevantSales.reduce((sum: number, sale: CustomerSale) => sum + (sale.total_amount || 0), 0);
      const orders = relevantSales.length;

      return {
        id: customer.id,
        name: customer.name || 'Sin nombre',
        email: customer.email,
        created_at: customer.created_at,
        totalSpent,
        orders,
        isNew: new Date(customer.created_at) >= startDateObj && new Date(customer.created_at) <= endDateObj
      };
    }).filter((customer: ProcessedCustomer) => customer.orders > 0 || customer.isNew); // Include customers with sales or new customers

    // Calculate summary metrics
    const totalCustomers = processedCustomers.length;
    const newCustomers = processedCustomers.filter((c: ProcessedCustomer) => c.isNew).length;
    const activeCustomers = processedCustomers.filter((c: ProcessedCustomer) => c.orders > 0).length;
    
    const totalSpentAllCustomers = processedCustomers.reduce((sum: number, c: ProcessedCustomer) => sum + c.totalSpent, 0);
    const customerLifetimeValue = totalCustomers > 0 ? totalSpentAllCustomers / totalCustomers : 0;

    // Top customers by spending
    const topCustomers = processedCustomers
      .sort((a: ProcessedCustomer, b: ProcessedCustomer) => b.totalSpent - a.totalSpent)
      .slice(0, 10)
      .map((customer: ProcessedCustomer) => ({
        id: customer.id,
        name: customer.name,
        totalSpent: customer.totalSpent,
        orders: customer.orders
      }));

    // Customer segments based on spending
    const vipCustomers = processedCustomers.filter((c: ProcessedCustomer) => c.totalSpent > 10000).length;
    const regularCustomers = processedCustomers.filter((c: ProcessedCustomer) => c.totalSpent > 1000 && c.totalSpent <= 10000).length;
    const casualCustomers = processedCustomers.filter((c: ProcessedCustomer) => c.totalSpent > 0 && c.totalSpent <= 1000).length;

    const customerSegments = [
      { 
        segment: 'VIP', 
        count: vipCustomers, 
        percentage: totalCustomers > 0 ? (vipCustomers / totalCustomers) * 100 : 0 
      },
      { 
        segment: 'Regular', 
        count: regularCustomers, 
        percentage: totalCustomers > 0 ? (regularCustomers / totalCustomers) * 100 : 0 
      },
      { 
        segment: 'Casual', 
        count: casualCustomers, 
        percentage: totalCustomers > 0 ? (casualCustomers / totalCustomers) * 100 : 0 
      },
      { 
        segment: 'Nuevo', 
        count: newCustomers, 
        percentage: totalCustomers > 0 ? (newCustomers / totalCustomers) * 100 : 0 
      }
    ];

    // Calculate previous period for trends
    const periodDays = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (24 * 60 * 60 * 1000));
    const prevEnd = new Date(startDateObj.getTime());
    const prevStart = new Date(prevEnd.getTime() - periodDays * 24 * 60 * 60 * 1000);

    // Get previous period new customers
    const { data: prevCustomersData } = await supabase
      .from('customers')
      .select('id, created_at')
      .gte('created_at', prevStart.toISOString().split('T')[0])
      .lte('created_at', prevEnd.toISOString().split('T')[0]);

    const prevNewCustomers = prevCustomersData?.length || 0;
    const newCustomersPct = prevNewCustomers > 0 
      ? ((newCustomers - prevNewCustomers) / prevNewCustomers) * 100 
      : (newCustomers > 0 ? 100 : 0);

    const result = {
      totalCustomers,
      newCustomers,
      activeCustomers,
      customerLifetimeValue,
      topCustomers,
      customerSegments,
      trends: {
        newCustomersPct
      },
      previousPeriod: {
        newCustomers: prevNewCustomers
      },
      lastUpdated: new Date().toISOString()
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Customer report error:', error);
    
    return NextResponse.json({
      totalCustomers: 0,
      newCustomers: 0,
      activeCustomers: 0,
      customerLifetimeValue: 0,
      topCustomers: [],
      customerSegments: [],
      trends: { newCustomersPct: 0 },
      previousPeriod: { newCustomers: 0 },
      lastUpdated: new Date().toISOString(),
      error: 'Could not fetch customer report data'
    });
  }
}
