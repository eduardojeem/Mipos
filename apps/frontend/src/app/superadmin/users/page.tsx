'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Users, 
  Search, 
  RefreshCw, 
  Crown,
  Mail,
  Calendar,
  Clock,
  Shield,
  Building2,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { SuperAdminGuard } from '../components/SuperAdminGuard';
import { useUsers } from '../hooks/useUsers';
import { toast } from '@/lib/toast';

export default function SuperAdminUsersPage() {
  const [search, setSearch] = useState('');
  
  // Use the custom hook for data fetching
  const { 
    users, 
    loading, 
    refresh, 
    totalCount 
  } = useUsers({
    filters: { search: search },
    sortBy: 'created_at',
    sortOrder: 'desc',
    pageSize: 100 // Load more users for better visibility
  });

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
      toast.success('Usuarios actualizados');
    } catch (error) {
      toast.error('Error al actualizar usuarios');
    } finally {
      setRefreshing(false);
    }
  };

  // Stats calculation (simplified as per original code)
  const stats = {
    total: totalCount,
    withOrgs: 0,
    withoutOrgs: totalCount,
  };

  const getRoleBadge = (role: string | null) => {
    if (!role) return null;
    
    const roleConfig: Record<string, { color: string; label: string }> = {
      'SUPER_ADMIN': { color: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300', label: 'Super Admin' },
      'ADMIN': { color: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950/30 dark:text-blue-300', label: 'Admin' },
      'MANAGER': { color: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-300', label: 'Manager' },
      'CASHIER': { color: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/30 dark:text-amber-300', label: 'Cajero' },
    };

    const config = roleConfig[role] || { color: 'bg-slate-100 text-slate-700 border-slate-300', label: role };

    return (
      <Badge variant="outline" className={`text-xs ${config.color}`}>
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <SuperAdminGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 dark:from-slate-300 dark:to-slate-100 bg-clip-text text-transparent flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center shadow-lg">
                <Users className="h-7 w-7 text-white" />
              </div>
              Gestión de Usuarios
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-3 text-lg font-medium">
              Todos los usuarios del sistema SaaS
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="px-4 py-2 text-sm bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300">
              <Users className="h-4 w-4 mr-2" />
              {stats.total} usuarios
            </Badge>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="backdrop-blur-xl bg-white/95 dark:bg-slate-900/95 border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-sm font-medium text-slate-600 dark:text-slate-400">
                <div className="p-2 rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 shadow-lg">
                  <Users className="h-4 w-4 text-white" />
                </div>
                Total de Usuarios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-800 dark:text-slate-200">
                {stats.total}
              </div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-xl bg-white/95 dark:bg-slate-900/95 border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-sm font-medium text-slate-600 dark:text-slate-400">
                <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg">
                  <CheckCircle className="h-4 w-4 text-white" />
                </div>
                Con Organizaciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-800 dark:text-slate-200">
                {stats.withOrgs}
              </div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-xl bg-white/95 dark:bg-slate-900/95 border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-sm font-medium text-slate-600 dark:text-slate-400">
                <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg">
                  <XCircle className="h-4 w-4 text-white" />
                </div>
                Sin Organizaciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-800 dark:text-slate-200">
                {stats.withoutOrgs}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Table Card */}
        <Card className="backdrop-blur-xl bg-white/95 dark:bg-slate-900/95 border-slate-200 dark:border-slate-800 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 shadow-lg">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <span className="bg-gradient-to-r from-slate-700 to-slate-900 dark:from-slate-300 dark:to-slate-100 bg-clip-text text-transparent font-bold">
                    Lista de Usuarios
                  </span>
                </CardTitle>
                <CardDescription className="mt-2">
                  Gestiona y visualiza todos los usuarios del sistema
                </CardDescription>
              </div>
              <div className="flex gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Buscar usuarios..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 w-64 border-slate-300 dark:border-slate-700"
                  />
                </div>
                <Button
                  onClick={handleRefresh}
                  disabled={refreshing || loading}
                  variant="outline"
                  className="border-slate-300 dark:border-slate-700"
                >
                  {refreshing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Actualizando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Actualizar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading && users.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-slate-600" />
                <div className="text-center">
                  <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">
                    Cargando usuarios...
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Por favor espera un momento
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-900/50">
                      <TableHead className="font-semibold">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Email
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold">Nombre</TableHead>
                      <TableHead className="font-semibold">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Rol
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          Organizaciones
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Creado
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Último acceso
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow 
                        key={user.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                      >
                        <TableCell className="font-medium">{user.email}</TableCell>
                        <TableCell>{user.full_name || '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {user.role === 'SUPER_ADMIN' && (
                              <Crown className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                            )}
                            {getRoleBadge(user.role)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-slate-400 text-sm">N/A</span>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600 dark:text-slate-400">
                          {formatDate(user.created_at)}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600 dark:text-slate-400">
                          {formatDate(user.last_sign_in_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {users.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12">
                          <div className="flex flex-col items-center gap-3">
                            <Users className="h-12 w-12 text-slate-300 dark:text-slate-700" />
                            <div>
                              <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">
                                {search ? 'No se encontraron usuarios' : 'No hay usuarios'}
                              </p>
                              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                {search ? 'Intenta con otros términos de búsqueda' : 'Los usuarios aparecerán aquí cuando se registren'}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SuperAdminGuard>
  );
}
