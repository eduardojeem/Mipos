import { NextRequest, NextResponse } from 'next/server';
import { resolveTenantContextFromHeaders } from '@/lib/domain/request-tenant';
import { fetchPublicOffersSnapshot } from '@/lib/public-site/offers-data';
import { normalizeOfferQuery } from '@/app/offers/offers-query';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const tenantContext = await resolveTenantContextFromHeaders(request.headers);

    if (tenantContext.kind !== 'tenant') {
      return NextResponse.json(
        {
          success: false,
          error: 'Tenant publico no resuelto para esta request.',
        },
        { status: 400 }
      );
    }

    const queryState = normalizeOfferQuery(
      Object.fromEntries(new URL(request.url).searchParams.entries())
    );
    const snapshot = await fetchPublicOffersSnapshot(
      tenantContext.organization.id,
      queryState
    );

    return NextResponse.json({
      success: true,
      data: snapshot.offers,
      categories: snapshot.categories,
      pagination: snapshot.pagination,
    });
  } catch (error) {
    console.error('Unexpected error in offers API:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor',
        details:
          error instanceof Error
            ? error.message
            : typeof error === 'string'
              ? error
              : JSON.stringify(error),
      },
      { status: 500 }
    );
  }
}
