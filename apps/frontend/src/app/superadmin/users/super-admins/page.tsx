'use client';

import { useEffect, useMemo, useState } from 'react';
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
  Crown, 
  Search, 
  RefreshCw, 
  Mail,
  Calendar,
  Clock,
  Shield,
  Loader2,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { SuperAdminGuard } from '../../components/SuperAdminGuard';
import { createClient } from '@/lib/supabase/client';
import { toast } from '@/lib/toast';

type SuperAdminUser = {
  id: string;
  email: string;
  full_name: string | null;
  role: string | null;
  created_at: string;
  last_sign_in_at: string | null;
};

export default function SuperAdminsPage() {
  const [users, setUsers] = useState<SuperAdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u =>
      (u.email || '').toLowerCase().includes(q) ||
      (u.full_name || '').toLowerCase().includes(q)
    );
  }, [users, search]);

  const loadSuperAdmins = async (isRefresh = false) => {
    const supabase = createClient();
    
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      // Fetch only SUPER_ADMIN users
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name, role, created_at, last_sign_in_at')
        .eq('role', 'SUPER_ADMIN')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setUsers(data || []);

      if (isRefresh) {
        toast.success('Super Admins actualizados', {
          description: `Se han cargado ${data?.length || 0} super administradores`
        });
      }
    } catch (error) {
      console.error('Error loading super admins:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast.error('Error al cargar super admins', {
        description: errorMessage
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSuperAdmins();
  }, []);

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

  const getRelativeTime = (dateString: string | null) => {
    if (!dateString) return null;
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;
    if (diffDays < 365) return `Hace ${Math.floor(diffDays / 30)} meses`;
    return `Hace ${Math.floor(diffDays / 365)} años`;
  };

  return (
    <SuperAdminGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 bg-clip-text text-transparent flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 via-pink-600 to-orange-600 flex items-center justify-center shadow-2xl shadow-purple-500/50 animate-pulse">
                <Crown className="h-7 w-7 text-white" />
              </div>
              Super Administradores
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-3 text-lg font-medium">
              Usuarios con acceso total al sistema
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge className="px-4 py-2 text-sm bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 text-white border-0 shadow-lg">
              <Crown className="h-4 w-4 mr-2" />
              {users.length} Super Admins
            </Badge>
          </div>
        </div>

        {/* Alert Info */}
        <Card className="backdrop-blur-xl bg-gradient-to-r from-purple-50/80 to-pink-50/80 dark:from-purple-950/30 dark:to-pink-950/30 border-purple-200/50 dark:border-purple-800/50 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-purple-500/20 backdrop-blur-sm">
                <AlertCircle className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold text-purple-900 dark:text-purple-300 text-lg mb-1">
                  ¿Qué es un Super Admin?
                </h3>
                <p className="text-sm text-purple-700 dark:text-purple-400">
                  Los Super Administradores tienen acceso completo al sistema, incluyendo la gestión de organizaciones, 
                  usuarios globales, configuraciones del sistema y pueden acceder a cualquier organización sin restricciones.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Table Card */}
        <Card className="backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 shadow-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/50">
                    <Shield className="h-5 w-5 text-white" />
                  </div>
                  <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent font-bold">
                    Lista de Super Admins
                  </span>
                </CardTitle>
                <CardDescription className="mt-2">
                  Usuarios con privilegios máximos en la plataforma
                </CardDescription>
              </div>
              <div className="flex gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Buscar super admins..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 w-64 border-slate-300 dark:border-slate-700"
                  />
                </div>
                <Button
                  onClick={() => loadSuperAdmins(true)}
                  disabled={refreshing}
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
            {loading ? (
              <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-purple-600" />
                <div className="text-center">
                  <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">
                    Cargando super admins...
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
                    <TableRow className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30">
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
                    {filtered.map((user) => {
                      const lastSignInRelative = getRelativeTime(user.last_sign_in_at);
                      const isRecentlyActive = user.last_sign_in_at && 
                        new Date(user.last_sign_in_at).getTime() > Date.now() - (7 * 24 * 60 * 60 * 1000);

                      return (
                        <TableRow 
                          key={user.id}
                          className="hover:bg-purple-50/50 dark:hover:bg-purple-950/20 transition-colors"
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Crown className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                              {user.email}
                            </div>
                          </TableCell>
                          <TableCell>
                            {user.full_name ? (
                              <div className="flex items-center gap-2">
                                <span>{user.full_name}</span>
                                {isRecentlyActive && (
                                  <Sparkles className="h-3 w-3 text-green-600 dark:text-green-400" />
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 shadow-md">
                              <Crown className="h-3 w-3 mr-1" />
                              Super Admin
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            <div className="text-slate-600 dark:text-slate-400">
                              {formatDate(user.created_at)}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {user.last_sign_in_at ? (
                              <div className="flex flex-col">
                                <span className="text-slate-600 dark:text-slate-400">
                                  {formatDate(user.last_sign_in_at)}
                                </span>
                                {lastSignInRelative && (
                                  <span className={`text-xs ${isRecentlyActive ? 'text-green-600 dark:text-green-400' : 'text-slate-400'}`}>
                                    {lastSignInRelative}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400">Nunca</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filtered.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12">
                          <div className="flex flex-col items-center gap-3">
                            <Crown className="h-12 w-12 text-slate-300 dark:text-slate-700" />
                            <div>
                              <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">
                                {search ? 'No se encontraron super admins' : 'No hay super admins'}
                              </p>
                              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                {search ? 'Intenta con otros términos de búsqueda' : 'Los super administradores aparecerán aquí'}
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

        {/* Footer Info */}
        <Card className="backdrop-blur-xl bg-slate-50/80 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
              <Shield className="h-4 w-4" />
              <p>
                <strong className="text-slate-700 dark:text-slate-300">Nota:</strong> Solo los Super Admins pueden ver esta página. 
                Para convertir un usuario en Super Admin, actualiza su rol directamente en la base de datos.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </SuperAdminGuard>
  );
}
