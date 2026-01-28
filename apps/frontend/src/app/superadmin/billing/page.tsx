'use client';

import { SuperAdminGuard } from '../components/SuperAdminGuard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  DollarSign,
  TrendingUp,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import { useState, useEffect } from 'react';

interface Subscription {
  id: string;
  organization: string;
  plan: string;
  status: string;
  amount: number;
  billingCycle: string;
  nextBilling: string;
  startDate: string;
}

export default function BillingPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSubscriptions = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/superadmin/subscriptions');
        const data = await response.json();
        
        if (data.success && Array.isArray(data.subscriptions)) {
          setSubscriptions(data.subscriptions);
        }
      } catch (error) {
        console.error('Error fetching subscriptions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscriptions();
  }, []);

  // Calculate metrics
  const totalMRR = subscriptions
    .filter(s => s.status === 'active')
    .reduce((sum, s) => sum + s.amount, 0);
  
  const totalARR = totalMRR * 12;
  
  const activeSubscriptions = subscriptions.filter(s => s.status === 'active').length;
  const trialSubscriptions = subscriptions.filter(s => s.status === 'trialing').length;

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'enterprise': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'premium': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'basic': return 'bg-green-50 text-green-700 border-green-200';
      case 'trial': return 'bg-orange-50 text-orange-700 border-orange-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-50 text-green-700 border-green-200';
      case 'trialing': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'past_due': return 'bg-red-50 text-red-700 border-red-200';
      case 'cancelled': return 'bg-slate-50 text-slate-700 border-slate-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-3 w-3" />;
      case 'trialing': return <Clock className="h-3 w-3" />;
      case 'past_due': return <XCircle className="h-3 w-3" />;
      case 'cancelled': return <XCircle className="h-3 w-3" />;
      default: return null;
    }
  };

  if (isLoading) {
    return (
      <SuperAdminGuard>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
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
              <CreditCard className="h-8 w-8 text-purple-600" />
              Facturación SaaS
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Gestión de suscripciones y pagos del sistema
            </p>
          </div>
          
          <Button className="gap-2">
            <Sparkles className="h-4 w-4" />
            Crear Plan
          </Button>
        </div>

        {/* Revenue Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-purple-200 dark:border-purple-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  MRR (Ingresos Mensuales)
                </CardTitle>
                <DollarSign className="h-4 w-4 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                ${totalMRR.toLocaleString()}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-600 font-medium">+15.2%</span>
                </div>
                <span className="text-xs text-slate-500">vs mes anterior</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 dark:border-blue-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  ARR (Ingresos Anuales)
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                ${totalARR.toLocaleString()}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-600 font-medium">+12.8%</span>
                </div>
                <span className="text-xs text-slate-500">crecimiento anual</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 dark:border-green-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Suscripciones Activas
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {activeSubscriptions}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary" className="text-xs">
                  {trialSubscriptions} en prueba
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="border-orange-200 dark:border-orange-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Tasa de Conversión
                </CardTitle>
                <Sparkles className="h-4 w-4 text-orange-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                68.5%
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-600 font-medium">+5.2%</span>
                </div>
                <span className="text-xs text-slate-500">trial a pago</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Subscriptions List */}
        <Card>
          <CardHeader>
            <CardTitle>Suscripciones Activas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {subscriptions.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                      <CreditCard className="h-6 w-6 text-white" />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                          {sub.organization}
                        </h3>
                        <Badge variant="outline" className={`text-xs ${getPlanColor(sub.plan)}`}>
                          {sub.plan === 'trial' ? 'Prueba' :
                           sub.plan === 'basic' ? 'Básico' :
                           sub.plan === 'premium' ? 'Premium' : 'Enterprise'}
                        </Badge>
                        <Badge variant="outline" className={`text-xs ${getStatusColor(sub.status)}`}>
                          {getStatusIcon(sub.status)}
                          <span className="ml-1">
                            {sub.status === 'active' ? 'Activa' :
                             sub.status === 'trialing' ? 'Prueba' :
                             sub.status === 'past_due' ? 'Vencida' : 'Cancelada'}
                          </span>
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          ${sub.amount}/{sub.billingCycle === 'monthly' ? 'mes' : 'año'}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Próximo pago: {new Date(sub.nextBilling).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Desde: {new Date(sub.startDate).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      Ver Detalles
                    </Button>
                    <Button variant="outline" size="sm">
                      Facturar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </SuperAdminGuard>
  );
}
