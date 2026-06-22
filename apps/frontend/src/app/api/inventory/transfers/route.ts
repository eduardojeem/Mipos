import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireCompanyAccess } from '@/app/api/_utils/company-authorization';
import { createAdminClient } from '@/lib/supabase/server';

const transferSchema = z.object({
  productId: z.string().trim().min(1, 'Producto requerido'),
  fromBranchId: z.string().trim().uuid('Sucursal origen invalida'),
  toBranchId: z.string().trim().uuid('Sucursal destino invalida'),
  quantity: z.coerce.number().int().positive('La cantidad debe ser mayor a cero'),
  notes: z.string().trim().max(500, 'La nota no puede superar 500 caracteres').optional(),
});

function getRequestedOrganizationId(request: NextRequest): string | undefined {
  return (
    request.headers.get('x-organization-id')?.trim() ||
    request.nextUrl.searchParams.get('organizationId')?.trim() ||
    undefined
  );
}

function errorResponse(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ success: false, error: message, details }, { status });
}

function sumStock(rows: Array<{ quantity: number | null }>) {
  return rows.reduce((total, row) => total + Number(row.quantity ?? 0), 0);
}

async function getBranchStock(
  adminClient: Awaited<ReturnType<typeof createAdminClient>>,
  organizationId: string,
  productId: string,
  branchId: string
) {
  const { data, error } = await adminClient
    .from('inventory_movements')
    .select('quantity')
    .eq('organization_id', organizationId)
    .eq('product_id', productId)
    .eq('branch_id', branchId);

  if (error) throw error;
  return sumStock((data || []) as Array<{ quantity: number | null }>);
}

export async function GET(request: NextRequest) {
  const access = await requireCompanyAccess(request, {
    companyId: getRequestedOrganizationId(request),
    allowedRoles: ['OWNER', 'ADMIN', 'SUPER_ADMIN'],
  });

  if (!access.ok) return NextResponse.json(access.body, { status: access.status });
  if (!access.context.companyId) return errorResponse('Organizacion no resuelta', 400);

  const productId = request.nextUrl.searchParams.get('productId')?.trim();
  const branchId = request.nextUrl.searchParams.get('branchId')?.trim();

  if (!productId || !branchId) {
    return errorResponse('productId y branchId son requeridos', 400);
  }

  const adminClient = await createAdminClient();

  try {
    const stock = await getBranchStock(adminClient, access.context.companyId, productId, branchId);
    return NextResponse.json({ success: true, data: { productId, branchId, stock } });
  } catch (error) {
    return errorResponse(
      'No se pudo calcular el stock de la sucursal',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

export async function POST(request: NextRequest) {
  const access = await requireCompanyAccess(request, {
    companyId: getRequestedOrganizationId(request),
    allowedRoles: ['OWNER', 'ADMIN', 'SUPER_ADMIN'],
  });

  if (!access.ok) return NextResponse.json(access.body, { status: access.status });
  if (!access.context.companyId) return errorResponse('Organizacion no resuelta', 400);

  const parsed = transferSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return errorResponse('Datos de transferencia invalidos', 422, parsed.error.flatten());
  }

  const { productId, fromBranchId, toBranchId, quantity, notes } = parsed.data;
  const organizationId = access.context.companyId;

  if (fromBranchId === toBranchId) {
    return errorResponse('La sucursal origen y destino deben ser diferentes', 400);
  }

  const adminClient = await createAdminClient();

  const [{ data: branches, error: branchesError }, { data: product, error: productError }] = await Promise.all([
    adminClient
      .from('branches')
      .select('id,name,is_active')
      .eq('organization_id', organizationId)
      .in('id', [fromBranchId, toBranchId]),
    adminClient
      .from('products')
      .select('id,name,sku,is_active,stock_quantity')
      .eq('organization_id', organizationId)
      .eq('id', productId)
      .maybeSingle(),
  ]);

  if (branchesError) return errorResponse(branchesError.message || 'No se pudieron validar sucursales', 500);
  if (productError) return errorResponse(productError.message || 'No se pudo validar el producto', 500);
  if (!product) return errorResponse('Producto no encontrado', 404);
  if ((product as { is_active?: boolean | null }).is_active === false) {
    return errorResponse('El producto seleccionado esta inactivo', 400);
  }

  const branchMap = new Map((branches || []).map((branch: { id: string }) => [branch.id, branch]));
  const fromBranch = branchMap.get(fromBranchId) as { id: string; name: string; is_active: boolean | null } | undefined;
  const toBranch = branchMap.get(toBranchId) as { id: string; name: string; is_active: boolean | null } | undefined;

  if (!fromBranch || !toBranch) return errorResponse('Sucursal origen o destino no encontrada', 404);
  if (fromBranch.is_active === false || toBranch.is_active === false) {
    return errorResponse('Solo se puede transferir entre sucursales activas', 400);
  }

  let fromStock = 0;
  let toStock = 0;

  try {
    [fromStock, toStock] = await Promise.all([
      getBranchStock(adminClient, organizationId, productId, fromBranchId),
      getBranchStock(adminClient, organizationId, productId, toBranchId),
    ]);
  } catch (error) {
    return errorResponse(
      'No se pudo calcular el stock por sucursal',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }

  if (fromStock < quantity) {
    return errorResponse(
      `Stock insuficiente en ${fromBranch.name}. Disponible: ${fromStock}, solicitado: ${quantity}`,
      409,
      { available: fromStock, requested: quantity }
    );
  }

  const transferId = randomUUID();
  const now = new Date().toISOString();
  const productName = String((product as { name?: string }).name || 'Producto');
  const baseNote =
    notes ||
    `Transferencia de ${productName}: ${fromBranch.name} -> ${toBranch.name}`;

  const { data: movements, error: insertError } = await adminClient
    .from('inventory_movements')
    .insert([
      {
        product_id: productId,
        movement_type: 'TRANSFER',
        quantity: -quantity,
        reference_type: 'ADJUSTMENT',
        reference_id: transferId,
        notes: baseNote,
        user_id: access.context.userId,
        organization_id: organizationId,
        branch_id: fromBranchId,
        created_at: now,
        updated_at: now,
      },
      {
        product_id: productId,
        movement_type: 'TRANSFER',
        quantity,
        reference_type: 'ADJUSTMENT',
        reference_id: transferId,
        notes: baseNote,
        user_id: access.context.userId,
        organization_id: organizationId,
        branch_id: toBranchId,
        created_at: now,
        updated_at: now,
      },
    ])
    .select('id,product_id,movement_type,quantity,reference_id,branch_id,created_at');

  if (insertError) {
    return errorResponse(insertError.message || 'No se pudo registrar la transferencia', 500);
  }

  return NextResponse.json({
    success: true,
    data: {
      transferId,
      product: {
        id: productId,
        name: productName,
        sku: (product as { sku?: string | null }).sku ?? null,
      },
      quantity,
      fromBranch: {
        id: fromBranch.id,
        name: fromBranch.name,
        stockBefore: fromStock,
        stockAfter: fromStock - quantity,
      },
      toBranch: {
        id: toBranch.id,
        name: toBranch.name,
        stockBefore: toStock,
        stockAfter: toStock + quantity,
      },
      movements: movements || [],
    },
  }, { status: 201 });
}
