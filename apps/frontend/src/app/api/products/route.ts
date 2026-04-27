import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isMockAuthEnabled } from '@/lib/env';
import { getUserOrganizationId } from '@/app/api/_utils/organization';

// Schema de validación para productos
const productSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  sku: z.string().min(1, 'El SKU es obligatorio'),
  description: z.string().optional(),
  sale_price: z.coerce.number().min(0, 'El precio de venta debe ser mayor o igual a 0'),
  cost_price: z.coerce.number().min(0, 'El precio de costo debe ser mayor o igual a 0').optional(),
  offer_price: z.coerce.number().min(0, 'El precio de oferta debe ser mayor o igual a 0').optional(),
  wholesale_price: z.coerce.number().min(0, 'El precio mayorista debe ser mayor o igual a 0').optional(),
  min_wholesale_quantity: z.coerce.number().int().min(1).optional(),
  stock_quantity: z.coerce.number().int().min(0, 'La cantidad en stock debe ser mayor o igual a 0'),
  min_stock: z.coerce.number().int().min(0, 'El stock mínimo debe ser mayor o igual a 0'),
  max_stock: z.coerce.number().int().min(0).optional(),
  category_id: z.string().uuid('ID de categoría inválido'),
  supplier_id: z.string().uuid().optional(),
  barcode: z.string().optional(),
  image_url: z.string().optional(),
  is_active: z.boolean().default(true)
});

// GET - Obtener productos (usar cliente regular para lectura)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    let orgId = (request.headers.get('x-organization-id') || '').trim();
    if (!orgId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        const resolved = await getUserOrganizationId(user.id);
        if (resolved) orgId = resolved;
      }
      if (!orgId) {
        return NextResponse.json({ error: 'Organization header missing' }, { status: 400 });
      }
    }
    
    // Parámetros de consulta
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');
    const search = searchParams.get('search') || '';
    const categoryId = searchParams.get('categoryId') || '';
    const rawSortBy = searchParams.get('sortBy') || 'updated_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const lowStockOnly = searchParams.get('lowStock') === 'true';

    // Whitelist valid DB columns to prevent Supabase errors
    const VALID_SORT_COLUMNS = new Set(['name', 'sale_price', 'stock_quantity', 'updated_at', 'created_at', 'sku']);
    const sortBy = VALID_SORT_COLUMNS.has(rawSortBy) ? rawSortBy : 'updated_at';

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Build base query — try with category join first, fallback without it
    const buildQuery = (withJoin: boolean) => {
      let q = supabase
        .from('products')
        .select(withJoin ? '*, category:categories(id, name)' : '*', { count: 'exact' })
        .eq('organization_id', orgId);

      if (search) q = q.or(`name.ilike.%${search}%,sku.ilike.%${search}%,description.ilike.%${search}%`);
      if (categoryId) q = q.eq('category_id', categoryId);
      q = q.order(sortBy, { ascending: sortOrder === 'asc' });
      if (lowStockOnly) {
        q = q.limit(Math.max(limit * 4, 200));
      } else {
        q = q.range(from, to);
      }
      return q;
    };

    let { data: products, error, count } = await buildQuery(true);

    // If join fails (missing FK or RLS on categories), retry without it
    if (error) {
      console.warn('[products] Join query failed, retrying without category join:', error.message);
      const fallback = await buildQuery(false);
      if (fallback.error) {
        console.error('[products] Fallback query also failed:', fallback.error.message, fallback.error.hint);
        return NextResponse.json(
          { error: 'Error al obtener productos', details: fallback.error.message },
          { status: 500 }
        );
      }
      products = fallback.data;
      count = fallback.count;
    }
    
    const rawProducts = products || [];
    const filteredProducts = lowStockOnly
      ? rawProducts.filter((product: any) => {
          const stockQuantity = Number(product?.stock_quantity ?? 0);
          const minStock = Number(product?.min_stock ?? 0);
          return stockQuantity <= minStock;
        })
      : rawProducts;

    const paginatedProducts = lowStockOnly
      ? filteredProducts.slice((page - 1) * limit, page * limit)
      : filteredProducts;

    const total = lowStockOnly ? filteredProducts.length : (count || 0);

    return NextResponse.json({
      products: paginatedProducts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
    
  } catch (error) {
    console.error('Unexpected error in GET /api/products:', error);
    return NextResponse.json(
      { error: 'Error inesperado al obtener productos' },
      { status: 500 }
    );
  }
}

// POST - Crear producto (usar service role para escritura)
export async function POST(request: NextRequest) {
  try {
    const forceMock = (request.headers.get('x-env-mode') || request.headers.get('X-Env-Mode') || '').toLowerCase() === 'mock';
    if (forceMock || isMockAuthEnabled()) {
      const body = await request.json();
      const validationResult = productSchema.safeParse(body);
      if (!validationResult.success) {
        return NextResponse.json(
          { 
            error: 'Datos inválidos', 
            details: validationResult.error.errors 
          },
          { status: 400 }
        );
      }
      const now = new Date().toISOString();
      const data = validationResult.data;
      const product = {
        id: `mock-${Math.random().toString(36).slice(2)}`,
        ...data,
        created_at: now,
        updated_at: now
      };
      return NextResponse.json({ product, message: 'Producto creado exitosamente (mock)' }, { status: 201 });
    }
    // Verificar autenticación
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Usuario no autenticado' },
        { status: 401 }
      );
    }
    
    // Obtener datos del cuerpo de la petición
    const body = await request.json();
    
    // Validar datos
    const validationResult = productSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Datos inválidos', 
          details: validationResult.error.errors 
        },
        { status: 400 }
      );
    }
    
    const productData = validationResult.data;

    // Multitenancy: require organization header
    const orgId = (request.headers.get('x-organization-id') || '').trim();
    if (!orgId) {
      return NextResponse.json({ error: 'Organization header missing' }, { status: 400 });
    }
    
    // Crear cliente con service role para operaciones de escritura
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      const now = new Date().toISOString();
      const product = {
        id: `mock-${Math.random().toString(36).slice(2)}`,
        ...productData,
        created_at: now,
        updated_at: now
      };
      return NextResponse.json({ product, warning: 'Service role no configurado. Producto no persistido.' }, { status: 201 });
    }
    
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const adminClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey
    );
    
    // Verificar que la categoría existe
    const { data: category, error: categoryError } = await adminClient
      .from('categories')
      .select('id, organization_id')
      .eq('id', productData.category_id)
      .eq('organization_id', orgId)
      .single();
    
    if (categoryError || !category) {
      return NextResponse.json(
        { error: 'Categoría no encontrada' },
        { status: 400 }
      );
    }
    
    // Verificar que el SKU es único
    const { data: existingProduct, error: skuError } = await adminClient
      .from('products')
      .select('id, organization_id')
      .eq('sku', productData.sku)
      .eq('organization_id', orgId)
      .single();
    
    if (existingProduct) {
      return NextResponse.json(
        { error: 'Ya existe un producto con este SKU' },
        { status: 400 }
      );
    }
    
    // Crear el producto
    const { data: newProduct, error: insertError } = await adminClient
      .from('products')
      .insert([{
        ...productData,
        organization_id: orgId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select('*')
      .single();
    
    if (insertError) {
      console.error('Error creating product:', insertError);
      return NextResponse.json(
        { 
          error: 'Error al crear producto', 
          details: insertError.message 
        },
        { status: 500 }
      );
    }
    
    try {
      const origin = new URL(request.url).origin;
      const payload = {
        id: newProduct.id,
        name: newProduct.name,
        sku: newProduct.sku,
        sale_price: newProduct.sale_price,
        cost_price: newProduct.cost_price,
        wholesale_price: newProduct.wholesale_price,
        stock_quantity: newProduct.stock_quantity,
        barcode: newProduct.barcode,
        brand: newProduct.brand,
        category_id: newProduct.category_id,
        supplier_id: newProduct.supplier_id,
        is_active: newProduct.is_active,
        updated_at: newProduct.updated_at,
        organization_id: orgId
      };
      await fetch(`${origin}/api/external-sync/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: [payload] })
      });
    } catch {}

    return NextResponse.json({
      product: newProduct,
      message: 'Producto creado exitosamente'
    }, { status: 201 });
    
  } catch (error) {
    console.error('Unexpected error in POST /api/products:', error);
    return NextResponse.json(
      { error: 'Error inesperado al crear producto' },
      { status: 500 }
    );
  }
}
