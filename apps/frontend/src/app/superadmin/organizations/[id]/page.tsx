'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { SuperAdminGuard } from '../../components/SuperAdminGuard';
import { useOrganization } from '../../hooks/useOrganization';
import { useUsers } from '../../hooks/useUsers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Loader2, 
  ArrowLeft, 
  Building2, 
  Save, 
  Users, 
  CreditCard, 
  AlertTriangle,
  Calendar,
  Activity
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from '@/lib/toast';

export default function OrganizationDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const { 
    organization, 
    loading: orgLoading, 
    updating: orgUpdating,
    updateOrganization 
  } = useOrganization(id);

  // Users hook with filter for this organization
  const {
    users,
    loading: usersLoading,
    totalCount: usersCount
  } = useUsers({
    filters: { organization: [id] },
    pageSize: 100
  });

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
  });

  useEffect(() => {
    if (organization) {
      setFormData({
        name: organization.name || '',
        slug: organization.slug || '',
      });
    }
  }, [organization]);

  const handleUpdateGeneral = async () => {
    await updateOrganization({
      name: formData.name,
      slug: formData.slug
    });
  };

  const handleStatusChange = async (value: string) => {
    await updateOrganization({ subscription_status: value });
  };

  const handlePlanChange = async (value: string) => {
    await updateOrganization({ subscription_plan: value });
  };

  if (orgLoading) {
    return (
      <SuperAdminGuard>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600" />
        </div>
      </SuperAdminGuard>
    );
  }

  if (!organization) {
    return (
      <SuperAdminGuard>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <AlertTriangle className="h-12 w-12 text-yellow-500" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Organización no encontrada</h2>
          <Button onClick={() => router.push('/superadmin/organizations')}>
            Volver a la lista
          </Button>
        </div>
      </SuperAdminGuard>
    );
  }

  return (
    <SuperAdminGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.push('/superadmin/organizations')}
            className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
              <Building2 className="h-8 w-8 text-purple-600" />
              {organization.name}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1 flex items-center gap-2">
              <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-sm">
                {organization.slug}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-sm">ID: {organization.id}</span>
            </p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Badge variant="outline" className={
              organization.subscription_status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-200' : 
              organization.subscription_status === 'TRIAL' ? 'bg-blue-50 text-blue-700 border-blue-200' :
              'bg-slate-50 text-slate-700 border-slate-200'
            }>
              {organization.subscription_status}
            </Badge>
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
              {organization.subscription_plan}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:w-[400px]">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="subscription">Suscripción</TabsTrigger>
            <TabsTrigger value="users">Usuarios</TabsTrigger>
            <TabsTrigger value="settings">Configuración</TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Información General</CardTitle>
                <CardDescription>
                  Detalles básicos de la organización.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nombre de la Organización</Label>
                  <Input 
                    id="name" 
                    value={formData.name} 
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="slug">Slug (Identificador URL)</Label>
                  <Input 
                    id="slug" 
                    value={formData.slug} 
                    onChange={(e) => setFormData({...formData, slug: e.target.value})}
                  />
                  <p className="text-xs text-slate-500">
                    Cambiar el slug puede afectar las URLs de acceso para esta organización.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="space-y-1">
                    <Label className="text-slate-500">Fecha de Creación</Label>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <span>{new Date(organization.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-500">Última Actualización</Label>
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-slate-400" />
                      <span>{organization.updated_at ? new Date(organization.updated_at).toLocaleDateString() : '-'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <Button onClick={handleUpdateGeneral} disabled={orgUpdating}>
                    {orgUpdating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Guardar Cambios
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subscription Tab */}
          <TabsContent value="subscription" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Plan y Suscripción</CardTitle>
                <CardDescription>
                  Gestiona el estado de la suscripción y el plan actual.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Estado de Suscripción</Label>
                    <Select 
                      value={organization.subscription_status} 
                      onValueChange={handleStatusChange}
                      disabled={orgUpdating}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Activa</SelectItem>
                        <SelectItem value="TRIAL">Prueba (Trial)</SelectItem>
                        <SelectItem value="PAST_DUE">Vencida</SelectItem>
                        <SelectItem value="CANCELED">Cancelada</SelectItem>
                        <SelectItem value="SUSPENDED">Suspendida</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Plan Actual</Label>
                    <Select 
                      value={organization.subscription_plan} 
                      onValueChange={handlePlanChange}
                      disabled={orgUpdating}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FREE">Gratuito</SelectItem>
                        <SelectItem value="STARTER">Starter</SelectItem>
                        <SelectItem value="PROFESSIONAL">Professional</SelectItem>
                        <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="rounded-lg bg-slate-50 dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Detalles de Facturación
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    ID de Cliente Stripe: <span className="font-mono ml-2">{(organization.settings as Record<string, unknown>)?.stripeCustomerId as string || 'No configurado'}</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Usuarios de la Organización</span>
                  <Badge variant="secondary">{usersCount} Usuarios</Badge>
                </CardTitle>
                <CardDescription>
                  Usuarios registrados asociados a esta organización.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Nombre</TableHead>
                          <TableHead>Rol</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Último Acceso</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                              No hay usuarios asociados a esta organización.
                            </TableCell>
                          </TableRow>
                        ) : (
                          users.map((user) => (
                            <TableRow key={user.id}>
                              <TableCell className="font-medium">{user.email}</TableCell>
                              <TableCell>{user.full_name || '-'}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{user.role}</Badge>
                              </TableCell>
                              <TableCell>
                                {user.is_active ? (
                                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">Activo</Badge>
                                ) : (
                                  <Badge variant="destructive">Inactivo</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-sm text-slate-500">
                                {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Nunca'}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Configuración Avanzada</CardTitle>
                <CardDescription>
                  Configuración técnica en formato JSON.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-slate-950 text-slate-50 p-4 rounded-lg font-mono text-sm overflow-auto max-h-[400px]">
                  <pre>{JSON.stringify(organization.settings || {}, null, 2)}</pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </SuperAdminGuard>
  );
}
