import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current date for recent products calculation
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Fetch all active products for accurate calculation
    // We select only necessary fields to minimize data transfer
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
      .eq('is_active', true);

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