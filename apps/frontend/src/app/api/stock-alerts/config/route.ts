import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getStockAlertsContext,
  loadStockAlertConfig,
  persistStockAlertConfig,
} from '../_lib';
import { normalizeStockAlertConfig } from '@/lib/stock-alerts';

const configSchema = z.object({
  globalMinThreshold: z.coerce.number().int().min(0).max(100000),
  globalMaxThreshold: z.coerce.number().int().min(0).max(100000),
  criticalThreshold: z.coerce.number().int().min(0).max(100000),
  warningThreshold: z.coerce.number().int().min(0).max(100000),
  enableEmailAlerts: z.boolean(),
  enablePushNotifications: z.boolean(),
  autoCreateOrders: z.boolean(),
  checkFrequency: z.enum(['hourly', 'daily', 'weekly']),
});

export async function GET(request: NextRequest) {
  try {
    const context = await getStockAlertsContext(request);

    if (!context.organizationId || !context.adminClient) {
      return NextResponse.json(
        { error: context.error || 'Organization required' },
        { status: 400 }
      );
    }

    const config = await loadStockAlertConfig(context.adminClient, context.organizationId);

    return NextResponse.json({
      success: true,
      data: config,
      config,
    });
  } catch (error) {
    console.error('GET /api/stock-alerts/config failed:', error);
    return NextResponse.json(
      { error: 'No se pudo cargar la configuracion de alertas' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const context = await getStockAlertsContext(request);

    if (!context.organizationId || !context.adminClient) {
      return NextResponse.json(
        { error: context.error || 'Organization required' },
        { status: 400 }
      );
    }

    const payload = configSchema.parse(await request.json());
    const config = normalizeStockAlertConfig(payload, payload.globalMinThreshold);

    if (config.criticalThreshold > config.globalMinThreshold) {
      return NextResponse.json(
        { error: 'El umbral critico no puede superar el minimo global' },
        { status: 400 }
      );
    }

    const saved = await persistStockAlertConfig(
      context.adminClient,
      context.organizationId,
      config
    );

    return NextResponse.json({
      success: true,
      data: saved,
      config: saved,
      message: 'Configuracion actualizada correctamente',
    });
  } catch (error) {
    console.error('PUT /api/stock-alerts/config failed:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos invalidos', details: error.flatten() },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'No se pudo guardar la configuracion de alertas' },
      { status: 500 }
    );
  }
}
