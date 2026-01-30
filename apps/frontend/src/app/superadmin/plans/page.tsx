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
  Trash2,
  RefreshCw,
  Users,
  Package,
  ArrowRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { PlanModal } from './components/PlanModal';

interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  trial_days: number;
  features: (string | { name: string; included: boolean })[];
  limits: {
    maxUsers: number;
    maxProducts: number;
    maxTransactionsPerMonth: number;
    maxLocations: number;
  };
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  useEffect(() => {
    loadPlans();
  }, []);

  const syncPlans = async () => {
    if (!confirm('¿Deseas sincronizar los planes con los valores por defecto del sistema? Esto actualizará o creará los planes estándar.')) return;
    
    setRefreshing(true);
    try {
      const response = await fetch('/api/superadmin/plans', {
        method: 'PATCH',
      });
      if (!response.ok) throw new Error('Error al sincronizar planes');
      const data = await response.json();
      toast.success(data.message || 'Planes sincronizados');
      await loadPlans();
    } catch (error) {
      toast.error('Error al sincronizar planes');
    } finally {
      setRefreshing(false);
    }
  };

  const loadPlans = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/superadmin/plans');
      if (!response.ok) throw new Error('Error al cargar planes');
      const data = await response.json();
      setPlans(data.plans || []);
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
    
    try {
      setRefreshing(true);
      const response = await fetch(`/api/superadmin/plans?id=${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Error al eliminar plan');
      toast.success('Plan eliminado');
      await loadPlans();
    } catch (error) {
      toast.error('Error al eliminar plan');
    } finally {
      setRefreshing(false);
    }
  };

  const openEditModal = (plan: Plan) => {
    setSelectedPlan(plan);
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setSelectedPlan(null);
    setIsModalOpen(true);
  };

  const getPlanColor = (slug: string) => {
    const s = slug.toLowerCase();
    if (s.includes('free')) return 'from-slate-500 to-slate-700';
    if (s.includes('starter')) return 'from-blue-500 to-cyan-600';
    if (s.includes('professional')) return 'from-purple-500 to-indigo-600';
    if (s.includes('premium')) return 'from-fuchsia-600 to-pink-700';
    if (s.includes('enterprise')) return 'from-amber-600 to-orange-700';
    return 'from-slate-500 to-slate-600';
  };

  if (loading) {
    return (
      <SuperAdminGuard>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400 font-medium">Cargando planes del sistema...</p>
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
            <div className="flex items-center gap-3 mb-2 text-purple-600 dark:text-purple-400 font-semibold tracking-wider uppercase text-sm">
              <ShieldCheck className="h-5 w-5" />
              Super Admin Control
            </div>
            <h1 className="text-5xl font-black bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 dark:from-white dark:via-purple-200 dark:to-white bg-clip-text text-transparent flex items-center gap-4">
              Planes SaaS
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-3 text-lg font-medium max-w-2xl leading-relaxed">
              Configura los niveles de suscripción, límites de recursos y precios para todas las organizaciones en el ecosistema MiPOS.
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="gap-2 backdrop-blur-md bg-white/50 dark:bg-slate-900/50"
              onClick={syncPlans}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Sincronizar
            </Button>
            <Button
              className="gap-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white shadow-xl shadow-purple-500/20 hover:shadow-purple-500/40 transition-all duration-300"
              onClick={openCreateModal}
            >
              <Plus className="h-5 w-5" />
              Nuevo Plan
            </Button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className="group relative backdrop-blur-xl bg-white/80 dark:bg-slate-950/80 border-slate-200/50 dark:border-slate-800/50 shadow-2xl hover:shadow-purple-500/10 transition-all duration-500 hover:scale-[1.01] overflow-hidden flex flex-col h-full"
            >
              {/* Header Gradient */}
              <div className={`h-2.5 bg-gradient-to-r ${getPlanColor(plan.slug)}`} />
              
              <CardHeader className="pb-6">
                <div className="flex items-start justify-between mb-4">
                  <Badge className={`bg-gradient-to-r ${getPlanColor(plan.slug)} text-white border-0 py-1 px-3 text-xs font-bold tracking-widest uppercase shadow-md`}>
                    {plan.slug}
                  </Badge>
                  {plan.is_active ? (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 flex gap-1.5 items-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Activo
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20">
                      Inactivo
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-3xl font-black tracking-tight text-slate-800 dark:text-white leading-none">
                  {plan.name}
                </CardTitle>
                {plan.description && (
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-3 line-clamp-2 min-h-[40px]">
                    {plan.description}
                  </p>
                )}
              </CardHeader>

              <CardContent className="space-y-6 flex-1 pt-0">
                <div className="relative group/price p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50 overflow-hidden">
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-bold text-slate-400">$</span>
                      <span className="text-5xl font-black text-slate-900 dark:text-white group-hover/price:scale-110 transition-transform duration-300">
                        {plan.price_monthly}
                      </span>
                      <span className="text-sm font-semibold text-slate-400">/mes</span>
                    </div>
                    <div className="mt-3 py-1 px-4 bg-purple-100 dark:bg-purple-900/30 rounded-full text-xs font-bold text-purple-700 dark:text-purple-300">
                      Anual: ${plan.price_yearly} /año
                    </div>
                  </div>
                </div>

                {/* Resource Limits */}
                <div className="grid grid-cols-2 gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex flex-col gap-1 p-3 rounded-xl bg-slate-50/50 dark:bg-slate-900/30">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Users className="h-4 w-4" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Usuarios</span>
                    </div>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      {plan.limits?.maxUsers === -1 ? 'Ilimitados' : plan.limits?.maxUsers}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 p-3 rounded-xl bg-slate-50/50 dark:bg-slate-900/30">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Package className="h-4 w-4" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Productos</span>
                    </div>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      {plan.limits?.maxProducts === -1 ? 'Ilimitados' : plan.limits?.maxProducts}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    Características <ArrowRight className="h-3 w-3" />
                  </h4>
                  <div className="space-y-3">
                    {Array.isArray(plan.features) ? plan.features.map((feature: { name: string; included: boolean } | string, idx: number) => {
                      const name = typeof feature === 'string' ? feature : feature.name;
                      const included = typeof feature === 'string' ? true : feature.included;
                      return (
                        <div key={idx} className="flex items-start gap-3 text-sm group/feature">
                          <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${included ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                            <Check className="h-3 w-3" />
                          </div>
                          <span className={`leading-tight font-medium ${included ? 'text-slate-600 dark:text-slate-300' : 'text-slate-400 line-through'}`}>
                            {name}
                          </span>
                        </div>
                      );
                    }) : (
                      <div className="text-sm text-slate-400 italic bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl text-center flex items-center justify-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Sin características definidas
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
              
              <div className="p-6 pt-2 flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                  size="lg"
                  onClick={() => openEditModal(plan)}
                >
                  <Edit className="h-4 w-4 mr-2" /> Editar Plan
                </Button>
                <Button 
                  variant="outline" 
                  className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 border-slate-200 dark:border-slate-800 transition-all duration-300" 
                  size="icon"
                  onClick={() => deletePlan(plan.id)}
                  disabled={refreshing}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
          
          {plans.length === 0 && (
            <Card className="col-span-full p-24 text-center bg-slate-50/50 dark:bg-slate-900/20 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
              <div className="max-w-md mx-auto">
                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="h-10 w-10 text-slate-300" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">No hay planes activos</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-8">
                  Aún no has configurado ningún plan de suscripción en el sistema. Comienza creando un plan base para tus usuarios.
                </p>
                <Button 
                  size="lg"
                  className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
                  onClick={openCreateModal}
                >
                  <Plus className="h-5 w-5" /> Crear mi primer plan
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>

      <PlanModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={loadPlans}
        plan={selectedPlan}
      />
    </SuperAdminGuard>
  );
}
