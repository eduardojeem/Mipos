'use client';

import { useEffect, useState, useMemo } from 'react';
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
  Activity,
  Globe,
  Mail,
  Phone,
  Settings,
  ShieldCheck,
  Zap,
  XCircle,
  Clock,
  MoreVertical,
  RefreshCcw
} from 'lucide-react';
import { AdminUser } from '../../hooks/useUsers';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function OrganizationDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const { 
    organization, 
    loading: orgLoading, 
    updating: orgUpdating,
    updateOrganization,
    error: orgError,
    refresh: refreshOrg
  } = useOrganization(id);

  const {
    users,
    loading: usersLoading,
    totalCount: usersCount,
    error: usersError,
    refresh: refreshUsers
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

  const orgSettings = useMemo(() => organization?.settings as Record<string, unknown> || {}, [organization]);

  const getStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    switch (s) {
      case 'ACTIVE': 
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800 flex gap-1.5 items-center px-4 py-1.5 rounded-full"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Activa</Badge>;
      case 'TRIAL': 
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800 flex gap-1.5 items-center px-4 py-1.5 rounded-full"><Clock className="w-3.5 h-3.5" /> En Prueba</Badge>;
      case 'SUSPENDED': 
        return <Badge className="bg-rose-500/10 text-rose-600 border-rose-200 dark:border-rose-800 flex gap-1.5 items-center px-4 py-1.5 rounded-full"><XCircle className="w-3.5 h-3.5" /> Suspendida</Badge>;
      default: 
        return <Badge variant="outline" className="px-4 py-1.5 rounded-full uppercase">{status}</Badge>;
    }
  };

  if (orgLoading && !organization) {
    return (
      <SuperAdminGuard>
        <div className="flex items-center justify-center min-h-[600px] flex-col gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-purple-600" />
          <p className="text-slate-500 font-medium animate-pulse">Invocando el núcleo MiPOS...</p>
        </div>
      </SuperAdminGuard>
    );
  }

  if (orgError) {
    return (
      <SuperAdminGuard>
        <div className="flex flex-col items-center justify-center min-h-[600px] gap-6 text-center max-w-md mx-auto">
          <div className="w-20 h-20 bg-rose-50 dark:bg-rose-950/20 rounded-full flex items-center justify-center">
            <AlertTriangle className="h-10 w-10 text-rose-500" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white">Error de Conexión</h2>
            <p className="text-slate-500 mt-2">{orgError}</p>
          </div>
          <Button 
            className="w-full bg-slate-900 text-white rounded-xl h-12 font-bold gap-2"
            onClick={() => refreshOrg()}
          >
            <RefreshCcw className="h-4 w-4" /> Reintentar Sincronización
          </Button>
        </div>
      </SuperAdminGuard>
    );
  }

  if (!organization) {
    return (
      <SuperAdminGuard>
        <div className="flex flex-col items-center justify-center min-h-[600px] gap-6 text-center max-w-md mx-auto">
          <div className="w-20 h-20 bg-rose-50 dark:bg-rose-950/20 rounded-full flex items-center justify-center">
            <AlertTriangle className="h-10 w-10 text-rose-500" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white">Organización Perdida</h2>
            <p className="text-slate-500 mt-2">No pudimos encontrar el registro que buscas. Es posible que haya sido eliminada o que el ID sea incorrecto.</p>
          </div>
          <Button 
            className="w-full bg-slate-900 text-white rounded-xl h-12 font-bold"
            onClick={() => router.push('/superadmin/organizations')}
          >
            Volver al Centro de Control
          </Button>
        </div>
      </SuperAdminGuard>
    );
  }

  return (
    <SuperAdminGuard>
      <div className="space-y-8 max-w-7xl mx-auto px-4 py-8">
        {/* Navigation & Actions */}
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={() => router.push('/superadmin/organizations')}
            className="group gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 font-bold"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Control de Organizaciones
          </Button>
          
          <div className="flex items-center gap-3">
             <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-xl h-11 w-11">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl p-2">
                <DropdownMenuLabel>Acciones Especiales</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-rose-600 font-bold">
                  <XCircle className="mr-2 h-4 w-4" /> Suspender Inmediato
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <CreditCard className="mr-2 h-4 w-4" /> Historial de Pagos
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="bg-rose-50 dark:bg-rose-950/30 text-rose-700">
                  <Zap className="mr-2 h-4 w-4" /> Resetear Configuración
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button 
              className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-11 px-6 font-bold shadow-lg shadow-purple-500/20"
              onClick={handleUpdateGeneral}
              disabled={orgUpdating}
            >
              {orgUpdating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Aplicar Cambios
            </Button>
          </div>
        </div>

        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 dark:from-slate-950 dark:via-purple-950 dark:to-indigo-950 p-8 md:p-12 text-white shadow-2xl">
          <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-white/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-[2rem] bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-2xl">
                <Building2 className="h-12 w-12 md:h-16 md:w-16 text-white" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-4xl md:text-5xl font-black tracking-tight">{organization.name}</h1>
                  {getStatusBadge(organization.subscription_status)}
                </div>
                <div className="flex items-center gap-4 text-white/60 font-medium">
                  <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full text-sm">
                    <Globe className="h-3.5 w-3.5" />
                    mipos.app/{organization.slug}
                  </div>
                  <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full text-sm">
                    <Activity className="h-3.5 w-3.5" />
                    ID: {organization.id.substring(0, 8)}...
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/10 text-center min-w-[140px]">
                <Users className="h-5 w-5 text-purple-400 mx-auto mb-2" />
                <div className="text-2xl font-black">{usersCount}</div>
                <div className="text-[10px] uppercase tracking-widest text-white/50 font-bold">Usuarios Unificados</div>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/10 text-center min-w-[140px]">
                <Zap className="h-5 w-5 text-emerald-400 mx-auto mb-2" />
                <div className="text-2xl font-black">{organization.subscription_plan}</div>
                <div className="text-[10px] uppercase tracking-widest text-white/50 font-bold">Nivel de Plan</div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="vista_general" className="w-full">
          <TabsList className="bg-slate-100 dark:bg-slate-900 border-none p-1.5 rounded-2xl h-14 mb-8">
            <TabsTrigger value="vista_general" className="rounded-xl px-8 font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-md">Vista General</TabsTrigger>
            <TabsTrigger value="users" className="rounded-xl px-8 font-bold">Comunidad</TabsTrigger>
            <TabsTrigger value="billing" className="rounded-xl px-8 font-bold">Suscripción</TabsTrigger>
            <TabsTrigger value="settings" className="rounded-xl px-8 font-bold">Arquitectura</TabsTrigger>
          </TabsList>

          {/* Tab: Vista General */}
          <TabsContent value="vista_general" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 border-none shadow-sm rounded-3xl overflow-hidden bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm">
                <CardHeader className="p-8 pb-4">
                  <div className="flex items-center gap-3 text-purple-600 font-bold uppercase tracking-widest text-xs mb-2">
                    <Building2 className="h-4 w-4" /> Perfil Corporativo
                  </div>
                  <CardTitle className="text-2xl font-black">Información Esencial</CardTitle>
                </CardHeader>
                <CardContent className="p-8 pt-0 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div className="grid gap-2">
                        <Label className="text-xs uppercase font-bold text-slate-400 tracking-wider">Nombre Legal / Comercial</Label>
                        <Input 
                          value={formData.name} 
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          className="bg-slate-50 dark:bg-slate-900 border-none rounded-xl h-12 font-medium"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-xs uppercase font-bold text-slate-400 tracking-wider">Identificador único (Slug)</Label>
                        <div className="relative">
                          <Input 
                            value={formData.slug} 
                            onChange={(e) => setFormData({...formData, slug: e.target.value})}
                            className="bg-slate-50 dark:bg-slate-900 border-none rounded-xl h-12 font-medium pl-10"
                          />
                          <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-6 bg-slate-50/50 dark:bg-slate-900/50 rounded-3xl p-6 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center text-purple-600">
                          <Calendar className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Registrada en MiPOS</div>
                          <div className="text-lg font-black text-slate-700 dark:text-slate-200">
                            {new Date(organization.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center text-orange-600">
                          <Clock className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Estado del Ecosistema</div>
                          {getStatusBadge(organization.subscription_status)}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm rounded-3xl bg-gradient-to-b from-purple-50 via-white to-white dark:from-purple-950/10 dark:via-slate-950 dark:to-slate-950">
                <CardHeader className="p-8">
                  <div className="flex items-center gap-3 text-blue-600 font-bold uppercase tracking-widest text-xs mb-2">
                    <ShieldCheck className="h-4 w-4" /> Seguridad y Contacto
                  </div>
                  <CardTitle className="text-2xl font-black">Admin Contact</CardTitle>
                </CardHeader>
                <CardContent className="p-8 pt-0 space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 group">
                      <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Mail className="h-4 w-4 text-purple-600" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Corporativo</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">{(orgSettings.contactInfo as Record<string, string>)?.email || 'sin_email@mipos.app'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 group">
                      <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Phone className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Línea de Servicio</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">{(orgSettings.contactInfo as Record<string, string>)?.phone || 'No registrado'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                    <Button variant="outline" className="w-full rounded-xl gap-2 font-bold h-12">
                      <Settings className="h-4 w-4" />
                      Ver bitácora de actividad
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab: Comunidad (Users) */}
          <TabsContent value="users" className="space-y-6">
            <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-white dark:bg-slate-950">
              <CardHeader className="p-8 md:p-12 pb-6 border-b border-slate-50 dark:border-slate-800">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                      Comunidad Activa
                      <Badge className="bg-purple-600 text-white rounded-lg px-3 py-1">{usersCount}</Badge>
                    </h2>
                    <p className="text-slate-500 font-medium mt-1">Gestión de usuarios y talentos asociados a esta organización.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => refreshUsers()}
                      disabled={usersLoading}
                    >
                      <RefreshCcw className={`h-4 w-4 ${usersLoading ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button className="rounded-xl bg-slate-900 text-white hover:bg-slate-800 font-bold h-11 px-8">
                      Vincular Usuario
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {usersError ? (
                  <div className="flex justify-center p-20 flex-col items-center gap-4 text-center">
                    <AlertTriangle className="h-10 w-10 text-rose-500" />
                    <p className="text-slate-500 font-medium">{usersError}</p>
                    <Button onClick={() => refreshUsers()} variant="outline">Reintentar Carga</Button>
                  </div>
                ) : usersLoading ? (
                  <div className="flex justify-center p-20 flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-purple-200" />
                    <span className="font-bold text-slate-300 uppercase tracking-widest">Sincronizando Nómina...</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
                        <TableRow className="border-slate-100 dark:border-slate-800">
                          <TableHead className="px-12 py-6 font-bold text-slate-500 uppercase text-[10px] tracking-widest">Usuario</TableHead>
                          <TableHead className="py-6 font-bold text-slate-500 uppercase text-[10px] tracking-widest">Jerarquía</TableHead>
                          <TableHead className="py-6 font-bold text-slate-500 uppercase text-[10px] tracking-widest">Estatus</TableHead>
                          <TableHead className="py-6 font-bold text-slate-500 uppercase text-[10px] tracking-widest">Última Pulsación</TableHead>
                          <TableHead className="px-12 py-6 text-right font-bold text-slate-500 uppercase text-[10px] tracking-widest">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-24">
                              <div className="flex flex-col items-center opacity-40">
                                <Users className="h-16 w-16 mb-4" />
                                <p className="text-xl font-black tracking-tight uppercase">Vacío Cognitivo</p>
                                <p className="text-sm">No hay mentes conectadas a este nodo todavía.</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          (users as AdminUser[]).map((user) => (
                            <TableRow key={user.id} className="group hover:bg-purple-50/30 dark:hover:bg-purple-950/10 transition-colors border-slate-50 dark:border-slate-800/50">
                              <TableCell className="px-12 py-6">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center font-black text-slate-500 group-hover:bg-purple-600 group-hover:text-white transition-all">
                                    {(user.full_name || user.email)[0].toUpperCase()}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="font-bold text-slate-900 dark:text-white uppercase tracking-tight">{user.full_name || 'Sin Nombre'}</span>
                                    <span className="text-xs text-slate-400 font-mono italic">{user.email}</span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="rounded-lg px-3 py-1 font-bold uppercase text-[9px] tracking-widest border-none bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:bg-purple-100 group-hover:text-purple-600 transition-colors">
                                  {user.role}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {user.is_active ? (
                                  <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                    ONLINE
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 text-slate-400 font-bold text-xs italic">
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                    OFFLINE
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="text-xs font-bold text-slate-400 font-mono tracking-tighter">
                                {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'NUNCA'}
                              </TableCell>
                              <TableCell className="px-12 text-right">
                                <Button variant="ghost" className="h-9 w-9 p-0 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800">
                                  <MoreVertical className="h-4 w-4 text-slate-400" />
                                </Button>
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

          {/* Tab: Subscription */}
          <TabsContent value="billing" className="space-y-6">
            <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden">
              <CardHeader className="p-8 md:p-12">
                <div className="flex items-center gap-3 text-emerald-600 font-bold uppercase tracking-widest text-xs mb-2">
                  <Activity className="h-4 w-4" /> Flujo de Ingresos
                </div>
                <CardTitle className="text-3xl font-black">Plan y Salud Financiera</CardTitle>
              </CardHeader>
              <CardContent className="p-8 md:p-12 pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-8">
                      <div className="space-y-4">
                        <Label className="text-xs uppercase font-black text-slate-400 tracking-[0.2em]">Estado de Suscripción</Label>
                        <Select 
                          value={organization.subscription_status} 
                          onValueChange={handleStatusChange}
                          disabled={orgUpdating}
                        >
                          <SelectTrigger className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none px-6 font-bold text-lg">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl border-slate-100 dark:border-slate-800 shadow-2xl p-2">
                            <SelectItem value="ACTIVE" className="rounded-xl h-11">🟢 Suscripción Activa</SelectItem>
                            <SelectItem value="TRIAL" className="rounded-xl h-11">🔵 Período de Prueba</SelectItem>
                            <SelectItem value="PAST_DUE" className="rounded-xl h-11">🟠 Vencimiento Próximo</SelectItem>
                            <SelectItem value="CANCELED" className="rounded-xl h-11">🔴 Cancelada por Usuario</SelectItem>
                            <SelectItem value="SUSPENDED" className="rounded-xl h-11">⛔ Suspensión de SuperAdmin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-4">
                        <Label className="text-xs uppercase font-black text-slate-400 tracking-[0.2em]">Nivel Tecnológico (Plan)</Label>
                        <Select 
                          value={organization.subscription_plan} 
                          onValueChange={handlePlanChange}
                          disabled={orgUpdating}
                        >
                          <SelectTrigger className="h-14 rounded-2xl bg-gradient-to-r from-purple-500/5 to-blue-500/5 dark:from-purple-500/10 dark:to-blue-500/10 border-none px-6 font-bold text-lg">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl border-slate-100 dark:border-slate-800 shadow-2xl p-2">
                            <SelectItem value="FREE" className="rounded-xl h-11">SaaS MiPOS - Gratuito</SelectItem>
                            <SelectItem value="STARTER" className="rounded-xl h-11">SaaS MiPOS - Starter</SelectItem>
                            <SelectItem value="PRO" className="rounded-xl h-11">SaaS MiPOS - Professional</SelectItem>
                            <SelectItem value="PROFESSIONAL" className="rounded-xl h-11">SaaS MiPOS - Professional (Old)</SelectItem>
                            <SelectItem value="ENTERPRISE" className="rounded-xl h-11">SaaS MiPOS - Enterprise</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 blur-[60px] rounded-full group-hover:bg-purple-500/40 transition-all duration-700" />
                      <div className="relative z-10 space-y-8">
                        <div>
                          <CreditCard className="h-10 w-10 text-purple-400 mb-4" />
                          <h4 className="text-xl font-black mb-1">Nexo Stripe</h4>
                          <p className="text-slate-400 text-sm font-medium">Sincronización directa con pasarela de pagos.</p>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="text-[10px] uppercase font-bold text-white/30 tracking-widest">Customer ID Proyectado</div>
                          <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-mono text-xs overflow-hidden text-ellipsis group-hover:bg-white/10 transition-colors">
                            {orgSettings.stripeCustomerId as string || 'PENDIENTE_DE_SYNC'}
                          </div>
                        </div>

                        <div className="pt-4">
                          <Button className="w-full h-12 rounded-xl bg-white text-slate-900 font-bold hover:bg-slate-200 shadow-xl shadow-white/5">
                            Sincronizar con Stripe
                          </Button>
                        </div>
                      </div>
                    </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Architecture & Raw Settings */}
          <TabsContent value="settings" className="space-y-6">
             <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-slate-950 text-slate-300">
              <CardHeader className="p-8 md:p-12 pb-4">
                <div className="flex items-center gap-3 text-purple-400 font-bold uppercase tracking-widest text-xs mb-2">
                  <Zap className="h-4 w-4 text-purple-400" /> Matrix Configuration
                </div>
                <CardTitle className="text-2xl font-black text-white">Arquitectura de Nodo</CardTitle>
                <CardDescription className="text-slate-500 font-medium">Acceso directo al núcleo de configuración JSONB.</CardDescription>
              </CardHeader>
              <CardContent className="p-8 md:p-12 pt-0">
                <div className="bg-slate-900/50 rounded-3xl p-8 border border-white/5 font-mono text-[13px] leading-relaxed group">
                  <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-4">
                    <span className="text-emerald-500 uppercase font-black tracking-widest text-[10px]">Main Config Object</span>
                    <Button variant="ghost" size="sm" className="h-8 text-[10px] font-bold text-slate-500 hover:text-white" onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(organization.settings, null, 2));
                    }}>COPIAR ESQUEMA</Button>
                  </div>
                  <pre className="max-h-[600px] overflow-auto scrollbar-hide group-hover:text-slate-100 transition-colors">
                    {JSON.stringify(organization.settings || {}, null, 2)}
                  </pre>
                </div>
                
                <div className="mt-8 flex items-center gap-4 bg-purple-500/10 p-6 rounded-2xl border border-purple-500/20">
                  <div className="w-12 h-12 rounded-xl bg-purple-600 flex items-center justify-center text-white shrink-0 shadow-lg">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div className="text-sm">
                    <p className="font-bold text-white mb-0.5">Modo de Edición Técnica</p>
                    <p className="text-slate-400 font-medium">Los cambios aquí impactan directamente en las cuotas de usuarios y capacidades habilitadas de la organización.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </SuperAdminGuard>
  );
}
