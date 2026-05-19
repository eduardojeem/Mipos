'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { ShieldCheck, UsersRound } from 'lucide-react'
import UserManagement from '@/components/admin/UserManagement'
import RoleManagement from '@/components/admin/RoleManagement'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

function normalizeTab(value?: string | null) {
  return value === 'roles' ? 'roles' : 'users'
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
            <h1 className="text-3xl font-semibold tracking-tight">Usuarios y Roles</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Administra miembros, estados, roles y permisos desde una seccion propia del panel.
            </p>
          </div>
        </div>
        <div className="hidden h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary sm:flex">
          <ShieldCheck className="h-6 w-6" />
        </div>
      </section>

      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="users">Usuarios</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
        </TabsList>
        <TabsContent value="users" className="mt-0">
          <UserManagement />
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
