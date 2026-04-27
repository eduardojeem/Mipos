import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getStockAlertsContext } from '../../_lib';

const thresholdSchema = z.object({
  minThreshold: z.coerce.number().int().min(0).max(100000),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const context = await getStockAlertsContext(request);

    if (!context.organizationId || !context.adminClient) {
      return NextResponse.json(
        { error: context.error || 'Organization required' },
        { status: 400 }
      );
    }

    const { productId } = await params;
    const body = thresholdSchema.parse(await request.json());
    const now = new Date().toISOString();

    const { data, error } = await context.adminClient
      .from('products')
      .update({
        min_stock: body.minThreshold,
        updated_at: now,
      })
      .eq('id', productId)
      .eq('organization_id', context.organizationId)
      .select('id,name,min_stock,updated_at')
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'Umbral actualizado correctamente',
    });
  } catch (error) {
    console.error('PATCH /api/stock-alerts/[productId]/threshold failed:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos invalidos', details: error.flatten() },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'No se pudo actualizar el umbral del producto' },
      { status: 500 }
    );
  }
}
