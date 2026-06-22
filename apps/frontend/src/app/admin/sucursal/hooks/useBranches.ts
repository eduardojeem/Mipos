'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/use-toast'
import { useCurrentOrganizationId } from '@/hooks/use-current-organization'

export type Branch = {
  id: string
  name: string
  slug: string
  address: string | null
  phone: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type BranchStat = {
  branch_id: string
  users_assigned: number
  active_cash_sessions: number
  sales_today: number
  sales_month: number
}

export type BranchUser = {
  user_id: string
  assigned_at: string
  id?: string
  email?: string | null
  full_name?: string | null
  role?: string | null
}

export type TeamMember = {
  user_id: string
  full_name: string | null
  email: string | null
  role_id: string | null
  role_name: string | null
  is_owner: boolean
  status: string
}

export type BranchInput = {
  name: string
  address?: string | null
  phone?: string | null
  is_active?: boolean
}

export type BranchesMeta = {
  plan: string
  maxLocations: number
  currentLocations: number
  limitReached: boolean
  activeOnly: boolean
}

type BranchesResponse = {
  branches: Branch[]
  meta: BranchesMeta | null
}

type DeleteBranchResult = {
  success: boolean
  softDeleted?: boolean
  message?: string
}

function headers(orgId: string, json = false): HeadersInit {
  return json
    ? { 'Content-Type': 'application/json', 'x-organization-id': orgId }
    : { 'x-organization-id': orgId }
}

async function readError(res: Response, fallback: string): Promise<string> {
  const json = await res.json().catch(() => ({}))
  return json.message || json.error || fallback
}

async function fetchBranches(orgId: string): Promise<BranchesResponse> {
  const res = await fetch(`/api/branches?organizationId=${encodeURIComponent(orgId)}`, {
    headers: headers(orgId),
  })
  if (!res.ok) throw new Error(await readError(res, 'No se pudieron cargar sucursales'))
  const json = await res.json()
  return {
    branches: Array.isArray(json?.data) ? (json.data as Branch[]) : [],
    meta: json?.meta ?? null,
  }
}

async function fetchBranchStats(orgId: string): Promise<BranchStat[]> {
  const res = await fetch(`/api/branches/stats?organizationId=${encodeURIComponent(orgId)}`, {
    headers: headers(orgId),
  })
  if (!res.ok) throw new Error(await readError(res, 'No se pudieron cargar métricas de sucursales'))
  const json = await res.json()
  return Array.isArray(json?.data) ? (json.data as BranchStat[]) : []
}

async function fetchBranchUsers(orgId: string, branchId: string): Promise<BranchUser[]> {
  const res = await fetch(`/api/branches/${branchId}/users?organizationId=${encodeURIComponent(orgId)}`, {
    headers: headers(orgId),
  })
  if (!res.ok) throw new Error(await readError(res, 'No se pudieron cargar los usuarios asignados'))
  const json = await res.json()
  return Array.isArray(json?.data) ? (json.data as BranchUser[]) : []
}

async function fetchTeamMembers(orgId: string): Promise<TeamMember[]> {
  const res = await fetch('/api/team/members', {
    headers: headers(orgId),
  })
  if (!res.ok) throw new Error(await readError(res, 'No se pudieron cargar los miembros de la organización'))
  const json = await res.json()
  return Array.isArray(json?.members) ? (json.members as TeamMember[]) : []
}

async function createBranch(orgId: string, input: BranchInput): Promise<Branch> {
  const res = await fetch('/api/branches', {
    method: 'POST',
    headers: headers(orgId, true),
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error(await readError(res, 'No se pudo crear la sucursal'))
  const json = await res.json()
  return json.data as Branch
}

async function updateBranch(orgId: string, branchId: string, input: BranchInput): Promise<Branch> {
  const res = await fetch(`/api/branches/${branchId}`, {
    method: 'PATCH',
    headers: headers(orgId, true),
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error(await readError(res, 'No se pudo actualizar la sucursal'))
  const json = await res.json()
  return json.data as Branch
}

async function deleteBranch(orgId: string, branchId: string): Promise<DeleteBranchResult> {
  const res = await fetch(`/api/branches/${branchId}?organizationId=${encodeURIComponent(orgId)}`, {
    method: 'DELETE',
    headers: headers(orgId),
  })
  if (!res.ok) throw new Error(await readError(res, 'No se pudo eliminar la sucursal'))
  return (await res.json()) as DeleteBranchResult
}

async function assignMember(orgId: string, branchId: string, userId: string): Promise<void> {
  const res = await fetch(`/api/branches/${branchId}/users`, {
    method: 'POST',
    headers: headers(orgId, true),
    body: JSON.stringify({ user_id: userId }),
  })
  if (!res.ok) throw new Error(await readError(res, 'No se pudo asignar el miembro'))
}

async function removeMember(orgId: string, branchId: string, userId: string): Promise<void> {
  const res = await fetch(`/api/branches/${branchId}/users?user_id=${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    headers: headers(orgId),
  })
  if (!res.ok) throw new Error(await readError(res, 'No se pudo quitar el miembro de la sucursal'))
}

export function useBranches(selectedBranchId: string | null) {
  const orgId = useCurrentOrganizationId()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const branchesQuery = useQuery({
    queryKey: ['branches', orgId],
    queryFn: () => fetchBranches(orgId!),
    enabled: !!orgId,
    staleTime: 30_000,
  })

  const statsQuery = useQuery({
    queryKey: ['branches-stats', orgId],
    queryFn: () => fetchBranchStats(orgId!),
    enabled: !!orgId,
    staleTime: 30_000,
  })

  const teamMembersQuery = useQuery({
    queryKey: ['team-members', orgId],
    queryFn: () => fetchTeamMembers(orgId!),
    enabled: !!orgId,
    staleTime: 30_000,
  })

  const branchUsersQuery = useQuery({
    queryKey: ['branch-users', orgId, selectedBranchId],
    queryFn: () => fetchBranchUsers(orgId!, selectedBranchId!),
    enabled: !!orgId && !!selectedBranchId,
    staleTime: 10_000,
  })

  const invalidateBranches = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['branches', orgId] }),
      queryClient.invalidateQueries({ queryKey: ['branches-stats', orgId] }),
    ])
  }

  const createMutation = useMutation({
    mutationFn: (input: BranchInput) => createBranch(orgId!, input),
    onSuccess: async (branch) => {
      await invalidateBranches()
      toast({
        title: 'Sucursal creada',
        description: `${branch.name} ya está disponible para operar.`,
      })
    },
    onError: (error: Error) =>
      toast({
        title: 'No se pudo crear la sucursal',
        description: error.message,
        variant: 'destructive',
      }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ branchId, input }: { branchId: string; input: BranchInput }) =>
      updateBranch(orgId!, branchId, input),
    onSuccess: async (branch) => {
      await invalidateBranches()
      await queryClient.invalidateQueries({ queryKey: ['branch-users', orgId, branch.id] })
      toast({
        title: 'Sucursal actualizada',
        description: `Los cambios en ${branch.name} ya están guardados.`,
      })
    },
    onError: (error: Error) =>
      toast({
        title: 'No se pudo actualizar la sucursal',
        description: error.message,
        variant: 'destructive',
      }),
  })

  const deleteMutation = useMutation({
    mutationFn: (branchId: string) => deleteBranch(orgId!, branchId),
    onSuccess: async (result) => {
      await invalidateBranches()
      toast({
        title: result.softDeleted ? 'Sucursal desactivada' : 'Sucursal eliminada',
        description:
          result.message ||
          (result.softDeleted
            ? 'La sucursal quedó inactiva porque tiene historial operativo.'
            : 'La sucursal se eliminó correctamente.'),
      })
    },
    onError: (error: Error) =>
      toast({
        title: 'No se pudo eliminar la sucursal',
        description: error.message,
        variant: 'destructive',
      }),
  })

  const assignMutation = useMutation({
    mutationFn: ({ branchId, userId }: { branchId: string; userId: string }) => assignMember(orgId!, branchId, userId),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['branch-users', orgId, variables.branchId] }),
        queryClient.invalidateQueries({ queryKey: ['branches-stats', orgId] }),
      ])
      toast({
        title: 'Miembro asignado',
        description: 'La sucursal ya tiene el nuevo responsable o colaborador.',
      })
    },
    onError: (error: Error) =>
      toast({
        title: 'No se pudo asignar el miembro',
        description: error.message,
        variant: 'destructive',
      }),
  })

  const removeMutation = useMutation({
    mutationFn: ({ branchId, userId }: { branchId: string; userId: string }) => removeMember(orgId!, branchId, userId),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['branch-users', orgId, variables.branchId] }),
        queryClient.invalidateQueries({ queryKey: ['branches-stats', orgId] }),
      ])
      toast({
        title: 'Asignación eliminada',
        description: 'El miembro ya no opera en esta sucursal.',
      })
    },
    onError: (error: Error) =>
      toast({
        title: 'No se pudo quitar el miembro',
        description: error.message,
        variant: 'destructive',
      }),
  })

  return {
    organizationId: orgId,
    branches: branchesQuery.data?.branches ?? [],
    meta: branchesQuery.data?.meta ?? null,
    stats: statsQuery.data ?? [],
    teamMembers: teamMembersQuery.data ?? [],
    branchUsers: branchUsersQuery.data ?? [],
    isLoading:
      branchesQuery.isLoading ||
      statsQuery.isLoading ||
      teamMembersQuery.isLoading,
    isLoadingBranchUsers: branchUsersQuery.isLoading,
    isError:
      branchesQuery.isError ||
      statsQuery.isError ||
      teamMembersQuery.isError,
    error:
      (branchesQuery.error as Error | null) ||
      (statsQuery.error as Error | null) ||
      (teamMembersQuery.error as Error | null),
    refresh: invalidateBranches,
    createBranch: createMutation.mutateAsync,
    updateBranch: updateMutation.mutateAsync,
    deleteBranch: deleteMutation.mutateAsync,
    assignMember: assignMutation.mutateAsync,
    removeMember: removeMutation.mutateAsync,
    isSavingBranch: createMutation.isPending || updateMutation.isPending,
    isDeletingBranch: deleteMutation.isPending,
    isAssigningMember: assignMutation.isPending || removeMutation.isPending,
  }
}
