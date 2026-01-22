import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '25'), 100); // Max 100 for performance
    
    // Filter parameters
    const search = searchParams.get('search');
    const categoryId = searchParams.get('categoryId');
    const supplierId = searchParams.get('supplierId');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const minStock = searchParams.get('minStock');
    const maxStock = searchParams.get('maxStock');
    const isActive = searchParams.get('isActive');
    const stockStatus = searchParams.get('stockStatus');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const supabase = await createClient();

    // Build query with optimized select
    let query = supabase
      .from('products')
      .select(`
        id,
        name,
        sku,
        description,
        cost_price,
        sale_price,
        stock_quantity,
        min_stock,
        is_active,
        created_at,
        updated_at,
        image_url,
        discount_percentage,
        category_id,
        supplier_id,
        categories!products_category_id_fkey (
          id,
          name
        ),
        suppliers!products_supplier_id_fkey (
          id,
          name
        )
      `, { count: 'exact' });

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    if (supplierId) {
      query = query.eq('supplier_id', supplierId);
    }

    if (minPrice) {
      query = query.gte('sale_price', parseFloat(minPrice));
    }

    if (maxPrice) {
      query = query.lte('sale_price', parseFloat(maxPrice));
    }

    if (minStock) {
      query = query.gte('stock_quantity', parseInt(minStock));
    }

    if (maxStock) {
      query = query.lte('stock_quantity', parseInt(maxStock));
    }

    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true');
    }

    // Stock status filter
    if (stockStatus) {
      switch (stockStatus) {
        case 'out_of_stock':
          query = query.eq('stock_quantity', 0);
          break;
        case 'low_stock':
          query = query.gt('stock_quantity', 0).lte('stock_quantity', 5);
          break;
        case 'in_stock':
          query = query.gt('stock_quantity', 5);
          break;
        case 'critical':
          query = query.lte('stock_quantity', 2);
          break;
      }
    }

    // Sorting
    const validSortFields = ['name', 'sku', 'sale_price', 'stock_quantity', 'created_at', 'updated_at'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    query = query.order(sortField, { ascending: sortOrder === 'asc' });

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: products, error, count } = await query;

    if (error) throw error;

    // Transform data for frontend
    const transformedProducts = (products || []).map((product: any) => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      description: product.description,
      cost_price: product.cost_price,
      sale_price: product.sale_price,
      stock_quantity: product.stock_quantity,
      min_stock: product.min_stock,
      is_active: product.is_active,
      created_at: product.created_at,
      updated_at: product.updated_at,
      image_url: product.image_url,
      images: [], // Placeholder for images array
      discount_percentage: product.discount_percentage || 0,
      category_id: product.category_id,
      supplier_id: product.supplier_id,
      category: product.categories ? {
        id: product.categories.id,
        name: product.categories.name,
        description: '',
        is_active: true,
        created_at: product.created_at,
        updated_at: product.updated_at
      } : null,
      supplier: product.suppliers ? {
        id: product.suppliers.id,
        name: product.suppliers.name,
        email: '',
        phone: '',
        address: '',
        is_active: true,
        created_at: product.created_at,
        updated_at: product.updated_at
      } : null
    }));

    const totalPages = Math.ceil((count || 0) / limit);
    const hasMore = page < totalPages;

    const result = {
      products: transformedProducts,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasMore,
        hasPrev: page > 1
      },
      lastUpdated: new Date().toISOString()
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Products list error:', error);
    
    return NextResponse.json({
      products: [],
      pagination: {
        page: 1,
        limit: 25,
        total: 0,
        totalPages: 0,
        hasMore: false,
        hasPrev: false
      },
      lastUpdated: new Date().toISOString(),
      error: 'Could not fetch products list'
    });
  }
}