import { createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isMockAuthEnabled } from '@/lib/env';
import { assertCsrf } from '@/app/api/_utils/csrf';
import { requireOrganization } from '@/lib/organization';
import { requirePOSPermissions } from '@/app/api/_utils/role-validation';

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
  images: z.array(z.string()).optional(),
  is_active: z.boolean().default(true),
  iva_included: z.boolean().optional(),
  iva_rate: z.coerce.number().min(0).max(100).optional(),
  brand: z.string().optional(),
  shade: z.string().optional(),
  skin_type: z.string().optional(),
  ingredients: z.string().optional(),
  volume: z.string().optional(),
  spf: z.coerce.number().min(0).optional(),
  finish: z.string().optional(),
  coverage: z.string().optional(),
  waterproof: z.boolean().optional(),
  vegan: z.boolean().optional(),
  cruelty_free: z.boolean().optional(),
  expiration_date: z.string().optional(),
});

// Columnas válidas para ordenamiento (whitelist)
const VALID_SORT_COLUMNS = new Set([
  'name',
  'sale_price',
  'stock_quantity',
  'updated_at',
  'created_at',
  'sku',
]);

// GET - Obtener productos
// Redirige internamente a /api/products/list para mantener una única
// fuente de verdad. Se preserva por compatibilidad con callers legacy.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Reutilizar el handler de /api/products/list pasando los mismos parámetros.
    // Mapeamos los nombres de parámetros legacy al esquema de /list.
    const listParams = new URLSearchParams();

    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '25';
    listParams.set('page', page);
    listParams.set('limit', limit);

    const search = searchParams.get('search');
    if (search) listParams.set('search', search);

    const categoryId = searchParams.get('categoryId');
    if (categoryId) listParams.set('categoryId', categoryId);

    const sortBy = searchParams.get('sortBy');
    if (sortBy) listParams.set('sortBy', sortBy);

    const sortOrder = searchParams.get('sortOrder');
    if (sortOrder) listParams.set('sortOrder', sortOrder);

    const isActive = searchParams.get('isActive');
    if (isActive) listParams.set('isActive', isActive);

    // lowStock legacy → stockStatus=low_stock en /list
    if (searchParams.get('lowStock') === 'true') {
      listParams.set('stockStatus', 'low_stock');
    }

    const minPrice = searchParams.get('minPrice');
    if (minPrice) listParams.set('minPrice', minPrice);

    const maxPrice = searchParams.get('maxPrice');
    if (maxPrice) listParams.set('maxPrice', maxPrice);

    const origin = new URL(request.url).origin;
    const listUrl = `${origin}/api/products/list?${listParams.toString()}`;

    const listResponse = await fetch(listUrl, {
      headers: {
        'x-organization-id': request.headers.get('x-organization-id') || '',
        'cookie': request.headers.get('cookie') || '',
      },
    });

    const data = await listResponse.json();

    if (!listResponse.ok) {
      return NextResponse.json(
        { error: data?.error || 'Error al obtener productos' },
        { status: listResponse.status },
      );
    }

    // Normalizar la respuesta al formato legacy que algunos callers esperan
    const pg = data?.pagination || {};
    return NextResponse.json({
      products: data?.products || [],
      total: pg.total ?? 0,
      page: pg.page ?? Number(page),
      limit: pg.limit ?? Number(limit),
      totalPages: pg.totalPages ?? 0,
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/products:', error);
    return NextResponse.json(
      { error: 'Error inesperado al obtener productos' },
      { status: 500 },
    );
  }
}

// POST - Crear producto
export async function POST(request: NextRequest) {
  try {
    // CSRF check en todos los métodos de escritura
    const csrf = assertCsrf(request);
    if (!csrf.ok) return csrf.response;

    const auth = await requirePOSPermissions(request, [
      'products.create',
      'products.write',
      'products.manage',
    ]);
    if (!auth.ok) {
      return NextResponse.json(auth.body, { status: auth.status });
    }

    const forceMock =
      (
        request.headers.get('x-env-mode') ||
        request.headers.get('X-Env-Mode') ||
        ''
      ).toLowerCase() === 'mock';

    if (forceMock || isMockAuthEnabled()) {
      const body = await request.json();
      const validationResult = productSchema.safeParse(body);
      if (!validationResult.success) {
        return NextResponse.json(
          { error: 'Datos inválidos', details: validationResult.error.errors },
          { status: 400 },
        );
      }
      const now = new Date().toISOString();
      const product = {
        id: `mock-${Math.random().toString(36).slice(2)}`,
        ...validationResult.data,
        created_at: now,
        updated_at: now,
      };
      return NextResponse.json(
        { product, message: 'Producto creado exitosamente (mock)' },
        { status: 201 },
      );
    }

    const body = await request.json();

    const validationResult = productSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validationResult.error.errors },
        { status: 400 },
      );
    }

    const productData = validationResult.data;

    const orgId = await requireOrganization(request);

    // Usar el admin client centralizado (no import dinámico)
    const adminClient = await createAdminClient();

    // Verificar que la categoría existe y pertenece a la organización
    const { data: category, error: categoryError } = await adminClient
      .from('categories')
      .select('id')
      .eq('id', productData.category_id)
      .eq('organization_id', orgId)
      .maybeSingle();

    if (categoryError) {
      throw categoryError;
    }
    if (!category) {
      return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 400 });
    }

    // Verificar que el SKU es único dentro de la organización
    const { data: existingProduct, error: skuError } = await adminClient
      .from('products')
      .select('id')
      .eq('sku', productData.sku)
      .eq('organization_id', orgId)
      .maybeSingle();

    if (skuError) {
      throw skuError;
    }
    if (existingProduct) {
      return NextResponse.json(
        { error: 'Ya existe un producto con este SKU' },
        { status: 409 },
      );
    }

    const { data: newProduct, error: insertError } = await adminClient
      .from('products')
      .insert([
        {
          ...productData,
          organization_id: orgId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select('*')
      .single();

    if (insertError) {
      console.error('Error creating product:', insertError);
      return NextResponse.json(
        { error: 'Error al crear producto', details: insertError.message },
        { status: 500 },
      );
    }

    // Sync externo — best-effort, no bloquea la respuesta
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
        organization_id: orgId,
      };
      await fetch(`${origin}/api/external-sync/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: [payload] }),
      });
    } catch {
      // Best-effort: el error de sync no debe fallar la creación
    }

    return NextResponse.json(
      { product: newProduct, message: 'Producto creado exitosamente' },
      { status: 201 },
    );
  } catch (error) {
    console.error('Unexpected error in POST /api/products:', error);
    return NextResponse.json(
      { error: 'Error inesperado al crear producto' },
      { status: 500 },
    );
  }
}
