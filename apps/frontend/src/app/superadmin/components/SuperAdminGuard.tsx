'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, AlertTriangle, ArrowLeft } from 'lucide-react';

interface SuperAdminGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function SuperAdminGuard({ children, fallback }: SuperAdminGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin');
    }
  }, [user, loading, router]);

  // Mostrar loading mientras se verifica la autenticación
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
        <Card className="w-96">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-white animate-pulse" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Verificando permisos...</h3>
            <p className="text-slate-500 dark:text-slate-400">
              Validando acceso de super administrador
            </p>
            <div className="mt-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Si no hay usuario, no mostrar nada (se redirigirá)
  if (!user) {
    return null;
  }

  // Verificar si es super admin
  const userRole = user.role;
  const isSuperAdmin = userRole === 'SUPER_ADMIN';

  if (!isSuperAdmin) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
        <Card className="w-96">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-red-600 dark:text-red-400">
              Acceso Denegado
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              No tienes permisos de super administrador para acceder a esta sección.
            </p>
            <div className="space-y-3">
              <Button 
                onClick={() => router.push('/dashboard')}
                className="w-full gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver al Dashboard
              </Button>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Rol actual: {userRole || 'No definido'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}