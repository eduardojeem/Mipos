type CountClient = {
  from: (table: string) => {
    select: (
      columns: string,
      options?: { count?: 'exact'; head?: boolean }
    ) => {
      eq: (
        column: string,
        value: string
      ) => Promise<{ count: number | null; error: { message?: string } | null }>
    }
  }
}

export type VerticalLockReason = {
  table: string
  label: string
  count: number
}

export type VerticalLockStatus = {
  locked: boolean
  canChange: boolean
  reasons: VerticalLockReason[]
  message: string | null
}

const OPERATIONAL_TABLES: Array<{ table: string; label: string }> = [
  { table: 'products', label: 'productos' },
  { table: 'sales', label: 'ventas' },
  { table: 'services', label: 'servicios' },
  { table: 'appointments', label: 'turnos' },
  { table: 'staff_profiles', label: 'profesionales' },
]

function buildLockStatus(reasons: VerticalLockReason[], canOverride: boolean): VerticalLockStatus {
  const locked = reasons.length > 0

  return {
    locked,
    canChange: !locked || canOverride,
    reasons,
    message: locked
      ? 'El tipo de negocio queda bloqueado porque la empresa ya tiene datos operativos.'
      : null,
  }
}

export async function getVerticalLockStatus(
  client: CountClient,
  organizationId: string,
  options: { canOverride?: boolean } = {}
): Promise<VerticalLockStatus> {
  const checks = await Promise.all(
    OPERATIONAL_TABLES.map(async ({ table, label }) => {
      const { count, error } = await client
        .from(table)
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)

      if (error) {
        return { table, label: `validacion de ${label}`, count: 1 }
      }

      return { table, label, count: count || 0 }
    })
  )

  return buildLockStatus(
    checks.filter((item) => item.count > 0),
    Boolean(options.canOverride)
  )
}
