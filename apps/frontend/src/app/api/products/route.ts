import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isMockAuthEnabled } from '@/lib/env';

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
    const orgId = (request.headers.get('x-organization-id') || '').trim();
    if (!orgId) {
      return NextResponse.json({ error: 'Organization header missing' }, { status: 400 });
    }
    
    // Parámetros de consulta
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');
    const search = searchParams.get('search') || '';
    const categoryId = searchParams.get('categoryId') || '';
    const sortBy = searchParams.get('sortBy') || 'updated_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    
    // Construir consulta
    let query = supabase
      .from('products')
      .select(`
        *,
        category:categories(id, name),
        supplier:suppliers(id, name)
      `);

    query = query.eq('organization_id', orgId);
    
    // Aplicar filtros
    if (search) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,description.ilike.%${search}%`);
    }
    
    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }
    
    // Aplicar ordenamiento
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    
    // Aplicar paginación
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);
    
    const { data: products, error, count } = await query;
    
    if (error) {
      console.error('Error fetching products:', error);
      return NextResponse.json(
        { error: 'Error al obtener productos', details: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      products: products || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
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
