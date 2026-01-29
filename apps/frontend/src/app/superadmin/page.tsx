'use client';

import React from 'react';
import { useAdminData } from '@/app/superadmin/hooks/useAdminData';
import { AdminStats } from '@/app/superadmin/components/AdminStats';
import { OrganizationsTable } from '@/app/superadmin/components/OrganizationsTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';
import { UnifiedPermissionGuard } from '@/components/auth/UnifiedPermissionGuard';

export default function SuperAdminPage() {
  const { organizations, stats, loading, error } = useAdminData();

  if (error) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Error de Acceso</AlertTitle>
          <AlertDescription>
            No se pudieron cargar los datos del panel de administración. 
            Verifique que tiene permisos de Super Admin.
            <br/>
            Detalle: {error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <UnifiedPermissionGuard role="SUPER_ADMIN" allowSuperAdmin={true}>
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Panel de Administración SaaS</h2>
        </div>
        
        {loading ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-[400px] rounded-xl" />
          </div>
        ) : (
          <div className="space-y-4">
            <AdminStats stats={stats} />
            
            <div className="grid gap-4 grid-cols-1">
              <Card>
                <CardHeader>
                  <CardTitle>Organizaciones Registradas</CardTitle>
                </CardHeader>
                <CardContent>
                  <OrganizationsTable organizations={organizations} />
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </UnifiedPermissionGuard>
  );
}
