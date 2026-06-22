'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { KeyRound, Mail, ShieldCheck, UsersRound } from 'lucide-react'
import UserManagement from '@/components/admin/UserManagement'
import RoleManagement from '@/components/admin/RoleManagement'
import { TeamInvitations } from '@/components/admin/team/TeamInvitations'
import { TeamMembers } from '@/components/admin/team/TeamMembers'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

function normalizeTab(value?: string | null) {
  if (value === 'members') return 'members'
  if (value === 'access') return 'access'
  if (value === 'roles') return 'roles'
  if (value === 'users') return 'members'
  if (value === 'invitations') return 'access'
  return 'members'
}

function AdminUsersRolesContent() {
  const searchParams = useSearchParams()
  const defaultTab = normalizeTab(searchParams?.get('tab'))

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Badge variant="outline" className="gap-1.5">
            <UsersRound className="h-3.5 w-3.5" />
            Equipo y permisos
          </Badge>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Usuarios, acceso y roles</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Gestiona miembros, invitaciones y permisos por organización con una estructura más clara para un SaaS multi-tenant.
            </p>
          </div>
        </div>
        <div className="hidden h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary sm:flex">
          <ShieldCheck className="h-6 w-6" />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/70">
          <CardContent className="flex gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <UsersRound className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Miembros</p>
              <p className="text-sm text-muted-foreground">
                Administra estados, roles asignados y acceso operativo de las personas que ya pertenecen a la empresa.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardContent className="flex gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Mail className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Acceso e invitaciones</p>
              <p className="text-sm text-muted-foreground">
                Invita nuevas personas, controla asientos del plan y resuelve cambios sensibles como suspensión o transferencia de propiedad.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardContent className="flex gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <KeyRound className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Roles y permisos</p>
              <p className="text-sm text-muted-foreground">
                Distingue roles base del sistema y roles personalizados por organización para no mezclar gobierno global con operación local.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3">
          <TabsTrigger value="members">Miembros</TabsTrigger>
          <TabsTrigger value="access">Acceso e invitaciones</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
        </TabsList>
        <TabsContent value="members" className="mt-0">
          <UserManagement />
        </TabsContent>
        <TabsContent value="access" className="mt-0 space-y-6">
          <TeamMembers />
          <TeamInvitations />
        </TabsContent>
        <TabsContent value="roles" className="mt-0">
          <RoleManagement />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function AdminUsersRolesPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-3xl" />}>
      <AdminUsersRolesContent />
    </Suspense>
  )
}
