'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Crown, ShieldOff, ShieldCheck, Trash2, UserCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useAuth } from '@/hooks/use-auth'
import { useCurrentOrganizationId } from '@/hooks/use-current-organization'
import { useTeamMembers, type Member } from './useTeamMembers'

type RoleOption = { id: string; name: string; displayName: string }

function StatusBadge({ status }: { status: string }) {
  if (status === 'ACTIVE') return <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">Activo</Badge>
  if (status === 'SUSPENDED') return <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400">Suspendido</Badge>
  return <Badge variant="secondary">{status}</Badge>
}

export function TeamMembers() {
  const orgId = useCurrentOrganizationId()
  const { user } = useAuth()
  const { members, isLoading, changeRole, setStatus, remove, transferOwnership } = useTeamMembers()
  const [toTransfer, setToTransfer] = useState<Member | null>(null)

  // ¿El usuario actual es el dueño? Solo entonces puede transferir la propiedad.
  const iAmOwner = useMemo(
    () => members.some((m) => m.user_id === user?.id && m.is_owner),
    [members, user?.id],
  )

  const rolesQuery = useQuery({
    queryKey: ['roles-for-invite', orgId],
    queryFn: async (): Promise<RoleOption[]> => {
      const res = await fetch('/api/roles', { headers: { 'x-organization-id': orgId! } })
      if (!res.ok) return []
      const roles = await res.json().catch(() => [])
      return (Array.isArray(roles) ? roles : [])
        .map((r: any) => ({ id: r.id, name: r.name, displayName: r.displayName || r.name }))
        .filter((r: RoleOption) => String(r.name).toUpperCase() !== 'SUPER_ADMIN')
    },
    enabled: !!orgId,
    staleTime: 60_000,
  })
  const roles = rolesQuery.data ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Miembros del equipo</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Cargando…</p>
        ) : members.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No hay miembros.</p>
        ) : (
          <div className="space-y-2">
            {members.map((m) => {
              const isSelf = m.user_id === user?.id
              const name = m.full_name || m.email || 'Usuario'
              return (
                <div key={m.user_id} className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <UserCircle2 className="h-9 w-9 flex-shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 truncate text-sm font-medium text-foreground">
                        {name}
                        {m.is_owner && <Crown className="h-3.5 w-3.5 text-amber-500" />}
                        {isSelf && <span className="text-xs text-muted-foreground">(vos)</span>}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {m.role_name && !m.is_owner ? <Badge variant="outline">{m.role_name}</Badge> : null}
                        {m.is_owner ? <Badge variant="outline" className="border-amber-500/40 text-amber-600">Dueño</Badge> : null}
                        <StatusBadge status={m.status} />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Cambiar rol: no para el dueño ni para uno mismo */}
                    {!m.is_owner && !isSelf && (
                      <Select value={m.role_id ?? ''} onValueChange={(v) => changeRole(m.user_id, v)}>
                        <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="Cambiar rol" /></SelectTrigger>
                        <SelectContent>
                          {roles.map((r) => <SelectItem key={r.id} value={r.id}>{r.displayName}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}

                    {/* Suspender / Reactivar */}
                    {!isSelf && (
                      m.status === 'ACTIVE' ? (
                        <Button size="sm" variant="outline" className="h-8 text-amber-600" onClick={() => setStatus(m.user_id, 'SUSPENDED')}>
                          <ShieldOff className="mr-1.5 h-3.5 w-3.5" /> Suspender
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" className="h-8 text-emerald-600" onClick={() => setStatus(m.user_id, 'ACTIVE')}>
                          <ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> Reactivar
                        </Button>
                      )
                    )}

                    {/* Hacer dueño (transferir propiedad): solo el dueño actual, sobre miembros activos */}
                    {iAmOwner && !m.is_owner && !isSelf && m.status === 'ACTIVE' && (
                      <Button size="sm" variant="outline" className="h-8 text-amber-600" onClick={() => setToTransfer(m)} title="Transferir propiedad">
                        <Crown className="mr-1.5 h-3.5 w-3.5" /> Hacer dueño
                      </Button>
                    )}

                    {/* Quitar de la empresa */}
                    {!isSelf && (
                      <Button size="sm" variant="ghost" className="h-8 text-destructive hover:text-destructive" onClick={() => remove(m.user_id)} title="Quitar de la empresa">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>

      <AlertDialog open={!!toTransfer} onOpenChange={(o) => !o && setToTransfer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Transferir la propiedad?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium">{toTransfer?.full_name || toTransfer?.email}</span> pasará a ser el <span className="font-medium">dueño</span> de la empresa
              y vos quedarás como <span className="font-medium">Administrador</span>. Esta acción es difícil de revertir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-600 text-white hover:bg-amber-700"
              onClick={() => {
                if (toTransfer) {
                  transferOwnership(toTransfer.user_id)
                }
                setToTransfer(null)
              }}
            >
              Transferir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
