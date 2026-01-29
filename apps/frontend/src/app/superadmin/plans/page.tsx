'use client';

import { useState, useEffect } from 'react';
import { SuperAdminGuard } from '../components/SuperAdminGuard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  Plus,
  Edit,
  Check,
  Loader2,
  Trash2
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { createClient } from '@/lib/supabase/client';

interface Plan {
  id: string;
  name: string;
  slug: string;
  price_monthly: number;
  price_yearly: number;
  features: string[] | unknown;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    setLoading(true);
    const supabase = createClient();

    try {
      const { data, error } = await supabase
        .from('saas_plans')
        .select('*')
        .order('price_monthly', { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error loading plans:', error);
      toast.error('Error al cargar planes', {
        description: error instanceof Error ? error.message : 'Error desconocido'
      });
    } finally {
      setLoading(false);
    }
  };

  const deletePlan = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este plan?')) return;
    
    const supabase = createClient();
    try {
      setRefreshing(true);
      const { error } = await supabase.from('saas_plans').delete().eq('id', id);
      if (error) throw error;
      toast.success('Plan eliminado');
      await loadPlans();
    } catch (error) {
      toast.error('Error al eliminar plan');
    } finally {
      setRefreshing(false);
    }
  };

  const getPlanColor = (slug: string) => {
    switch (slug) {
      case 'basic': return 'from-blue-500 to-indigo-600';
      case 'premium': return 'from-purple-500 to-pink-600';
      case 'enterprise': return 'from-amber-500 to-orange-600';
      default: return 'from-slate-500 to-slate-600';
    }
  };

  if (loading) {
    return (
      <SuperAdminGuard>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400">Cargando planes...</p>
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
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 flex items-center justify-center shadow-2xl shadow-purple-500/50">
                <Sparkles className="h-7 w-7 text-white" />
              </div>
              Planes de Suscripción
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-3 text-lg font-medium">
              Gestiona los planes de precio del sistema SaaS
            </p>
          </div>
          
          <Button
            className="gap-2 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white shadow-lg"
          >
            <Plus className="h-4 w-4" />
            Nuevo Plan
          </Button>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className="backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] overflow-hidden flex flex-col"
            >
              <div className={`h-2 bg-gradient-to-r ${getPlanColor(plan.slug)}`} />
              
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between mb-2">
                  <Badge className={`bg-gradient-to-r ${getPlanColor(plan.slug)} text-white border-0`}>
                    {plan.slug.toUpperCase()}
                  </Badge>
                  {plan.is_active ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Activo</Badge>
                  ) : (
                    <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">Inactivo</Badge>
                  )}
                </div>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
              </CardHeader>

              <CardContent className="space-y-4 flex-1">
                <div className="text-center py-4 border-y border-slate-100 dark:border-slate-800">
                  <div className="text-4xl font-bold font-mono">
                    ${plan.price_monthly}
                    <span className="text-sm font-normal text-muted-foreground ml-1">/mes</span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Anual: ${plan.price_yearly}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Características</h4>
                  <div className="space-y-1">
                    {Array.isArray(plan.features) ? plan.features.map((feature: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500" />
                        <span>{feature}</span>
                      </div>
                    )) : (
                      <div className="text-sm text-muted-foreground italic">Sin características definidas</div>
                    )}
                  </div>
                </div>
              </CardContent>
              
              <div className="p-6 pt-0 flex gap-2">
                <Button variant="outline" className="flex-1" size="sm">
                  <Edit className="h-4 w-4 mr-2" /> Editar
                </Button>
                <Button 
                  variant="outline" 
                  className="text-red-500 hover:text-red-700 hover:bg-red-50" 
                  size="sm"
                  onClick={() => deletePlan(plan.id)}
                  disabled={refreshing}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
          
          {plans.length === 0 && (
            <Card className="col-span-full p-12 text-center bg-slate-50 border-dashed">
              <p className="text-muted-foreground">No hay planes configurados en la tabla &apos;saas_plans&apos;.</p>
            </Card>
          )}
        </div>
      </div>
    </SuperAdminGuard>
  );
}
