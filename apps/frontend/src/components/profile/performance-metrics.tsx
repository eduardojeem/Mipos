'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  Target, 
  Star, 
  Calendar,
  DollarSign,
  Users,
  ShoppingCart,
  Award,
  Edit3,
  Save,
  X,
  ArrowUp,
  ArrowDown,
  Minus,
  BarChart3,
  Heart,
  Zap,
  Trophy
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

interface SalesGoal {
  monthly: number;
  quarterly: number;
  annual: number;
}

interface CustomerSatisfaction {
  rating: number;
  totalReviews: number;
  responseRate: number;
}

interface MonthlyTrend {
  month: string;
  sales: number;
  transactions: number;
  customers: number;
  satisfaction: number;
}

interface PerformanceMetrics {
  salesGoals: SalesGoal;
  currentSales: {
    monthly: number;
    quarterly: number;
    annual: number;
  };
  customerSatisfaction: CustomerSatisfaction;
  monthlyTrends: MonthlyTrend[];
  achievements: Array<{
    title: string;
    description: string;
    date: string;
    type: 'sales' | 'customer' | 'efficiency' | 'team';
  }>;
  kpis: {
    averageTransactionValue: number;
    conversionRate: number;
    customerRetention: number;
    productivityScore: number;
  };
}

interface PerformanceMetricsProps {
  initialData?: Partial<PerformanceMetrics>;
  onUpdate: (data: Partial<PerformanceMetrics>) => Promise<boolean>;
  isLoading?: boolean;
}

const generateMockTrends = (): MonthlyTrend[] => {
  const trends: MonthlyTrend[] = [];
  for (let i = 5; i >= 0; i--) {
    const date = subMonths(new Date(), i);
    const monthName = format(date, 'MMM yyyy', { locale: es });
    trends.push({
      month: monthName,
      sales: Math.floor(Math.random() * 50000) + 20000,
      transactions: Math.floor(Math.random() * 200) + 100,
      customers: Math.floor(Math.random() * 150) + 80,
      satisfaction: Math.floor(Math.random() * 20) + 80
    });
  }
  return trends;
};

const defaultMetrics: PerformanceMetrics = {
  salesGoals: {
    monthly: 50000,
    quarterly: 150000,
    annual: 600000
  },
  currentSales: {
    monthly: 42500,
    quarterly: 127500,
    annual: 510000
  },
  customerSatisfaction: {
    rating: 4.6,
    totalReviews: 234,
    responseRate: 92
  },
  monthlyTrends: generateMockTrends(),
  achievements: [
    {
      title: 'Top Vendedor del Mes',
      description: 'Superó las metas de ventas mensuales por 3 meses consecutivos',
      date: '2024-01-15',
      type: 'sales'
    },
    {
      title: 'Excelencia en Servicio',
      description: 'Mantuvo una calificación de satisfacción superior a 4.5 estrellas',
      date: '2024-01-10',
      type: 'customer'
    },
    {
      title: 'Eficiencia Operativa',
      description: 'Procesó el mayor número de transacciones del equipo',
      date: '2024-01-05',
      type: 'efficiency'
    }
  ],
  kpis: {
    averageTransactionValue: 125.50,
    conversionRate: 68.5,
    customerRetention: 85.2,
    productivityScore: 92.3
  }
};

export function PerformanceMetrics({ initialData, onUpdate, isLoading = false }: PerformanceMetricsProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>(defaultMetrics);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editableGoals, setEditableGoals] = useState<SalesGoal>(defaultMetrics.salesGoals);

  useEffect(() => {
    if (initialData) {
      setMetrics(prev => ({ ...prev, ...initialData }));
      if (initialData.salesGoals) {
        setEditableGoals(initialData.salesGoals);
      }
    }
  }, [initialData]);

  const handleSaveGoals = async () => {
    setIsSaving(true);
    try {
      const success = await onUpdate({ salesGoals: editableGoals });
      if (success) {
        setMetrics(prev => ({ ...prev, salesGoals: editableGoals }));
        setIsEditing(false);
        toast.success('Objetivos de ventas actualizados correctamente');
      }
    } catch (error) {
      toast.error('Error al actualizar los objetivos');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditableGoals(metrics.salesGoals);
    setIsEditing(false);
  };

  const calculateProgress = (current: number, goal: number) => {
    return Math.min((current / goal) * 100, 100);
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <ArrowUp className="h-4 w-4 text-green-500" />;
    if (current < previous) return <ArrowDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getAchievementIcon = (type: string) => {
    switch (type) {
      case 'sales': return <DollarSign className="h-4 w-4" />;
      case 'customer': return <Users className="h-4 w-4" />;
      case 'efficiency': return <TrendingUp className="h-4 w-4" />;
      case 'team': return <Award className="h-4 w-4" />;
      default: return <Star className="h-4 w-4" />;
    }
  };

  const getAchievementColor = (type: string) => {
    switch (type) {
      case 'sales': return 'bg-green-100 text-green-800';
      case 'customer': return 'bg-blue-100 text-blue-800';
      case 'efficiency': return 'bg-purple-100 text-purple-800';
      case 'team': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-xl text-gray-800">Métricas de Rendimiento</CardTitle>
                <CardDescription className="text-gray-600">
                  Cargando datos de rendimiento...
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-4 bg-white/60 rounded-lg animate-pulse" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card with KPIs Overview */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl text-gray-800">Métricas de Rendimiento</CardTitle>
                <CardDescription className="text-gray-600">
                  Seguimiento de objetivos y análisis de desempeño
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* KPIs Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="h-4 w-4 text-green-600" />
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  +12%
                </Badge>
              </div>
              <div className="text-2xl font-bold text-gray-800">
                ${metrics.kpis.averageTransactionValue.toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">Valor Promedio</div>
            </div>

            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Target className="h-4 w-4 text-blue-600" />
                </div>
                <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                  +8%
                </Badge>
              </div>
              <div className="text-2xl font-bold text-gray-800">
                {metrics.kpis.conversionRate}%
              </div>
              <div className="text-sm text-gray-600">Conversión</div>
            </div>

            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Heart className="h-4 w-4 text-purple-600" />
                </div>
                <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                  +5%
                </Badge>
              </div>
              <div className="text-2xl font-bold text-gray-800">
                {metrics.kpis.customerRetention}%
              </div>
              <div className="text-sm text-gray-600">Retención</div>
            </div>

            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Zap className="h-4 w-4 text-orange-600" />
                </div>
                <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                  +15%
                </Badge>
              </div>
              <div className="text-2xl font-bold text-gray-800">
                {metrics.kpis.productivityScore}%
              </div>
              <div className="text-sm text-gray-600">Productividad</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Metrics Tabs */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <Tabs defaultValue="goals" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 bg-gray-100 p-1 rounded-xl">
              <TabsTrigger 
                value="goals" 
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg transition-all"
              >
                <Target className="h-4 w-4 mr-2" />
                Objetivos
              </TabsTrigger>
              <TabsTrigger 
                value="satisfaction"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg transition-all"
              >
                <Star className="h-4 w-4 mr-2" />
                Satisfacción
              </TabsTrigger>
              <TabsTrigger 
                value="trends"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg transition-all"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Tendencias
              </TabsTrigger>
              <TabsTrigger 
                value="achievements"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg transition-all"
              >
                <Trophy className="h-4 w-4 mr-2" />
                Logros
              </TabsTrigger>
            </TabsList>

            {/* Objetivos de Ventas */}
            <TabsContent value="goals" className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Target className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Objetivos de Ventas</h3>
                    <p className="text-sm text-gray-600">Progreso hacia las metas establecidas</p>
                  </div>
                </div>
                {!isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 hover:bg-blue-50 hover:border-blue-200"
                  >
                    <Edit3 className="h-4 w-4" />
                    Editar
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Objetivo Mensual */}
                <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-emerald-50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2 text-green-700">
                      <Calendar className="h-4 w-4" />
                      Mensual
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isEditing ? (
                      <div className="space-y-3">
                        <Label htmlFor="monthly-goal" className="text-sm font-medium">Objetivo ($)</Label>
                        <Input
                          id="monthly-goal"
                          type="number"
                          value={editableGoals.monthly}
                          onChange={(e) => setEditableGoals(prev => ({ 
                            ...prev, 
                            monthly: Number(e.target.value) 
                          }))}
                          className="border-green-200 focus:border-green-400"
                        />
                      </div>
                    ) : (
                      <>
                        <div className="text-2xl font-bold text-gray-800 mb-1">
                          ${metrics.currentSales.monthly.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-600 mb-3">
                          de ${metrics.salesGoals.monthly.toLocaleString()}
                        </div>
                        <Progress 
                          value={calculateProgress(metrics.currentSales.monthly, metrics.salesGoals.monthly)} 
                          className="h-2 bg-green-100"
                        />
                        <div className="text-xs text-gray-500 mt-2">
                          {calculateProgress(metrics.currentSales.monthly, metrics.salesGoals.monthly).toFixed(1)}% completado
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Objetivo Trimestral */}
                <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-cyan-50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2 text-blue-700">
                      <BarChart3 className="h-4 w-4" />
                      Trimestral
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isEditing ? (
                      <div className="space-y-3">
                        <Label htmlFor="quarterly-goal" className="text-sm font-medium">Objetivo ($)</Label>
                        <Input
                          id="quarterly-goal"
                          type="number"
                          value={editableGoals.quarterly}
                          onChange={(e) => setEditableGoals(prev => ({ 
                            ...prev, 
                            quarterly: Number(e.target.value) 
                          }))}
                          className="border-blue-200 focus:border-blue-400"
                        />
                      </div>
                    ) : (
                      <>
                        <div className="text-2xl font-bold text-gray-800 mb-1">
                          ${metrics.currentSales.quarterly.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-600 mb-3">
                          de ${metrics.salesGoals.quarterly.toLocaleString()}
                        </div>
                        <Progress 
                          value={calculateProgress(metrics.currentSales.quarterly, metrics.salesGoals.quarterly)} 
                          className="h-2 bg-blue-100"
                        />
                        <div className="text-xs text-gray-500 mt-2">
                          {calculateProgress(metrics.currentSales.quarterly, metrics.salesGoals.quarterly).toFixed(1)}% completado
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Objetivo Anual */}
                <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50 to-indigo-50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2 text-purple-700">
                      <Trophy className="h-4 w-4" />
                      Anual
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isEditing ? (
                      <div className="space-y-3">
                        <Label htmlFor="annual-goal" className="text-sm font-medium">Objetivo ($)</Label>
                        <Input
                          id="annual-goal"
                          type="number"
                          value={editableGoals.annual}
                          onChange={(e) => setEditableGoals(prev => ({ 
                            ...prev, 
                            annual: Number(e.target.value) 
                          }))}
                          className="border-purple-200 focus:border-purple-400"
                        />
                      </div>
                    ) : (
                      <>
                        <div className="text-2xl font-bold text-gray-800 mb-1">
                          ${metrics.currentSales.annual.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-600 mb-3">
                          de ${metrics.salesGoals.annual.toLocaleString()}
                        </div>
                        <Progress 
                          value={calculateProgress(metrics.currentSales.annual, metrics.salesGoals.annual)} 
                          className="h-2 bg-purple-100"
                        />
                        <div className="text-xs text-gray-500 mt-2">
                          {calculateProgress(metrics.currentSales.annual, metrics.salesGoals.annual).toFixed(1)}% completado
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              {isEditing && (
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSaveGoals}
                    disabled={isSaving}
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                  >
                    <Save className="h-4 w-4" />
                    {isSaving ? 'Guardando...' : 'Guardar'}
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* Satisfacción del Cliente */}
            <TabsContent value="satisfaction" className="space-y-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Star className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Satisfacción del Cliente</h3>
                  <p className="text-sm text-gray-600">Métricas de calidad del servicio</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-0 shadow-md bg-gradient-to-br from-yellow-50 to-orange-50">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        <Star className="h-5 w-5 text-yellow-600" />
                      </div>
                      <Badge className="bg-yellow-100 text-yellow-700">
                        Excelente
                      </Badge>
                    </div>
                    <div className="text-3xl font-bold text-gray-800 mb-1">
                      {metrics.customerSatisfaction.rating}
                    </div>
                    <div className="text-sm text-gray-600 mb-3">
                      Calificación promedio
                    </div>
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < Math.floor(metrics.customerSatisfaction.rating)
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-cyan-50">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Users className="h-5 w-5 text-blue-600" />
                      </div>
                      <Badge className="bg-blue-100 text-blue-700">
                        +23
                      </Badge>
                    </div>
                    <div className="text-3xl font-bold text-gray-800 mb-1">
                      {metrics.customerSatisfaction.totalReviews}
                    </div>
                    <div className="text-sm text-gray-600">
                      Reseñas totales
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-emerald-50">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Heart className="h-5 w-5 text-green-600" />
                      </div>
                      <Badge className="bg-green-100 text-green-700">
                        +5%
                      </Badge>
                    </div>
                    <div className="text-3xl font-bold text-gray-800 mb-1">
                      {metrics.customerSatisfaction.responseRate}%
                    </div>
                    <div className="text-sm text-gray-600 mb-3">
                      Tasa de respuesta
                    </div>
                    <Progress 
                      value={metrics.customerSatisfaction.responseRate} 
                      className="h-2 bg-green-100"
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Tendencias Mensuales */}
            <TabsContent value="trends" className="space-y-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Tendencias Mensuales</h3>
                  <p className="text-sm text-gray-600">Evolución de métricas clave</p>
                </div>
              </div>

              <div className="space-y-4">
                {metrics.monthlyTrends.map((trend, index) => {
                  const previousTrend = metrics.monthlyTrends[index - 1];
                  return (
                    <Card key={trend.month} className="border-0 shadow-md hover:shadow-lg transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-semibold text-gray-800">{trend.month}</h4>
                          <Badge variant="outline" className="text-xs">
                            {trend.transactions} transacciones
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center">
                            <div className="flex items-center justify-center mb-2">
                              <DollarSign className="h-4 w-4 text-green-600 mr-1" />
                              {previousTrend && getTrendIcon(trend.sales, previousTrend.sales)}
                            </div>
                            <div className="text-lg font-bold text-gray-800">
                              ${trend.sales.toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-600">Ventas</div>
                          </div>
                          
                          <div className="text-center">
                            <div className="flex items-center justify-center mb-2">
                              <Users className="h-4 w-4 text-blue-600 mr-1" />
                              {previousTrend && getTrendIcon(trend.customers, previousTrend.customers)}
                            </div>
                            <div className="text-lg font-bold text-gray-800">
                              {trend.customers}
                            </div>
                            <div className="text-xs text-gray-600">Clientes</div>
                          </div>
                          
                          <div className="text-center">
                            <div className="flex items-center justify-center mb-2">
                              <Star className="h-4 w-4 text-yellow-600 mr-1" />
                              {previousTrend && getTrendIcon(trend.satisfaction, previousTrend.satisfaction)}
                            </div>
                            <div className="text-lg font-bold text-gray-800">
                              {trend.satisfaction}%
                            </div>
                            <div className="text-xs text-gray-600">Satisfacción</div>
                          </div>
                          
                          <div className="text-center">
                            <div className="flex items-center justify-center mb-2">
                              <ShoppingCart className="h-4 w-4 text-purple-600 mr-1" />
                            </div>
                            <div className="text-lg font-bold text-gray-800">
                              ${(trend.sales / trend.transactions).toFixed(0)}
                            </div>
                            <div className="text-xs text-gray-600">Ticket Promedio</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            {/* Logros */}
            <TabsContent value="achievements" className="space-y-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Trophy className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Logros y Reconocimientos</h3>
                  <p className="text-sm text-gray-600">Hitos alcanzados y metas superadas</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {metrics.achievements.map((achievement, index) => (
                  <Card key={index} className="border-0 shadow-md hover:shadow-lg transition-all duration-200">
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <div className={`p-3 rounded-xl ${getAchievementColor(achievement.type)}`}>
                          {getAchievementIcon(achievement.type)}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-800 mb-2">
                            {achievement.title}
                          </h4>
                          <p className="text-sm text-gray-600 mb-3">
                            {achievement.description}
                          </p>
                          <div className="flex items-center justify-between">
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getAchievementColor(achievement.type)} border-current`}
                            >
                              {achievement.type === 'sales' && 'Ventas'}
                              {achievement.type === 'customer' && 'Cliente'}
                              {achievement.type === 'efficiency' && 'Eficiencia'}
                              {achievement.type === 'team' && 'Equipo'}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {format(new Date(achievement.date), 'dd MMM yyyy', { locale: es })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}