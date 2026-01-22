'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  Trophy, 
  Star, 
  TrendingUp, 
  TrendingDown,
  Target,
  Zap,
  Award,
  Gift,
  DollarSign,
  Calendar,
  BarChart3
} from 'lucide-react';
// import { useLoyaltyStats } from '@/hooks/use-loyalty';

interface LoyaltyStatsProps {
  className?: string;
}

export function LoyaltyStats({ className }: LoyaltyStatsProps) {
  // const { data: stats, isLoading, error } = useLoyaltyStats();

  // Datos mock mientras se implementa la API
  const mockStats = {
    totalMembers: 1247,
    activeMembers: 892,
    newMembersThisMonth: 156,
    totalPointsIssued: 45678,
    totalPointsRedeemed: 23456,
    averagePointsPerCustomer: 156,
    redemptionRate: 51.4,
    monthlyGrowth: 12.5,
    topTier: 'Gold',
    tierDistribution: {
      bronze: { count: 249, percentage: 20 },
      silver: { count: 436, percentage: 35 },
      gold: { count: 561, percentage: 45 }
    },
    monthlyTrends: {
      newMembers: { value: 156, change: 12.5, trend: 'up' },
      pointsIssued: { value: 8934, change: 8.3, trend: 'up' },
      pointsRedeemed: { value: 4567, change: -2.1, trend: 'down' },
      redemptions: { value: 234, change: 5.7, trend: 'up' }
    },
    topRewards: [
      { name: '10% Descuento', redeemed: 234, points: 100 },
      { name: 'Envío Gratis', redeemed: 123, points: 200 },
      { name: 'Producto Gratis', redeemed: 45, points: 500 }
    ]
  };

  const currentStats = mockStats;

  // if (isLoading) {
  //   return (
  //     <div className={`grid gap-4 md:grid-cols-2 lg:grid-cols-4 ${className}`}>
  //       {[...Array(4)].map((_, i) => (
  //         <Card key={i}>
  //           <CardHeader className="animate-pulse">
  //             <div className="h-4 bg-gray-200 rounded w-3/4"></div>
  //             <div className="h-8 bg-gray-200 rounded w-1/2"></div>
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
  //         <p className="text-red-600">Error al cargar las estadísticas de lealtad</p>
  //       </CardContent>
  //     </Card>
  //   );
  // }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Main Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Miembros Totales</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentStats.totalMembers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 flex items-center">
                <TrendingUp className="w-3 h-3 mr-1" />
                +{currentStats.monthlyGrowth}%
              </span>
              vs mes anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Miembros Activos</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentStats.activeMembers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {((currentStats.activeMembers / currentStats.totalMembers) * 100).toFixed(1)}% del total
            </p>
            <Progress 
              value={(currentStats.activeMembers / currentStats.totalMembers) * 100} 
              className="mt-2 h-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Puntos Emitidos</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentStats.totalPointsIssued.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Promedio: {currentStats.averagePointsPerCustomer} por cliente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Canje</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentStats.redemptionRate}%</div>
            <p className="text-xs text-muted-foreground">
              {currentStats.totalPointsRedeemed.toLocaleString()} puntos canjeados
            </p>
            <Progress value={currentStats.redemptionRate} className="mt-2 h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Tier Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Distribución por Tiers
            </CardTitle>
            <CardDescription>Distribución de clientes por nivel de lealtad</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm font-medium">Gold</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold">{currentStats.tierDistribution.gold.count}</span>
                  <span className="text-xs text-muted-foreground ml-1">
                    ({currentStats.tierDistribution.gold.percentage}%)
                  </span>
                </div>
              </div>
              <Progress value={currentStats.tierDistribution.gold.percentage} className="h-2" />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                  <span className="text-sm font-medium">Silver</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold">{currentStats.tierDistribution.silver.count}</span>
                  <span className="text-xs text-muted-foreground ml-1">
                    ({currentStats.tierDistribution.silver.percentage}%)
                  </span>
                </div>
              </div>
              <Progress value={currentStats.tierDistribution.silver.percentage} className="h-2" />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-amber-600 rounded-full"></div>
                  <span className="text-sm font-medium">Bronze</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold">{currentStats.tierDistribution.bronze.count}</span>
                  <span className="text-xs text-muted-foreground ml-1">
                    ({currentStats.tierDistribution.bronze.percentage}%)
                  </span>
                </div>
              </div>
              <Progress value={currentStats.tierDistribution.bronze.percentage} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Monthly Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Tendencias Mensuales
            </CardTitle>
            <CardDescription>Cambios respecto al mes anterior</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">Nuevos Miembros</span>
              <div className="flex items-center gap-2">
                {currentStats.monthlyTrends.newMembers.trend === 'up' ? (
                  <TrendingUp className="w-4 h-4 text-green-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-600" />
                )}
                <span className={`text-sm font-medium ${
                  currentStats.monthlyTrends.newMembers.trend === 'up' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {currentStats.monthlyTrends.newMembers.change > 0 ? '+' : ''}
                  {currentStats.monthlyTrends.newMembers.change}%
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm">Puntos Emitidos</span>
              <div className="flex items-center gap-2">
                {currentStats.monthlyTrends.pointsIssued.trend === 'up' ? (
                  <TrendingUp className="w-4 h-4 text-green-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-600" />
                )}
                <span className={`text-sm font-medium ${
                  currentStats.monthlyTrends.pointsIssued.trend === 'up' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {currentStats.monthlyTrends.pointsIssued.change > 0 ? '+' : ''}
                  {currentStats.monthlyTrends.pointsIssued.change}%
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm">Puntos Canjeados</span>
              <div className="flex items-center gap-2">
                {currentStats.monthlyTrends.pointsRedeemed.trend === 'up' ? (
                  <TrendingUp className="w-4 h-4 text-green-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-600" />
                )}
                <span className={`text-sm font-medium ${
                  currentStats.monthlyTrends.pointsRedeemed.trend === 'up' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {currentStats.monthlyTrends.pointsRedeemed.change > 0 ? '+' : ''}
                  {currentStats.monthlyTrends.pointsRedeemed.change}%
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm">Canjes Realizados</span>
              <div className="flex items-center gap-2">
                {currentStats.monthlyTrends.redemptions.trend === 'up' ? (
                  <TrendingUp className="w-4 h-4 text-green-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-600" />
                )}
                <span className={`text-sm font-medium ${
                  currentStats.monthlyTrends.redemptions.trend === 'up' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {currentStats.monthlyTrends.redemptions.change > 0 ? '+' : ''}
                  {currentStats.monthlyTrends.redemptions.change}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Rewards */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Recompensas Populares
            </CardTitle>
            <CardDescription>Recompensas más canjeadas este mes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {currentStats.topRewards.map((reward, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full">
                      <span className="text-xs font-medium text-blue-600">#{index + 1}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{reward.name}</p>
                      <p className="text-xs text-muted-foreground">{reward.points} puntos</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {reward.redeemed}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Este Mes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Nuevos miembros:</span>
              <span className="font-medium">{currentStats.newMembersThisMonth}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Puntos emitidos:</span>
              <span className="font-medium">{currentStats.monthlyTrends.pointsIssued.value.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Canjes realizados:</span>
              <span className="font-medium">{currentStats.monthlyTrends.redemptions.value}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-4 w-4" />
              Tier Dominante
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <Trophy className="h-4 w-4 text-yellow-600" />
              </div>
              <div>
                <p className="font-medium">{currentStats.topTier}</p>
                <p className="text-sm text-muted-foreground">
                  {currentStats.tierDistribution.gold.percentage}% de miembros
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Valor Promedio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(currentStats.averagePointsPerCustomer * 0.1).toFixed(2)}
            </div>
            <p className="text-sm text-muted-foreground">
              Valor en puntos por cliente
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}