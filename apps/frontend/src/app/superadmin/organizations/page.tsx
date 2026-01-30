'use client';

import { SuperAdminGuard } from '../components/SuperAdminGuard';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Building2, 
  Plus, 
  Search, 
  MoreHorizontal,
  CreditCard,
  Activity,
  Loader2,
  Filter,
  ArrowUpDown,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useOrganizations } from '../hooks/useOrganizations';
import { Organization } from '../hooks/useAdminData';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function OrganizationsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  const { 
    organizations, 
    loading: isLoading, 
    totalCount,
    suspendOrganization,
    activateOrganization,
    deleteOrganization
  } = useOrganizations({
    filters: { 
      search: searchQuery,
      status: statusFilter !== 'ALL' ? [statusFilter] : []
    },
    sortBy: 'created_at',
    sortOrder: 'desc',
    pageSize: 100
  });

  const metrics = useMemo(() => {
    return {
      total: totalCount,
      active: organizations.filter(o => o.subscription_status === 'ACTIVE').length,
      trial: organizations.filter(o => o.subscription_status === 'TRIAL').length,
      suspended: organizations.filter(o => o.subscription_status === 'SUSPENDED').length,
    };
  }, [organizations, totalCount]);

  const getPlanBadge = (plan: string) => {
    const p = (plan || '').toUpperCase();
    switch (p) {
      case 'ENTERPRISE': return <Badge className="bg-purple-500/10 text-purple-600 border-purple-200 dark:border-purple-800 uppercase text-[10px] font-bold">Enterprise</Badge>;
      case 'PROFESSIONAL': 
      case 'PRO': return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800 uppercase text-[10px] font-bold">Professional</Badge>;
      case 'STARTER': return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800 uppercase text-[10px] font-bold">Starter</Badge>;
      case 'FREE': return <Badge className="bg-slate-500/10 text-slate-600 border-slate-200 dark:border-slate-800 uppercase text-[10px] font-bold">Gratuito</Badge>;
      default: return <Badge variant="outline" className="uppercase text-[10px] font-bold">{plan}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    switch (s) {
      case 'ACTIVE': 
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 flex gap-1.5 items-center w-fit">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Activa
          </Badge>
        );
      case 'TRIAL': 
        return (
          <Badge className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20 flex gap-1.5 items-center w-fit">
            <Clock className="w-3 h-3" />
            En Prueba
          </Badge>
        );
      case 'SUSPENDED': 
        return (
          <Badge className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20 flex gap-1.5 items-center w-fit">
            <XCircle className="w-3 h-3" />
            Suspendida
          </Badge>
        );
      default: 
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading && organizations.length === 0) {
    return (
      <SuperAdminGuard>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400 font-medium">Cargando organizaciones...</p>
          </div>
        </div>
      </SuperAdminGuard>
    );
  }

  return (
    <SuperAdminGuard>
      <div className="space-y-8 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-3 mb-2 text-purple-600 dark:text-purple-400 font-semibold tracking-wider uppercase text-xs">
              <Building2 className="h-4 w-4" />
              SaaS Administration
            </div>
            <h1 className="text-5xl font-black bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 dark:from-white dark:via-purple-200 dark:to-white bg-clip-text text-transparent">
              Organizaciones
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-3 text-lg font-medium max-w-2xl leading-relaxed">
              Supervisión global de todas las empresas en el ecosistema MiPOS.
            </p>
          </div>
          
          <Button 
            className="gap-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white shadow-xl shadow-purple-500/20 hover:shadow-purple-500/40 transition-all duration-300 h-12 px-6 rounded-xl font-bold"
            onClick={() => router.push('/superadmin/organizations/create')}
          >
            <Plus className="h-5 w-5" />
            Nueva Organización
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="backdrop-blur-xl bg-white/50 dark:bg-slate-950/50 border-slate-200/50 dark:border-slate-800/50 shadow-sm overflow-hidden group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-600 dark:text-slate-400 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30 group-hover:text-purple-600 transition-colors">
                  <Building2 className="h-5 w-5" />
                </div>
                <Badge variant="outline" className="border-slate-200 dark:border-slate-800">Total</Badge>
              </div>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white">{metrics.total}</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">Suscripciones registradas</p>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-xl bg-white/50 dark:bg-slate-950/50 border-slate-200/50 dark:border-slate-800/50 shadow-sm overflow-hidden group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-100/50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <Badge variant="outline" className="border-emerald-200 dark:border-emerald-800/50 text-emerald-600">Activas</Badge>
              </div>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white">{metrics.active}</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">Negocios en producción</p>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-xl bg-white/50 dark:bg-slate-950/50 border-slate-200/50 dark:border-slate-800/50 shadow-sm overflow-hidden group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-xl bg-blue-100/50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
                  <Clock className="h-5 w-5" />
                </div>
                <Badge variant="outline" className="border-blue-200 dark:border-blue-800/50 text-blue-600">Trial</Badge>
              </div>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white">{metrics.trial}</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">Período de prueba vigente</p>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-xl bg-white/50 dark:bg-slate-950/50 border-slate-200/50 dark:border-slate-800/50 shadow-sm overflow-hidden group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-xl bg-rose-100/50 dark:bg-rose-900/20 flex items-center justify-center text-rose-600">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <Badge variant="outline" className="border-rose-200 dark:border-rose-800/50 text-rose-600">Suspendidas</Badge>
              </div>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white">{metrics.suspended}</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">Acceso restringido</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Table */}
        <Card className="backdrop-blur-xl bg-white/80 dark:bg-slate-950/80 border-slate-200/50 dark:border-slate-800/50 shadow-2xl rounded-3xl overflow-hidden">
          <CardHeader className="p-8 border-b border-slate-100 dark:border-slate-800">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1 max-w-xl">
                <div className="relative flex-1 group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-purple-600 transition-colors" />
                  <Input 
                    placeholder="Buscar por nombre, slug o email..." 
                    className="pl-12 h-12 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl focus-visible:ring-purple-500"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-12 px-5 gap-2 rounded-2xl border-slate-200 dark:border-slate-800">
                      <Filter className="h-4 w-4" />
                      Estado: {statusFilter === 'ALL' ? 'Todos' : statusFilter}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 rounded-xl p-2">
                    <DropdownMenuLabel>Filtrar por Estado</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setStatusFilter('ALL')}>Todos</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter('ACTIVE')}>Activas</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter('TRIAL')}>En Prueba</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter('SUSPENDED')}>Suspendidas</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-slate-400 mr-2 uppercase tracking-widest">{organizations.length} Resultados</p>
                <div className="flex items-center gap-1">
                   <Button variant="ghost" size="icon" className="rounded-lg h-9 w-9"><ArrowUpDown className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
                  <TableRow className="border-slate-100 dark:border-slate-800">
                    <TableHead className="w-[300px] font-bold text-slate-500">Organización</TableHead>
                    <TableHead className="font-bold text-slate-500">Estado</TableHead>
                    <TableHead className="font-bold text-slate-500">Plan</TableHead>
                    <TableHead className="font-bold text-slate-500 text-center">Usuarios</TableHead>
                    <TableHead className="font-bold text-slate-500">Creación</TableHead>
                    <TableHead className="w-[80px] text-right font-bold text-slate-500 px-8">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organizations.map((org: Organization) => (
                    <TableRow 
                      key={org.id} 
                      className="group border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/superadmin/organizations/${org.id}`)}
                    >
                      <TableCell className="py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center text-slate-500 group-hover:scale-110 group-hover:bg-purple-500 group-hover:text-white transition-all duration-300">
                            <Building2 className="h-5 w-5" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 dark:text-white group-hover:text-purple-600 transition-colors">
                              {org.name}
                            </span>
                            <span className="text-xs font-medium text-slate-400 tracking-tight">
                              /{org.slug}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(org.subscription_status)}
                      </TableCell>
                      <TableCell>
                        {getPlanBadge(org.subscription_plan)}
                      </TableCell>
                      <TableCell className="text-center font-bold text-slate-600 dark:text-slate-400">
                        {org.organization_members?.[0]?.count || 0}
                      </TableCell>
                      <TableCell className="text-sm font-medium text-slate-500">
                        {new Date(org.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </TableCell>
                      <TableCell className="text-right px-8" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-9 w-9 p-0 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800">
                              <MoreHorizontal className="h-5 w-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52 rounded-xl p-2">
                            <DropdownMenuLabel>Acciones de Gestión</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => router.push(`/superadmin/organizations/${org.id}`)}>
                              <Activity className="mr-2 h-4 w-4" /> Detalle Completo
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/superadmin/organizations/${org.id}/billing`)}>
                              <CreditCard className="mr-2 h-4 w-4" /> Facturación
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {org.subscription_status === 'ACTIVE' ? (
                              <DropdownMenuItem className="text-rose-600" onClick={() => suspendOrganization(org.id)}>
                                <XCircle className="mr-2 h-4 w-4" /> Suspender Acceso
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem className="text-emerald-600" onClick={() => activateOrganization(org.id)}>
                                <CheckCircle2 className="mr-2 h-4 w-4" /> Activar Organización
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="text-rose-700 font-bold" onClick={() => {
                              if (confirm(`¿Estás seguro de ELIMINAR permanentemente a ${org.name}?`)) {
                                deleteOrganization(org.id);
                              }
                            }}>
                              <Plus className="mr-2 h-4 w-4 rotate-45" /> Eliminar Permanentemente
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {organizations.length === 0 && !isLoading && (
              <div className="p-20 text-center flex flex-col items-center">
                <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-6">
                  <Search className="h-10 w-10 text-slate-200" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">No se encontraron resultados</h3>
                <p className="text-slate-500 font-medium max-w-xs mx-auto">Prueba ajustando los filtros o el comando de búsqueda para encontrar lo que necesitas.</p>
                <Button variant="link" className="mt-4 text-purple-600 font-bold" onClick={() => { setSearchQuery(''); setStatusFilter('ALL'); }}>
                  Limpiar todos los filtros
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SuperAdminGuard>
  );
}
