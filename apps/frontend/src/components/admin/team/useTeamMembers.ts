'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/use-toast'
import { useCurrentOrganizationId } from '@/hooks/use-current-organization'

export type Member = {
  user_id: string
  full_name: string | null
  email: string | null
  role_id: string | null
  role_name: string | null
  is_owner: boolean
  status: string
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

export function useTeamMembers() {
  const orgId = useCurrentOrganizationId()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const membersQuery = useQuery({
    queryKey: ['team-members', orgId],
    queryFn: async (): Promise<Member[]> => {
      const res = await fetch('/api/team/members', { headers: headers(orgId!) })
      if (!res.ok) throw new Error(await readError(res, 'Error al cargar miembros'))
      return (await res.json()).members || []
    },
    enabled: !!orgId,
    staleTime: 30_000,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['team-members', orgId] })
    queryClient.invalidateQueries({ queryKey: ['team-invitations', orgId] })
  }

  const patchMutation = useMutation({
    mutationFn: async ({ userId, body }: { userId: string; body: Record<string, unknown> }) => {
      const res = await fetch(`/api/team/members/${userId}`, { method: 'PATCH', headers: headers(orgId!, true), body: JSON.stringify(body) })
      if (!res.ok) throw new Error(await readError(res, 'No se pudo actualizar'))
    },
    onSuccess: () => { invalidate(); toast({ title: 'Miembro actualizado' }) },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  })

  const removeMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/team/members/${userId}`, { method: 'DELETE', headers: headers(orgId!) })
      if (!res.ok) throw new Error(await readError(res, 'No se pudo quitar'))
    },
    onSuccess: () => { invalidate(); toast({ title: 'Miembro quitado de la empresa' }) },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  })

  const transferMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch('/api/team/transfer-ownership', { method: 'POST', headers: headers(orgId!, true), body: JSON.stringify({ user_id: userId }) })
      if (!res.ok) throw new Error(await readError(res, 'No se pudo transferir'))
    },
    onSuccess: () => { invalidate(); toast({ title: 'Propiedad transferida', description: 'Pasaste a ser Administrador.' }) },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  })

  return {
    members: membersQuery.data ?? [],
    isLoading: membersQuery.isLoading,
    changeRole: (userId: string, role_id: string) => patchMutation.mutate({ userId, body: { role_id } }),
    setStatus: (userId: string, status: string) => patchMutation.mutate({ userId, body: { status } }),
    remove: removeMutation.mutate,
    transferOwnership: transferMutation.mutate,
  }
}
