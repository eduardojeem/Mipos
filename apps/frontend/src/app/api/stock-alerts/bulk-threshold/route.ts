import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getStockAlertsContext } from '../_lib';

const bulkThresholdSchema = z.object({
  productIds: z.array(z.string().min(1)).min(1).max(200),
  minThreshold: z.coerce.number().int().min(0).max(100000),
});

export async function PATCH(request: NextRequest) {
  try {
    const context = await getStockAlertsContext(request);

    if (!context.organizationId || !context.adminClient) {
      return NextResponse.json(
        { error: context.error || 'Organization required' },
        { status: 400 }
      );
    }

    const body = bulkThresholdSchema.parse(await request.json());
    const now = new Date().toISOString();

    const { data, error } = await context.adminClient
      .from('products')
      .update({
        min_stock: body.minThreshold,
        updated_at: now,
      })
      .eq('organization_id', context.organizationId)
      .in('id', body.productIds)
      .select('id,name,min_stock,updated_at');

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      updated: Array.isArray(data) ? data.length : 0,
      message: 'Umbrales actualizados correctamente',
    });
  } catch (error) {
    console.error('PATCH /api/stock-alerts/bulk-threshold failed:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos invalidos', details: error.flatten() },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'No se pudieron actualizar los umbrales seleccionados' },
      { status: 500 }
    );
  }
}
