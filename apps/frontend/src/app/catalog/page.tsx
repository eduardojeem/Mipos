import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CatalogClientOptimized from './CatalogClientOptimized';
import { normalizeCatalogQuery, type CatalogQueryRecord } from './catalog-query';
import { maybeGetCurrentOrganization } from '@/lib/organization/get-current-organization';
import { StaticBusinessConfigProvider } from '@/contexts/BusinessConfigContext';
import { getPublicBusinessConfig } from '@/lib/public-site/data';
import { fetchPublicCatalogSnapshot } from '@/lib/public-site/catalog-data';
import SectionDisabledState from '@/components/public-tenant/SectionDisabledState';

interface CatalogPageProps {
  searchParams: Promise<CatalogQueryRecord>;
}

export async function generateMetadata({ searchParams }: CatalogPageProps): Promise<Metadata> {
  const query = normalizeCatalogQuery(await searchParams);
  const organization = await maybeGetCurrentOrganization();

  if (!organization) {
    return {
      title: 'Catalogo',
      description: 'Explora el catalogo publico.',
    };
  }

  const config = await getPublicBusinessConfig(organization);
  const businessName = config.businessName || organization.name || 'Nuestra Tienda';

  let title = `Catalogo de Productos | ${businessName}`;
  if (query.search) {
    title = `${query.search} - Busqueda | ${businessName}`;
  } else if (query.categories.length === 1) {
    title = `Catalogo por Categoria | ${businessName}`;
  } else if (query.onSale) {
    title = `Catalogo en Oferta | ${businessName}`;
  }

  const description = query.search
    ? `Explora los resultados para "${query.search}" en ${businessName}.`
    : `Explora el catalogo publico de ${businessName}. Compra online con envio rapido.`;

  return {
    title,
    description,
    robots: { index: true, follow: true },
  };
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const organization = await maybeGetCurrentOrganization();
  if (!organization) {
    notFound();
  }

  const config = await getPublicBusinessConfig(organization);
  if (!config.publicSite?.sections?.showCatalog) {
    return (
      <StaticBusinessConfigProvider
        config={config}
        organizationId={organization.id}
        organizationName={organization.name}
      >
        <SectionDisabledState
          config={config}
          title="Catalogo no disponible"
          description="El catalogo publico de este negocio esta oculto en este momento desde Business Config."
        />
      </StaticBusinessConfigProvider>
    );
  }

  const initialQueryState = normalizeCatalogQuery(await searchParams);
  const snapshot = await fetchPublicCatalogSnapshot({
    organizationId: organization.id,
    ...initialQueryState,
  });

  return (
    <StaticBusinessConfigProvider
      config={config}
      organizationId={organization.id}
      organizationName={organization.name}
    >
      <CatalogClientOptimized
        initialProducts={snapshot.products}
        initialCategories={snapshot.categories}
        initialTotalProducts={snapshot.totalProducts}
        initialMaxPrice={snapshot.maxPrice}
        initialQueryState={initialQueryState}
      />
    </StaticBusinessConfigProvider>
  );
}
