import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const productId = searchParams.get('productId');
    const branchId = searchParams.get('branchId');

    const supabase = await createClient();

    // Build products query with filters
    let productsQuery = supabase
      .from('products')
      .select(`
        id,
        name,
        stock_quantity,
        min_stock,
        sale_price,
        category_id,
        categories (
          name
        )
      `);

    // Apply filters
    if (category) productsQuery = productsQuery.eq('category_id', category);
    if (productId) productsQuery = productsQuery.eq('id', productId);
    if (branchId) productsQuery = productsQuery.eq('branch_id', branchId);

    const { data: productsData, error: productsError } = await productsQuery;

    if (productsError) throw productsError;

    // Calculate metrics server-side
    const totalProducts = productsData?.length || 0;
    
    const lowStockItems = (productsData || []).filter((product: any) => {
      const stock = Number(product.stock_quantity || 0);
      const minStock = Number(product.min_stock || 10);
      return stock > 0 && stock <= minStock;
    }).length;

    const outOfStockItems = (productsData || []).filter((product: any) => {
      const stock = Number(product.stock_quantity || 0);
      return stock === 0;
    }).length;

    const totalValue = (productsData || []).reduce((sum: number, product: any) => {
      const price = Number(product.sale_price || 0);
      const stock = Number(product.stock_quantity || 0);
      return sum + (price * stock);
    }, 0);

    // Stock levels with status
    const stockLevels = (productsData || []).map((product: any) => {
      const stock = Number(product.stock_quantity || 0);
      const minStock = Number(product.min_stock || 10);
      
      let status: 'low' | 'normal' | 'high';
      if (stock === 0) {
        status = 'low';
      } else if (stock <= minStock) {
        status = 'low';
      } else if (stock > minStock * 3) {
        status = 'high';
      } else {
        status = 'normal';
      }

      return {
        id: product.id,
        name: product.name,
        stock,
        status
      };
    }).sort((a: { stock: number }, b: { stock: number }) => a.stock - b.stock); // Sort by stock level (lowest first)

    // Category breakdown
    const categoryBreakdown = new Map<string, { count: number; value: number }>();
    
    (productsData || []).forEach((product: any) => {
      const categoryName = product.categories?.name || 'Sin categoría';
      const price = Number(product.sale_price || 0);
      const stock = Number(product.stock_quantity || 0);
      const value = price * stock;
      
      const existing = categoryBreakdown.get(categoryName) || { count: 0, value: 0 };
      existing.count += 1;
      existing.value += value;
      categoryBreakdown.set(categoryName, existing);
    });

    const categoryBreakdownArray = Array.from(categoryBreakdown.entries())
      .map(([category, data]) => ({
        category,
        count: data.count,
        value: data.value
      }))
      .sort((a: { value: number }, b: { value: number }) => b.value - a.value); // Sort by value (highest first)

    const result = {
      totalProducts,
      lowStockItems,
      outOfStockItems,
      totalValue,
      stockLevels: stockLevels.slice(0, 50), // Limit to top 50 for performance
      categoryBreakdown: categoryBreakdownArray,
      lastUpdated: new Date().toISOString()
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Inventory report error:', error);
    
    return NextResponse.json({
      totalProducts: 0,
      lowStockItems: 0,
      outOfStockItems: 0,
      totalValue: 0,
      stockLevels: [],
      categoryBreakdown: [],
      lastUpdated: new Date().toISOString(),
      error: 'Could not fetch inventory report data'
    });
  }
}
