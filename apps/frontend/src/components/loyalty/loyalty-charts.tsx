'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Users,
  Star,
  Gift,
  Calendar,
  Target
} from 'lucide-react';
import { useLoyaltyAnalytics } from '@/hooks/use-loyalty';

interface LoyaltyChartsProps {
  className?: string;
}

export function LoyaltyCharts({ className }: LoyaltyChartsProps) {
  // const { data: analytics, isLoading, error } = useLoyaltyAnalytics('default-program-id');

  // Datos mock para las visualizaciones
  const mockAnalytics = {
    membershipGrowth: [
      { month: 'Ene', members: 850, newMembers: 45 },
      { month: 'Feb', members: 920, newMembers: 70 },
      { month: 'Mar', members: 1050, newMembers: 130 },
      { month: 'Abr', members: 1180, newMembers: 130 },
      { month: 'May', members: 1247, newMembers: 67 }
    ],
    pointsActivity: [
      { month: 'Ene', issued: 8500, redeemed: 4200 },
      { month: 'Feb', issued: 9200, redeemed: 4800 },
      { month: 'Mar', issued: 10500, redeemed: 5100 },
      { month: 'Abr', issued: 11800, redeemed: 5900 },
      { month: 'May', issued: 12400, redeemed: 6200 }
    ],
    tierProgression: [
      { tier: 'Bronze', current: 249, previous: 280, change: -11.1 },
      { tier: 'Silver', current: 436, previous: 410, change: 6.3 },
      { tier: 'Gold', current: 561, previous: 520, change: 7.9 }
    ],
    topRewards: [
      { name: '10% Descuento', redemptions: 234, percentage: 35.2 },
      { name: 'Envío Gratis', redemptions: 123, percentage: 18.5 },
      { name: 'Producto Gratis', redemptions: 89, percentage: 13.4 },
      { name: 'Cashback 5%', redemptions: 67, percentage: 10.1 },
      { name: 'Experiencia VIP', redemptions: 45, percentage: 6.8 }
    ],
    engagementMetrics: {
      activeRate: 71.5,
      redemptionRate: 51.4,
      retentionRate: 84.2,
      avgPointsPerMember: 156
    },
    monthlyTrends: {
      totalRevenue: 45600,
      loyaltyRevenue: 18240,
      loyaltyPercentage: 40,
      avgOrderValue: 67.50,
      loyaltyAOV: 89.30
    }
  };

  const currentAnalytics = mockAnalytics; // analytics || mockAnalytics;

  // if (isLoading) {
  //   return (
  //     <div className={`grid gap-6 md:grid-cols-2 ${className}`}>
  //       {[...Array(4)].map((_, i) => (
  //         <Card key={i}>
  //           <CardHeader className="animate-pulse">
  //             <div className="h-4 bg-gray-200 rounded w-3/4"></div>
  //             <div className="h-32 bg-gray-200 rounded mt-4"></div>
  //           </CardHeader>
  //         </Card>
  //       ))}
  //     </div>
  //   );
  // }

  // if (error) {
  //   return (
  //     <Card className={className}>
  //       <CardContent className="p-6">
  //         <p className="text-red-600">Error al cargar los análisis de lealtad</p>
  //       </CardContent>
  //     </Card>
  //   );
  // }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Métricas de Engagement */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Tasa de Actividad
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentAnalytics.engagementMetrics.activeRate}%</div>
            <Progress value={currentAnalytics.engagementMetrics.activeRate} className="mt-2 h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Miembros activos este mes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              Tasa de Canje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentAnalytics.engagementMetrics.redemptionRate}%</div>
            <Progress value={currentAnalytics.engagementMetrics.redemptionRate} className="mt-2 h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Puntos canjeados vs emitidos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Star className="h-4 w-4" />
              Retención
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentAnalytics.engagementMetrics.retentionRate}%</div>
            <Progress value={currentAnalytics.engagementMetrics.retentionRate} className="mt-2 h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Miembros retenidos 90 días
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Puntos Promedio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentAnalytics.engagementMetrics.avgPointsPerMember}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Por miembro activo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos principales */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Crecimiento de Membresía */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Crecimiento de Membresía
            </CardTitle>
            <CardDescription>Evolución de miembros en los últimos 5 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {currentAnalytics.membershipGrowth.map((data, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 text-sm font-medium">{data.month}</div>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Total: {data.members}</span>
                        <span className="text-green-600">+{data.newMembers}</span>
                      </div>
                      <Progress 
                        value={(data.members / 1300) * 100} 
                        className="h-2"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Actividad de Puntos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Actividad de Puntos
            </CardTitle>
            <CardDescription>Puntos emitidos vs canjeados por mes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {currentAnalytics.pointsActivity.map((data, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between text-sm font-medium">
                    <span>{data.month}</span>
                    <span>Ratio: {((data.redeemed / data.issued) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Emitidos: {data.issued.toLocaleString()}</span>
                      <span className="text-blue-600">100%</span>
                    </div>
                    <Progress value={100} className="h-2 bg-blue-100" />
                    <div className="flex justify-between text-xs">
                      <span>Canjeados: {data.redeemed.toLocaleString()}</span>
                      <span className="text-green-600">{((data.redeemed / data.issued) * 100).toFixed(1)}%</span>
                    </div>
                    <Progress 
                      value={(data.redeemed / data.issued) * 100} 
                      className="h-2"
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Análisis detallado */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Progresión de Tiers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Progresión de Tiers</CardTitle>
            <CardDescription>Cambios en distribución de niveles</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentAnalytics.tierProgression.map((tier, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    tier.tier === 'Gold' ? 'bg-yellow-500' :
                    tier.tier === 'Silver' ? 'bg-gray-400' : 'bg-amber-600'
                  }`}></div>
                  <div>
                    <div className="font-medium">{tier.tier}</div>
                    <div className="text-sm text-muted-foreground">{tier.current} miembros</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`flex items-center gap-1 text-sm ${
                    tier.change > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {tier.change > 0 ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {tier.change > 0 ? '+' : ''}{tier.change}%
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Top Recompensas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recompensas Populares</CardTitle>
            <CardDescription>Más canjeadas este mes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {currentAnalytics.topRewards.map((reward, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full">
                    <span className="text-xs font-medium text-blue-600">#{index + 1}</span>
                  </div>
                  <div>
                    <div className="text-sm font-medium">{reward.name}</div>
                    <div className="text-xs text-muted-foreground">{reward.redemptions} canjes</div>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {reward.percentage}%
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Impacto en Ventas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Impacto en Ventas</CardTitle>
            <CardDescription>Contribución del programa de lealtad</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Ingresos Totales:</span>
                <span className="font-medium">${currentAnalytics.monthlyTrends.totalRevenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>De Miembros Leales:</span>
                <span className="font-medium text-green-600">
                  ${currentAnalytics.monthlyTrends.loyaltyRevenue.toLocaleString()}
                </span>
              </div>
              <Progress 
                value={currentAnalytics.monthlyTrends.loyaltyPercentage} 
                className="h-2"
              />
              <div className="text-center text-xs text-muted-foreground">
                {currentAnalytics.monthlyTrends.loyaltyPercentage}% de ingresos totales
              </div>
            </div>

            <div className="pt-4 border-t space-y-2">
              <div className="flex justify-between text-sm">
                <span>AOV General:</span>
                <span className="font-medium">${currentAnalytics.monthlyTrends.avgOrderValue}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>AOV Miembros:</span>
                <span className="font-medium text-blue-600">${currentAnalytics.monthlyTrends.loyaltyAOV}</span>
              </div>
              <div className="text-center text-xs text-green-600">
                +{(((currentAnalytics.monthlyTrends.loyaltyAOV - currentAnalytics.monthlyTrends.avgOrderValue) / currentAnalytics.monthlyTrends.avgOrderValue) * 100).toFixed(1)}% mayor AOV
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumen de Tendencias */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Resumen de Tendencias
          </CardTitle>
          <CardDescription>Indicadores clave de rendimiento del programa</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">+12.5%</div>
              <div className="text-sm text-muted-foreground">Crecimiento mensual</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">71.5%</div>
              <div className="text-sm text-muted-foreground">Miembros activos</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">$89.30</div>
              <div className="text-sm text-muted-foreground">AOV miembros</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">84.2%</div>
              <div className="text-sm text-muted-foreground">Tasa retención</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}