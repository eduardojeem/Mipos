import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireOrganization } from '@/lib/organization';

export async function GET(request: NextRequest) {
  try {
    // Validate and get organization ID
    const orgId = await requireOrganization(request);
    
    const supabase = await createClient();

    // Get current date for recent products calculation
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Fetch all active products for accurate calculation
    // We select only necessary fields to minimize data transfer
    // Filtered by organization for multitenancy
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        id,
        stock_quantity,
        min_stock,
        sale_price,
        cost_price,
        category_id,
        created_at
      `)
      .eq('is_active', true)
      .eq('organization_id', orgId);

    if (error) throw error;

    const allProducts = products || [];
    
    // Calculate stats in memory
    const stats = allProducts.reduce((acc: {
      totalValue: number;
      outOfStock: number;
      lowStock: number;
      recentlyAdded: number;
      categoryCounts: Record<string, number>;
    }, product: any) => {
      const stock = Number(product.stock_quantity || 0);
      const minStock = Number(product.min_stock || 5); // Default to 5 if not set
      const price = Number(product.cost_price || product.sale_price || 0); // Use cost price for inventory value
      const createdAt = new Date(product.created_at || 0).getTime();
      
      // Total Value
      acc.totalValue += stock * price;

      // Stock Status
      if (stock === 0) {
        acc.outOfStock++;
      } else if (stock <= minStock) {
        acc.lowStock++;
      }

      // Recent Products
      if (createdAt >= weekAgo.getTime()) {
        acc.recentlyAdded++;
      }

      // Category Count
      if (product.category_id) {
        acc.categoryCounts[product.category_id] = (acc.categoryCounts[product.category_id] || 0) + 1;
      }

      return acc;
    }, {
      totalValue: 0,
      outOfStock: 0,
      lowStock: 0,
      recentlyAdded: 0,
      categoryCounts: {} as Record<string, number>
    });

    // Find Top Category
    const topCategoryId = Object.entries(stats.categoryCounts)
      .sort(([, a], [, b]) => (b as number) - (a as number))[0]?.[0];

    let topCategory = 'N/A';
    if (topCategoryId) {
      const { data: cat } = await supabase
        .from('categories')
        .select('name')
        .eq('id', topCategoryId)
        .eq('organization_id', orgId)
        .single();
      if (cat) topCategory = cat.name;
    }

    const summary = {
      totalProducts: allProducts.length,
      lowStockProducts: stats.lowStock,
      outOfStockProducts: stats.outOfStock,
      totalValue: Math.round(stats.totalValue),
      recentlyAdded: stats.recentlyAdded,
      topCategory,
      lastUpdated: new Date().toISOString()
    };

    return NextResponse.json(summary);

  } catch (error) {
    console.error('Products summary error:', error);
    
    // Return specific error if it's an organization validation error
    if (error instanceof Error && error.message.includes('No valid organization')) {
      return NextResponse.json(
        { error: 'Organization required', message: error.message },
        { status: 400 }
      );
    }
    
    // Return fallback data
    return NextResponse.json({
      totalProducts: 0,
      lowStockProducts: 0,
      outOfStockProducts: 0,
      totalValue: 0,
      recentlyAdded: 0,
      topCategory: 'N/A',
      lastUpdated: new Date().toISOString(),
      error: 'Could not fetch products summary'
    });
  }
}