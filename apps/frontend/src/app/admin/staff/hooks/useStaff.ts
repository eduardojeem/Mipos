'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/use-toast'
import { useCurrentOrganizationId } from '@/hooks/use-current-organization'

export type WorkingHour = { day_of_week: number; start_time: string; end_time: string }

export type StaffMember = {
  id: string
  user_id: string
  display_name: string | null
  specialty: string | null
  commission_pct: number
  color: string | null
  is_active: boolean
  walkin_only: boolean
  created_at: string
  updated_at: string
  user: { full_name: string; email: string } | null
  working_hours: WorkingHour[]
}

export type AvailableUser = { id: string; full_name: string; email: string; role: string }

export type StaffInput = {
  user_id?: string
  display_name?: string | null
  specialty?: string | null
  commission_pct: number
  color?: string | null
  is_active?: boolean
  walkin_only?: boolean
  working_hours?: WorkingHour[]
}

function orgHeaders(orgId: string, json = false): HeadersInit {
  return json
    ? { 'Content-Type': 'application/json', 'x-organization-id': orgId }
    : { 'x-organization-id': orgId }
}

async function readError(res: Response, fallback: string): Promise<string> {
  const json = await res.json().catch(() => ({}))
  return json.error || fallback
}

async function fetchStaff(orgId: string): Promise<StaffMember[]> {
  const res = await fetch('/api/staff', { headers: orgHeaders(orgId) })
  if (!res.ok) throw new Error(await readError(res, 'Error al cargar profesionales'))
  return (await res.json()).staff || []
}

async function fetchAvailableUsers(orgId: string): Promise<AvailableUser[]> {
  const res = await fetch('/api/staff/available-users', { headers: orgHeaders(orgId) })
  if (!res.ok) throw new Error(await readError(res, 'Error al cargar usuarios'))
  return (await res.json()).users || []
}

async function createStaff(orgId: string, input: StaffInput): Promise<void> {
  const res = await fetch('/api/staff', { method: 'POST', headers: orgHeaders(orgId, true), body: JSON.stringify(input) })
  if (!res.ok) throw new Error(await readError(res, 'Error al crear profesional'))
}

async function updateStaff(orgId: string, id: string, input: StaffInput): Promise<void> {
  const res = await fetch(`/api/staff/${id}`, { method: 'PUT', headers: orgHeaders(orgId, true), body: JSON.stringify(input) })
  if (!res.ok) throw new Error(await readError(res, 'Error al actualizar profesional'))
}

async function deleteStaff(orgId: string, id: string): Promise<void> {
  const res = await fetch(`/api/staff/${id}`, { method: 'DELETE', headers: orgHeaders(orgId) })
  if (!res.ok) throw new Error(await readError(res, 'Error al eliminar profesional'))
}

export function useStaff() {
  const orgId = useCurrentOrganizationId()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const staffQuery = useQuery({
    queryKey: ['staff', orgId],
    queryFn: () => fetchStaff(orgId!),
    enabled: !!orgId,
    staleTime: 30_000,
  })

  const availableUsersQuery = useQuery({
    queryKey: ['staff-available-users', orgId],
    queryFn: () => fetchAvailableUsers(orgId!),
    enabled: !!orgId,
    staleTime: 15_000,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['staff', orgId] })
    queryClient.invalidateQueries({ queryKey: ['staff-available-users', orgId] })
  }

  const createMutation = useMutation({
    mutationFn: (input: StaffInput) => createStaff(orgId!, input),
    onSuccess: () => { invalidate(); toast({ title: 'Profesional agregado' }) },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: StaffInput }) => updateStaff(orgId!, id, input),
    onSuccess: () => { invalidate(); toast({ title: 'Profesional actualizado' }) },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteStaff(orgId!, id),
    onSuccess: () => { invalidate(); toast({ title: 'Profesional eliminado' }) },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  })

  return {
    staff: staffQuery.data ?? [],
    availableUsers: availableUsersQuery.data ?? [],
    isLoading: staffQuery.isLoading,
    isError: staffQuery.isError,
    error: staffQuery.error as Error | null,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    remove: deleteMutation.mutate,
    isSaving: createMutation.isPending || updateMutation.isPending,
  }
}
