import { NextRequest, NextResponse } from 'next/server';
import { normalizeCatalogQuery } from '@/app/catalog/catalog-query';
import { maybeGetCurrentOrganization } from '@/lib/organization/get-current-organization';
import { getPublicBusinessConfig } from '@/lib/public-site/data';
import { fetchPublicCatalogPage } from '@/lib/public-site/catalog-data';

export async function GET(request: NextRequest) {
  try {
    const organization = await maybeGetCurrentOrganization();

    if (!organization) {
      return NextResponse.json({ error: 'Organizacion no encontrada' }, { status: 404 });
    }

    const config = await getPublicBusinessConfig(organization);
    if (!config.publicSite?.sections?.showCatalog) {
      return NextResponse.json({ error: 'Catalogo no disponible' }, { status: 403 });
    }

    const query = normalizeCatalogQuery(request.nextUrl.searchParams);
    const payload = await fetchPublicCatalogPage({
      organizationId: organization.id,
      ...query,
    });

    return NextResponse.json(payload);
  } catch (error) {
    console.error('[API/Catalog/Products] Error loading public catalog:', error);
    return NextResponse.json(
      {
        error: 'No pudimos cargar el catalogo en este momento.',
        details:
          process.env.NODE_ENV === 'development'
            ? String((error as { message?: string })?.message || error)
            : undefined,
      },
      { status: 500 }
    );
  }
}
