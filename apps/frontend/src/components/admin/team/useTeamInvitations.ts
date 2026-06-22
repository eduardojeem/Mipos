'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/use-toast'
import { useCurrentOrganizationId } from '@/hooks/use-current-organization'

export type Invitation = {
  id: string
  email: string
  role_id: string | null
  role_name: string | null
  status: string
  expires_at: string
  created_at: string
}

export type Seats = {
  used: number
  limit: number
  unlimited: boolean
  available: number
  activeMembers: number
  pendingInvites: number
}

export type RoleOption = { id: string; name: string; displayName: string; isSystem?: boolean }

function headers(orgId: string, json = false): HeadersInit {
  return json
    ? { 'Content-Type': 'application/json', 'x-organization-id': orgId }
    : { 'x-organization-id': orgId }
}

async function readError(res: Response, fallback: string): Promise<string> {
  const json = await res.json().catch(() => ({}))
  return json.message || json.error || fallback
}

export function useTeamInvitations() {
  const orgId = useCurrentOrganizationId()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const invitesQuery = useQuery({
    queryKey: ['team-invitations', orgId],
    queryFn: async (): Promise<{ invitations: Invitation[]; seats: Seats | null }> => {
      const res = await fetch('/api/team/invitations', { headers: headers(orgId!) })
      if (!res.ok) throw new Error(await readError(res, 'Error al cargar invitaciones'))
      const json = await res.json()
      return { invitations: json.invitations || [], seats: json.seats || null }
    },
    enabled: !!orgId,
    staleTime: 30_000,
  })

  const rolesQuery = useQuery({
    queryKey: ['roles-for-invite', orgId],
    queryFn: async (): Promise<RoleOption[]> => {
      const res = await fetch('/api/roles', { headers: headers(orgId!) })
      if (!res.ok) return []
      const roles = await res.json().catch(() => [])
      return (Array.isArray(roles) ? roles : [])
        .map((r: any) => ({ id: r.id, name: r.name, displayName: r.displayName || r.name, isSystem: r.isSystem }))
        .filter((r: RoleOption) => String(r.name).toUpperCase() !== 'SUPER_ADMIN')
    },
    enabled: !!orgId,
    staleTime: 120_000,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['team-invitations', orgId] })

  const inviteMutation = useMutation({
    mutationFn: async (input: { email: string; role_id: string }): Promise<string> => {
      const res = await fetch('/api/team/invitations', { method: 'POST', headers: headers(orgId!, true), body: JSON.stringify(input) })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.message || json.error || 'No se pudo invitar')
      return json.inviteUrl as string
    },
    onSuccess: () => { invalidate(); toast({ title: 'Invitación creada' }) },
    onError: (err: Error) => toast({ title: 'No se pudo invitar', description: err.message, variant: 'destructive' }),
  })

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/team/invitations/${id}`, { method: 'DELETE', headers: headers(orgId!) })
      if (!res.ok) throw new Error(await readError(res, 'Error al revocar'))
    },
    onSuccess: () => { invalidate(); toast({ title: 'Invitación revocada' }) },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  })

  const resendMutation = useMutation({
    mutationFn: async (id: string): Promise<string> => {
      const res = await fetch(`/api/team/invitations/${id}`, { method: 'POST', headers: headers(orgId!, true) })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.message || json.error || 'Error al reenviar')
      return json.inviteUrl as string
    },
    onSuccess: () => { invalidate(); toast({ title: 'Invitación renovada' }) },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  })

  return {
    invitations: invitesQuery.data?.invitations ?? [],
    seats: invitesQuery.data?.seats ?? null,
    roles: rolesQuery.data ?? [],
    isLoading: invitesQuery.isLoading,
    invite: inviteMutation.mutateAsync,
    revoke: revokeMutation.mutate,
    resend: resendMutation.mutateAsync,
    isInviting: inviteMutation.isPending,
  }
}
