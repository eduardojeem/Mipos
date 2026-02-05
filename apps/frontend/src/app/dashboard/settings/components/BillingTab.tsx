import { useState, useEffect } from 'react';
import { Check, Zap, Crown, Building2, Sparkles, ArrowRight, AlertCircle, RefreshCw, Users, Package, MapPin, TrendingUp, Calendar, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { useSubscription, type Plan } from '@/hooks/use-subscription';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

// Mapeo de iconos y colores por slug de plan
const PLAN_STYLES: Record<string, { icon: any; color: string; bgColor: string; borderColor: string }> = {
  free: {
    icon: Sparkles,
    color: 'text-gray-600',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500/20',
  },
  basic: {
    icon: Zap,
    color: 'text-blue-600',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
  },
  starter: {
    icon: Zap,
    color: 'text-blue-600',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
  },
  professional: {
    icon: Crown,
    color: 'text-purple-600',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/20',
  },
  premium: {
    icon: Crown,
    color: 'text-purple-600',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/20',
  },
  pro: {
    icon: Crown,
    color: 'text-purple-600',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/20',
  },
  enterprise: {
    icon: Building2,
    color: 'text-amber-600',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
  },
};

export function BillingTab() {
  const { subscription, isLoading: isLoadingSubscription, changePlan, isChangingPlan } = useSubscription();
  const { toast } = useToast();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [usageStats, setUsageStats] = useState<{
    users: number;
    products: number;
    locations: number;
    transactions: number;
  } | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Obtener planes desde la API
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setIsLoadingPlans(true);
        const response = await fetch('/api/plans');
        const data = await response.json();

        if (response.ok && (data.plans || Array.isArray(data))) {
          const raw = data.plans ?? data;
          const normalized = (raw || []).map((p: any) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            priceMonthly: typeof p.priceMonthly === 'number' ? p.priceMonthly : Number(p.price_monthly ?? p.priceMonthly ?? 0),
            priceYearly: typeof p.priceYearly === 'number' ? p.priceYearly : Number(p.price_yearly ?? p.priceYearly ?? 0),
            features: p.features ?? [],
            limits: p.limits ?? {},
            description: p.description,
            currency: p.currency ?? 'USD',
            trialDays: typeof p.trialDays === 'number' ? p.trialDays : Number(p.trial_days ?? 0),
            yearlyDiscount: typeof p.yearlyDiscount === 'number'
              ? p.yearlyDiscount
              : (p.price_monthly && p.price_yearly
                  ? Math.round((1 - (p.price_yearly / 12) / p.price_monthly) * 100)
                  : 0),
          }));
          setPlans(normalized as Plan[]);
        } else {
          console.error('Error fetching plans:', data.error);
          toast({
            title: 'Error',
            description: 'No se pudieron cargar los planes disponibles',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Error fetching plans:', error);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los planes disponibles',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingPlans(false);
      }
    };

    fetchPlans();
  }, [toast]);

  // Obtener estadísticas de uso
  useEffect(() => {
    const fetchUsageStats = async () => {
      if (!subscription) {
        setIsLoadingStats(false);
        return;
      }

      try {
        setIsLoadingStats(true);
        const response = await fetch('/api/subscription/usage');
        const data = await response.json();
        
        if (response.ok && data.usage) {
          setUsageStats(data.usage);
        }
      } catch (error) {
        console.error('Error fetching usage stats:', error);
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchUsageStats();
  }, [subscription]);

  const currentPlanSlug = subscription?.plan?.slug?.toLowerCase() || 'free';
  const currentPlan = plans.find(p => p.slug?.toLowerCase() === currentPlanSlug) || subscription?.plan;

  const handleChangePlan = async (planId: string) => {
    if (!hasSubscription) {
      toast({
        title: 'Organización requerida',
        description: 'Asóciate a una organización para cambiar de plan',
        variant: 'destructive',
      });
      return;
    }
    const targetPlan = plans.find(p => p.id === planId);
    if (!targetPlan) return;

    if (targetPlan.slug?.toLowerCase() === currentPlanSlug) {
      toast({
        title: 'Plan actual',
        description: 'Ya estás en este plan',
      });
      return;
    }

    setSelectedPlan(planId);
    
    const success = await changePlan(planId, billingCycle);
    
    if (success) {
      toast({
        title: 'Plan actualizado',
        description: `Has cambiado exitosamente al plan ${targetPlan.name}`,
      });
    } else {
      toast({
        title: 'Error',
        description: 'No se pudo cambiar el plan. Intenta nuevamente.',
        variant: 'destructive',
      });
    }
    
    setSelectedPlan(null);
  };

  const getYearlyDiscount = (monthly: number, yearly: number) => {
    if (monthly === 0) return 0;
    const monthlyTotal = monthly * 12;
    const discount = ((monthlyTotal - yearly) / monthlyTotal) * 100;
    return Math.round(discount);
  };

  const getPlanStyle = (slug: string) => {
    const normalizedSlug = slug?.toLowerCase() || 'free';
    return PLAN_STYLES[normalizedSlug] || PLAN_STYLES.free;
  };

  const isLoading = isLoadingSubscription || isLoadingPlans;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Si no hay suscripción (usuario sin organización), mostrar solo los planes disponibles
  const hasSubscription = !!subscription;
  const currentPlanStyle = currentPlan ? getPlanStyle(currentPlan.slug) : getPlanStyle('free');

  return (
    <div className="space-y-8">
      {/* Current Plan Card - Solo si hay suscripción */}
      {hasSubscription && currentPlan ? (
        <Card className="border-none shadow-xl bg-gradient-to-br from-primary/5 to-transparent backdrop-blur-sm overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <div className={cn("p-2 rounded-lg", currentPlanStyle.bgColor)}>
                    <currentPlanStyle.icon className={cn("h-6 w-6", currentPlanStyle.color)} />
                  </div>
                  Plan Actual: {currentPlan.name}
                </CardTitle>
                <CardDescription className="text-base mt-2">
                  {currentPlan.description || 'Tu plan actual'}
                </CardDescription>
              </div>
              {subscription?.status && (
                <Badge 
                  variant={subscription.status === 'active' ? 'default' : 'secondary'}
                  className="px-4 py-2 text-sm font-bold"
                >
                  {subscription.status === 'active' ? 'Activo' : 
                   subscription.status === 'trialing' ? 'Prueba' :
                   subscription.status === 'cancelled' ? 'Cancelado' : 'Vencido'}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-4 rounded-2xl bg-muted/20 border">
                <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Productos
                </p>
                <p className="text-2xl font-black">
                  {currentPlan.limits?.maxProducts === -1 ? '∞' : currentPlan.limits?.maxProducts || 'N/A'}
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-muted/20 border">
                <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Usuarios
                </p>
                <p className="text-2xl font-black">
                  {currentPlan.limits?.maxUsers === -1 ? '∞' : currentPlan.limits?.maxUsers || 'N/A'}
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-muted/20 border">
                <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Sucursales
                </p>
                <p className="text-2xl font-black">
                  {currentPlan.limits?.maxLocations === -1 ? '∞' : currentPlan.limits?.maxLocations || 'N/A'}
                </p>
              </div>
            </div>

            {subscription?.currentPeriodEnd && (
              <Alert className="mt-6 bg-blue-500/5 border-blue-500/10">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-sm text-blue-800 dark:text-blue-300">
                  Tu plan se renueva el {new Date(subscription.currentPeriodEnd).toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      ) : (
        <Alert className="bg-amber-500/5 border-amber-500/10">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-sm text-amber-800 dark:text-amber-300">
            <strong>Sin organización asignada:</strong> Para acceder a los planes y suscripciones, 
            necesitas estar asociado a una organización. Contacta con tu administrador o crea una nueva organización.
          </AlertDescription>
        </Alert>
      )}

      {/* Billing Cycle Toggle */}
      <div className="flex items-center justify-center gap-4">
        <span className={cn(
          "text-sm font-semibold transition-colors",
          billingCycle === 'monthly' ? 'text-foreground' : 'text-muted-foreground'
        )}>
          Mensual
        </span>
        <button
          onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
          className={cn(
            "relative w-14 h-7 rounded-full transition-colors",
            billingCycle === 'yearly' ? 'bg-primary' : 'bg-muted'
          )}
        >
          <div className={cn(
            "absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform",
            billingCycle === 'yearly' ? 'translate-x-8' : 'translate-x-1'
          )} />
        </button>
        <span className={cn(
          "text-sm font-semibold transition-colors",
          billingCycle === 'yearly' ? 'text-foreground' : 'text-muted-foreground'
        )}>
          Anual
        </span>
        {billingCycle === 'yearly' && (
          <Badge variant="secondary" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
            Ahorra hasta 20%
          </Badge>
        )}
      </div>

      {/* Plans Grid */}
      {plans.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan, index) => {
            const isCurrentPlan = plan.slug?.toLowerCase() === currentPlanSlug;
            const priceMonthly = plan.priceMonthly || 0;
            const priceYearly = plan.priceYearly || 0;
            const price = billingCycle === 'monthly' ? priceMonthly : priceYearly;
            const displayPrice = billingCycle === 'yearly' && priceYearly > 0 ? priceYearly / 12 : price;
            const yearlyDiscount = getYearlyDiscount(priceMonthly, priceYearly);
            const isChanging = selectedPlan === plan.id && isChangingPlan;
            const planStyle = getPlanStyle(plan.slug);
            const isPopular = plan.slug?.toLowerCase() === 'professional' || plan.slug?.toLowerCase() === 'premium' || plan.slug?.toLowerCase() === 'pro';

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={cn(
                  "relative overflow-hidden transition-all duration-300 hover:shadow-2xl",
                  isPopular && "ring-2 ring-primary shadow-xl scale-105",
                  isCurrentPlan && "border-primary bg-primary/5"
                )}>
                  {isPopular && (
                    <div className="absolute top-0 right-0 bg-gradient-to-r from-primary to-purple-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                      MÁS POPULAR
                    </div>
                  )}

                  <CardHeader className="pb-4">
                    <div className={cn("p-3 rounded-xl w-fit", planStyle.bgColor)}>
                      <planStyle.icon className={cn("h-8 w-8", planStyle.color)} />
                    </div>
                    <CardTitle className="text-2xl mt-4">{plan.name}</CardTitle>
                    <CardDescription>{plan.description || 'Plan disponible'}</CardDescription>
                    
                    <div className="mt-4">
                      {displayPrice !== undefined && displayPrice !== null ? (
                        <>
                          <div className="flex items-baseline gap-1">
                            <span className="text-sm text-muted-foreground">{plan.currency || '$'}</span>
                            <span className="text-4xl font-black">
                              {displayPrice.toFixed(0)}
                            </span>
                            <span className="text-muted-foreground">/mes</span>
                          </div>
                          {billingCycle === 'yearly' && yearlyDiscount > 0 && (
                            <p className="text-xs text-green-600 dark:text-green-400 font-semibold mt-1">
                              Ahorra {yearlyDiscount}% pagando anual
                            </p>
                          )}
                        </>
                      ) : (
                        <div className="text-2xl font-black text-muted-foreground">
                          Precio no disponible
                        </div>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <ul className="space-y-3">
                      {plan.features && plan.features.length > 0 ? (
                        plan.features.map((feature, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <Check className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                            <span>{feature}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-sm text-muted-foreground">Sin características definidas</li>
                      )}
                    </ul>

                    <Button
                      onClick={() => handleChangePlan(plan.id)}
                      disabled={!hasSubscription || isCurrentPlan || isChanging}
                      className={cn(
                        "w-full mt-6",
                        isCurrentPlan && "opacity-50 cursor-not-allowed",
                        isPopular && "bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
                      )}
                    >
                      {isChanging ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Cambiando...
                        </>
                      ) : !hasSubscription ? (
                        'Requiere organización'
                      ) : isCurrentPlan ? (
                        'Plan Actual'
                      ) : (
                        <>
                          Cambiar a {plan.name}
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No hay planes disponibles en este momento. Contacta con soporte.
          </AlertDescription>
        </Alert>
      )}

      {/* Additional Info */}
      <Alert className="bg-muted/20 border-muted">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-sm">
          <strong>Nota:</strong> Los cambios de plan se aplican inmediatamente. Si cambias a un plan superior,
          se te cobrará la diferencia prorrateada. Si cambias a un plan inferior, el cambio se aplicará
          al final de tu período de facturación actual.
        </AlertDescription>
      </Alert>
    </div>
  );
}
