import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { resolveTenantContextFromHeaders } from '@/lib/domain/request-tenant';
import { fetchPublicOffersCarouselSnapshot } from '@/lib/public-site/offers-data';

type CarouselRow = {
  promotion_id: string;
  position: number;
};

export async function GET(request: NextRequest) {
  try {
    const tenantContext = await resolveTenantContextFromHeaders(request.headers);

    if (tenantContext.kind !== 'tenant') {
      return NextResponse.json(
        {
          success: true,
          data: [],
          source: 'active-promotions',
          message: 'No hay tenant publico resuelto para este carrusel.',
        },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          },
        }
      );
    }

    const supabase = await createAdminClient();
    const organizationId = tenantContext.organization.id;

    const { data: carouselData, error: carouselError } = await supabase
      .from('promotions_carousel')
      .select('promotion_id, position')
      .eq('organization_id', organizationId)
      .order('position', { ascending: true });

    if (carouselError) {
      return NextResponse.json(
        {
          success: false,
          message: 'Error al cargar el carrusel',
          data: [],
        },
        { status: 500 }
      );
    }

    const configuredPromotionIds = ((carouselData || []) as CarouselRow[]).map((item) => item.promotion_id);
    const snapshot = await fetchPublicOffersCarouselSnapshot(organizationId, {
      promotionIds: configuredPromotionIds,
      limit: Math.max(configuredPromotionIds.length, 6),
    });

    return NextResponse.json(
      {
        success: true,
        data: snapshot.items,
        count: snapshot.items.length,
        source: snapshot.source,
        message: snapshot.items.length > 0
          ? undefined
          : 'No hay promociones activas para mostrar en el carrusel',
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error) {
    console.error('[API/Carousel/Public] Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error al cargar ofertas destacadas',
        data: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
