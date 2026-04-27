import { NextRequest, NextResponse } from 'next/server';
import { getStockAlertsContext, getStockAlertsData } from './_lib';

function parseOptionalInt(value: string | null) {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(request: NextRequest) {
  try {
    const context = await getStockAlertsContext(request);

    if (!context.organizationId || !context.adminClient) {
      return NextResponse.json(
        { error: context.error || 'Organization required' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const response = await getStockAlertsData(context.adminClient, context.organizationId, {
      search: searchParams.get('search'),
      severity: searchParams.get('severity'),
      category: searchParams.get('category'),
      supplier: searchParams.get('supplier'),
      threshold: parseOptionalInt(searchParams.get('threshold')),
      limit: parseOptionalInt(searchParams.get('limit')),
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('GET /api/stock-alerts failed:', error);
    return NextResponse.json(
      { error: 'No se pudieron obtener las alertas de stock' },
      { status: 500 }
    );
  }
}
