import type { Metadata } from 'next'
import { resolveRequestTenantContext } from '@/lib/domain/request-tenant'
import { getPublicBusinessConfig } from '@/lib/public-site/data'
import { normalizeVertical } from '@/config/verticals'
import { StaticBusinessConfigProvider } from '@/contexts/BusinessConfigContext'
import { BookingWizard } from './BookingWizard'

export const metadata: Metadata = {
  title: 'Reservar turno',
  description: 'Reservá tu turno online.',
}

export default async function ReservarPage() {
  const context = await resolveRequestTenantContext()

  if (context.kind !== 'tenant') {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <h1 className="text-xl font-semibold text-foreground">Reservá tu turno</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta página de reservas pertenece a una barbería específica. Entrá desde el sitio de la barbería para reservar.
        </p>
      </div>
    )
  }

  const config = await getPublicBusinessConfig(context.organization)
  const vertical = normalizeVertical(context.organization.vertical)

  return (
    <StaticBusinessConfigProvider
      config={config}
      organizationId={context.organization.id}
      organizationName={context.organization.name}
    >
      <BookingWizard
        organizationId={context.organization.id}
        orgName={context.organization.name}
        config={config}
        vertical={vertical}
      />
    </StaticBusinessConfigProvider>
  )
}
