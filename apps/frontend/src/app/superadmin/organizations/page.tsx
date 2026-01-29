'use client';

import { SuperAdminGuard } from '../components/SuperAdminGuard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Building2, 
  Plus, 
  Search, 
  MoreHorizontal,
  Users,
  Calendar,
  CreditCard,
  Activity,
  Loader2
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/lib/toast';
import { createClient } from '@/lib/supabase/client';

interface Organization {
  id: string;
  name: string;
  slug: string;
  subscription_plan: 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE' | 'PRO';
  subscription_status: 'ACTIVE' | 'TRIAL' | 'PAST_DUE' | 'CANCELED';
  settings: {
    contactInfo?: {
      email?: string;
    };
    limits?: {
      maxUsers?: number;
    };
  };
  created_at: string;
  updated_at: string;
}

export default function OrganizationsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    const supabase = createClient();
    
    try {
      setIsLoading(true);
      
      // Fetch organizations - simplified without member count
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }

      setOrganizations(data || []);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      const errorMessage = error instanceof Error ? error.message : 'No se pudieron cargar las organizaciones. Por favor intenta nuevamente.';
      toast.error('Error al cargar organizaciones', {
        description: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredOrganizations = organizations.filter(org =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'ENTERPRISE': return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800';
      case 'PROFESSIONAL': 
      case 'PRO': return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800';
      case 'STARTER': return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800';
      case 'FREE': return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-800';
      default: return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800';
      case 'TRIAL': return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800';
      case 'PAST_DUE': return 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-300 dark:border-yellow-800';
      case 'CANCELED': return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800';
      default: return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700';
    }
  };

  const getPlanLabel = (plan: string) => {
    const labels: Record<string, string> = {
      'FREE': 'Gratuito',
      'STARTER': 'Starter',
      'PROFESSIONAL': 'Professional',
      'PRO': 'Professional',
      'ENTERPRISE': 'Enterprise',
    };
    return labels[plan] || plan;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'ACTIVE': 'Activa',
      'TRIAL': 'Prueba',
      'PAST_DUE': 'Vencida',
      'CANCELED': 'Cancelada',
    };
    return labels[status] || status;
  };

  const getMemberCount = (org: Organization) => {
    // Return 0 since we don't have organization_members table
    return 0;
  };

  if (isLoading) {
    return (
      <SuperAdminGuard>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400">Cargando organizaciones...</p>
          </div>
        </div>
      </SuperAdminGuard>
    );
  }

  return (
    <SuperAdminGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/50">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              Gestión de Organizaciones
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Administra todas las organizaciones del sistema SaaS
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-300 px-4 py-2">
              {filteredOrganizations.length} organizaciones
            </Badge>
            <Button 
              className="gap-2 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              onClick={() => router.push('/superadmin/organizations/create')}
            >
              <Plus className="h-4 w-4" />
              Nueva Organización
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <Card className="backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar organizaciones por nombre o slug..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border-slate-300 dark:border-slate-700"
                />
              </div>
              <Button variant="outline" className="border-slate-300 dark:border-slate-700">
                Filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Organizations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrganizations.map((org) => (
            <Card key={org.id} className="backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 via-pink-500 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/50">
                      <Building2 className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{org.name}</CardTitle>
                      <p className="text-sm text-slate-500 dark:text-slate-400">/{org.slug}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Status and Plan */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={`text-xs ${getStatusColor(org.subscription_status)}`}>
                    {getStatusLabel(org.subscription_status)}
                  </Badge>
                  <Badge variant="outline" className={`text-xs ${getPlanColor(org.subscription_plan)}`}>
                    {getPlanLabel(org.subscription_plan)}
                  </Badge>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-600 dark:text-slate-300">{getMemberCount(org)} usuarios</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-600 dark:text-slate-300">
                      {new Date(org.created_at).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>

                {/* Last Activity */}
                <div className="flex items-center gap-2 text-sm">
                  <Activity className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-600 dark:text-slate-300">
                    Actualizada: {new Date(org.updated_at).toLocaleDateString('es-ES')}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 border-slate-300 dark:border-slate-700"
                    onClick={() => router.push(`/superadmin/organizations/${org.id}`)}
                  >
                    Ver Detalles
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 border-slate-300 dark:border-slate-700"
                    onClick={() => router.push(`/superadmin/organizations/${org.id}/billing`)}
                  >
                    <CreditCard className="h-4 w-4 mr-1" />
                    Facturación
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {filteredOrganizations.length === 0 && !isLoading && (
          <Card className="backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 shadow-xl">
            <CardContent className="p-12 text-center">
              <Building2 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-slate-800 dark:text-slate-200">No se encontraron organizaciones</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-4">
                {searchQuery ? 'Intenta con otros términos de búsqueda' : 'Aún no hay organizaciones registradas'}
              </p>
              <Button 
                className="gap-2 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                onClick={() => router.push('/superadmin/organizations/create')}
              >
                <Plus className="h-4 w-4" />
                Crear Primera Organización
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </SuperAdminGuard>
  );
}