'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/use-toast'
import { useCurrentOrganizationId } from '@/hooks/use-current-organization'
import { invalidateOrgCache } from '@/hooks/use-user-organizations'
import { DEFAULT_VERTICAL, normalizeVertical, type BusinessVertical } from '@/config/verticals'

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

type OrgVerticalResponse = {
  vertical: BusinessVertical
  lock: VerticalLockStatus
}

const DEFAULT_LOCK: VerticalLockStatus = {
  locked: false,
  canChange: true,
  reasons: [],
  message: null,
}

function normalizeLock(value: unknown): VerticalLockStatus {
  if (!value || typeof value !== 'object') return DEFAULT_LOCK

  const raw = value as Partial<VerticalLockStatus>
  const reasons = Array.isArray(raw.reasons)
    ? raw.reasons
        .map((reason) => ({
          table: String((reason as Partial<VerticalLockReason>).table || ''),
          label: String((reason as Partial<VerticalLockReason>).label || ''),
          count: Number((reason as Partial<VerticalLockReason>).count || 0),
        }))
        .filter((reason) => reason.table && reason.label && reason.count > 0)
    : []
  const locked = Boolean(raw.locked || reasons.length > 0)

  return {
    locked,
    canChange: typeof raw.canChange === 'boolean' ? raw.canChange : !locked,
    reasons,
    message: typeof raw.message === 'string' ? raw.message : null,
  }
}

async function fetchOrgVertical(orgId: string): Promise<OrgVerticalResponse> {
  const res = await fetch('/api/organizations/vertical', {
    headers: { 'x-organization-id': orgId },
    cache: 'no-store',
  })
  if (!res.ok) return { vertical: DEFAULT_VERTICAL, lock: DEFAULT_LOCK }

  const json = await res.json().catch(() => ({}))
  return {
    vertical: normalizeVertical(json?.vertical),
    lock: normalizeLock(json?.lock),
  }
}

async function updateOrgVertical(orgId: string, vertical: BusinessVertical): Promise<OrgVerticalResponse> {
  const res = await fetch('/api/organizations/vertical', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-organization-id': orgId },
    body: JSON.stringify({ vertical }),
  })
  const json = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(json.error || 'Error al actualizar el tipo de negocio')
  }

  return {
    vertical: normalizeVertical(json?.vertical),
    lock: normalizeLock(json?.lock),
  }
}

export function useVertical() {
  const orgId = useCurrentOrganizationId()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const verticalQuery = useQuery({
    queryKey: ['org-vertical', orgId],
    queryFn: () => fetchOrgVertical(orgId!),
    enabled: !!orgId,
    staleTime: 30_000,
  })

  const updateMutation = useMutation({
    mutationFn: (vertical: BusinessVertical) => updateOrgVertical(orgId!, vertical),
    onSuccess: () => {
      invalidateOrgCache()
      queryClient.invalidateQueries({ queryKey: ['org-vertical', orgId] })
      toast({
        title: 'Tipo de negocio actualizado',
        description: 'Los modulos del panel se ajustaron al nuevo rubro.',
      })
    },
    onError: (err: Error) => {
      toast({ title: 'Error al guardar', description: err.message, variant: 'destructive' })
    },
  })

  return {
    vertical: verticalQuery.data?.vertical ?? DEFAULT_VERTICAL,
    lock: verticalQuery.data?.lock ?? DEFAULT_LOCK,
    isLoading: verticalQuery.isLoading,
    isSaving: updateMutation.isPending,
    updateVertical: (v: BusinessVertical) => updateMutation.mutate(v),
  }
}
