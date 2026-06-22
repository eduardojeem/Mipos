import type { NextRequest } from 'next/server'

// Resuelve la organización en endpoints públicos (sin login): primero el header
// que setea el middleware del tenant, y como respaldo el query param. Mismo
// patrón que /api/products/public.
export function getPublicOrgId(request: NextRequest): string {
  const { searchParams } = new URL(request.url)
  return (
    request.headers.get('x-organization-id') ||
    searchParams.get('organizationId') ||
    searchParams.get('organization_id') ||
    ''
  ).trim()
}
