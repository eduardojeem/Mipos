import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import OffersClient from './OffersClient';
import { normalizeOfferQuery, type OfferQueryRecord } from './offers-query';
import { maybeGetCurrentOrganization } from '@/lib/organization/get-current-organization';
import { StaticBusinessConfigProvider } from '@/contexts/BusinessConfigContext';
import { getPublicBusinessConfig } from '@/lib/public-site/data';
import SectionDisabledState from '@/components/public-tenant/SectionDisabledState';
import {
  fetchPublicOffersCarouselSnapshot,
  fetchPublicOffersSnapshot,
} from '@/lib/public-site/offers-data';

interface OffersPageProps {
  searchParams: Promise<OfferQueryRecord>;
}

export async function generateMetadata({ searchParams }: OffersPageProps): Promise<Metadata> {
  const organization = await maybeGetCurrentOrganization();

  if (!organization) {
    return {
      title: 'Ofertas',
      description: 'Ofertas publicas activas.',
    };
  }

  const config = await getPublicBusinessConfig(organization);
  const businessName = config.businessName || organization.name || 'Nuestra Tienda';
  const query = normalizeOfferQuery(await searchParams);

  let title = `Ofertas y Promociones | ${businessName}`;
  if (query.search) {
    title = `${query.search} | Ofertas de ${businessName}`;
  } else if (query.status === 'upcoming') {
    title = `Proximas ofertas | ${businessName}`;
  } else if (query.status === 'ended') {
    title = `Ofertas finalizadas | ${businessName}`;
  }

  const description = query.search
    ? `Explora ofertas relacionadas con "${query.search}" en ${businessName}.`
    : `Descubre promociones publicas y productos con descuento en ${businessName}.`;

  return {
    title,
    description,
    robots: { index: true, follow: true },
  };
}

export default async function OffersPage({ searchParams }: OffersPageProps) {
  const organization = await maybeGetCurrentOrganization();
  if (!organization) {
    notFound();
  }

  const config = await getPublicBusinessConfig(organization);
  if (!config.publicSite?.sections?.showOffers) {
    return (
      <StaticBusinessConfigProvider
        config={config}
        organizationId={organization.id}
        organizationName={organization.name}
      >
        <SectionDisabledState
          config={config}
          title="Ofertas no disponibles"
          description="Este negocio desactivo temporalmente la seccion publica de ofertas desde Business Config."
        />
      </StaticBusinessConfigProvider>
    );
  }

  const initialQueryState = normalizeOfferQuery(await searchParams);
  const [snapshot, carouselSnapshot] = await Promise.all([
    fetchPublicOffersSnapshot(organization.id, initialQueryState),
    fetchPublicOffersCarouselSnapshot(organization.id),
  ]);

  return (
    <StaticBusinessConfigProvider
      config={config}
      organizationId={organization.id}
      organizationName={organization.name}
    >
      <OffersClient
        initialOffers={snapshot.offers}
        initialCategories={snapshot.categories}
        initialCarouselItems={carouselSnapshot.items}
        initialPagination={snapshot.pagination}
        initialQueryState={initialQueryState}
      />
    </StaticBusinessConfigProvider>
  );
}
