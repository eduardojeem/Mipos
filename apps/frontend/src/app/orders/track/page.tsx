 import { notFound } from 'next/navigation';
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            import { StaticBusinessConfigProvider } from '@/contexts/BusinessConfigContext';
import { maybeGetCurrentOrganization } from '@/lib/organization/get-current-organization';
import { getPublicBusinessConfig } from '@/lib/public-site/data';
import TrackOrderClient from './TrackOrderClient';
import SectionDisabledState from '@/components/public-tenant/SectionDisabledState';

export const dynamic = 'force-dynamic';

export default async function TrackOrderPage() {
  const organization = await maybeGetCurrentOrganization();
  if (!organization) {
    notFound();
  }

  const config = await getPublicBusinessConfig(organization);

  if (!config.publicSite?.sections?.showOrderTracking) {
    return (
      <StaticBusinessConfigProvider
        config={config}
        organizationId={organization.id}
        organizationName={organization.name}
      >
        <SectionDisabledState
          config={config}
          title="Seguimiento no disponible"
          description="El seguimiento público de pedidos fue desactivado para este tenant."
        />
      </StaticBusinessConfigProvider>
    );
  }

  return (
    <StaticBusinessConfigProvider
      config={config}
      organizationId={organization.id}
      organizationName={organization.name}
    >
      <TrackOrderClient />
    </StaticBusinessConfigProvider>
  );
}
