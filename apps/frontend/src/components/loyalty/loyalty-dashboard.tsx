'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Trophy, 
  Gift, 
  Star, 
  TrendingUp, 
  Calendar,
  Award,
  Coins,
  Target,
  Users,
  BarChart3,
  History,
  Settings
} from 'lucide-react';
import { 
  useLoyaltyPrograms, 
  useCustomerLoyalty, 
  useAvailableRewards,
  useCustomerRewards,
  useLoyaltyAnalytics,
  useUpdateLoyaltyProgram,
  CustomerLoyalty,
  LoyaltyProgram,
  Reward,
  CustomerReward
} from '@/hooks/use-loyalty';
import { formatCurrency } from '@/lib/utils';

interface LoyaltyDashboardProps {
  customerId?: string;
  isAdmin?: boolean;
}

export default function LoyaltyDashboard({ customerId, isAdmin = false }: LoyaltyDashboardProps) {
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  
  const { data: programs, isLoading: programsLoading } = useLoyaltyPrograms();
  const { data: customerLoyalty, isLoading: loyaltyLoading } = useCustomerLoyalty(
    customerId || '', 
    selectedProgramId
  );
  const { data: availableRewards, isLoading: rewardsLoading } = useAvailableRewards(
    selectedProgramId, 
    customerId
  );
  const { data: customerRewards, isLoading: customerRewardsLoading } = useCustomerRewards(
    customerId || '', 
    selectedProgramId
  );
  const { data: analytics, isLoading: analyticsLoading } = useLoyaltyAnalytics(
    selectedProgramId
  );

  // Set default program if not selected
  React.useEffect(() => {
    if (programs && programs.length > 0 && !selectedProgramId) {
      setSelectedProgramId(programs[0].id);
    }
  }, [programs, selectedProgramId]);

  if (programsLoading) {
    return <LoyaltyDashboardSkeleton />;
  }

  if (!programs || programs.length === 0) {
    return (
      <Alert>
        <Trophy className="h-4 w-4" />
        <AlertDescription>
          No hay programas de lealtad configurados. {isAdmin && 'Configura un programa para comenzar.'}
        </AlertDescription>
      </Alert>
    );
  }

  const selectedProgram = programs.find(p => p.id === selectedProgramId);

  return (
    <div className="space-y-6">
      {/* Program Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Programa de Lealtad
          </CardTitle>
          <CardDescription>
            Gestiona puntos, recompensas y beneficios de lealtad
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {programs.map((program) => (
              <Button
                key={program.id}
                variant={selectedProgramId === program.id ? 'default' : 'outline'}
                onClick={() => setSelectedProgramId(program.id)}
                className="flex items-center gap-2"
              >
                <Star className="h-4 w-4" />
                {program.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedProgram && (
        <Tabs defaultValue={customerId ? 'customer' : 'overview'} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            {!customerId && (
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Resumen
              </TabsTrigger>
            )}
            {customerId && (
              <TabsTrigger value="customer" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Mi Cuenta
              </TabsTrigger>
            )}
            <TabsTrigger value="rewards" className="flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Recompensas
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Historial
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Configuración
              </TabsTrigger>
            )}
          </TabsList>

          {/* Overview Tab */}
          {!customerId && (
            <TabsContent value="overview" className="space-y-4">
              <ProgramOverview 
                program={selectedProgram} 
                analytics={analytics} 
                isLoading={analyticsLoading} 
              />
            </TabsContent>
          )}

          {/* Customer Tab */}
          {customerId && (
            <TabsContent value="customer" className="space-y-4">
              <CustomerLoyaltyCard 
                customerLoyalty={customerLoyalty || null}
                program={selectedProgram}
                isLoading={loyaltyLoading} 
              />
            </TabsContent>
          )}

          {/* Rewards Tab */}
          <TabsContent value="rewards" className="space-y-4">
            <RewardsSection 
              rewards={availableRewards} 
              customerRewards={customerRewards}
              customerLoyalty={customerLoyalty || null}
              isLoading={rewardsLoading || customerRewardsLoading}
              customerId={customerId}
              programId={selectedProgramId}
            />
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            <HistorySection 
              customerId={customerId}
              programId={selectedProgramId}
            />
          </TabsContent>

          {/* Settings Tab */}
          {isAdmin && (
            <TabsContent value="settings" className="space-y-4">
              <ProgramSettings program={selectedProgram} />
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  );
}

// Program Overview Component
function ProgramOverview({ 
  program, 
  analytics, 
  isLoading 
}: { 
  program: LoyaltyProgram; 
  analytics: any; 
  isLoading: boolean; 
}) {
  if (isLoading) {
    return <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>;
  }

  return (
    <div className="space-y-6">
      {/* Program Info */}
      <Card>
        <CardHeader>
          <CardTitle>{program.name}</CardTitle>
          <CardDescription>{program.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Puntos por Compra</p>
              <p className="text-2xl font-bold">{program.pointsPerPurchase}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Compra Mínima</p>
              <p className="text-2xl font-bold">{formatCurrency(program.minimumPurchase)}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Bono de Bienvenida</p>
              <p className="text-2xl font-bold">{program.welcomeBonus}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Bono de Cumpleaños</p>
              <p className="text-2xl font-bold">{program.birthdayBonus}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analytics */}
      {analytics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalCustomers}</div>
              <p className="text-xs text-muted-foreground">
                {analytics.activeCustomers} activos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Puntos Emitidos</CardTitle>
              <Coins className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalPointsIssued.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {analytics.totalPointsRedeemed.toLocaleString()} canjeados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recompensas Canjeadas</CardTitle>
              <Gift className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalRewardsRedeemed}</div>
              <p className="text-xs text-muted-foreground">
                Este mes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Promedio por Cliente</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(analytics.averagePointsPerCustomer)}</div>
              <p className="text-xs text-muted-foreground">
                puntos por cliente
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// Customer Loyalty Card Component
function CustomerLoyaltyCard({ 
  customerLoyalty, 
  program,
  isLoading 
}: { 
  customerLoyalty: CustomerLoyalty | null; 
  program: LoyaltyProgram;
  isLoading: boolean; 
}) {
  if (isLoading) {
    return <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>;
  }

  if (!customerLoyalty) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Inscrito</CardTitle>
          <CardDescription>
            Este cliente no está inscrito en el programa de lealtad
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button>
            Inscribir en Programa
          </Button>
        </CardContent>
      </Card>
    );
  }

  const nextTierPoints = customerLoyalty.currentTier ? 
    0 : // (customerLoyalty.program.tiers?.find(t => t.minPoints > customerLoyalty.currentTier!.minPoints)?.minPoints || 0) : 
    0;
  const progressToNextTier = nextTierPoints > 0 ? 
    ((customerLoyalty.currentPoints - customerLoyalty.currentTier!.minPoints) / (nextTierPoints - customerLoyalty.currentTier!.minPoints)) * 100 : 
    100;

  return (
    <div className="space-y-4">
      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Estado de Lealtad
          </CardTitle>
          <CardDescription>
            Miembro desde {new Date(customerLoyalty.enrollmentDate).toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Tier */}
          {customerLoyalty.currentTier && (
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-full">
                  <Trophy className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <h3 className="font-semibold">{customerLoyalty.currentTier.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Multiplicador: {customerLoyalty.currentTier.multiplier}x
                  </p>
                </div>
              </div>
              <Badge variant="secondary">
                Nivel Actual
              </Badge>
            </div>
          )}

          {/* Progress to Next Tier */}
          {nextTierPoints > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progreso al siguiente nivel</span>
                <span>{customerLoyalty.currentPoints} / {nextTierPoints} puntos</span>
              </div>
              <Progress value={progressToNextTier} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {nextTierPoints - customerLoyalty.currentPoints} puntos para el siguiente nivel
              </p>
            </div>
          )}

          {/* Points Summary */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {customerLoyalty.currentPoints}
              </div>
              <p className="text-sm text-green-700">Puntos Disponibles</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {customerLoyalty.totalPointsEarned}
              </div>
              <p className="text-sm text-blue-700">Total Ganados</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {customerLoyalty.totalPointsRedeemed}
              </div>
              <p className="text-sm text-purple-700">Total Canjeados</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Rewards Section Component
function RewardsSection({ 
  rewards, 
  customerRewards,
  customerLoyalty,
  isLoading,
  customerId,
  programId
}: { 
  rewards: Reward[] | undefined; 
  customerRewards: CustomerReward[] | undefined;
  customerLoyalty: CustomerLoyalty | null;
  isLoading: boolean;
  customerId?: string;
  programId: string;
}) {
  if (isLoading) {
    return <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>;
  }

  return (
    <div className="space-y-6">
      {/* Available Rewards */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Recompensas Disponibles</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rewards?.map((reward) => (
            <RewardCard 
              key={reward.id} 
              reward={reward} 
              customerLoyalty={customerLoyalty}
              customerId={customerId}
              programId={programId}
            />
          ))}
        </div>
      </div>

      {/* Customer Rewards */}
      {customerId && customerRewards && customerRewards.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Mis Recompensas</h3>
          <div className="space-y-2">
            {customerRewards.map((customerReward) => (
              <CustomerRewardCard 
                key={customerReward.id} 
                customerReward={customerReward} 
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Individual Reward Card
function RewardCard({ 
  reward, 
  customerLoyalty,
  customerId,
  programId
}: { 
  reward: Reward; 
  customerLoyalty: CustomerLoyalty | null;
  customerId?: string;
  programId: string;
}) {
  const canRedeem = customerLoyalty && customerLoyalty.currentPoints >= reward.pointsCost;

  return (
    <Card className={`${canRedeem ? 'border-green-200' : 'border-gray-200'}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="text-base">{reward.name}</span>
          <Badge variant={canRedeem ? 'default' : 'secondary'}>
            {reward.pointsCost} pts
          </Badge>
        </CardTitle>
        <CardDescription>{reward.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span>Tipo:</span>
            <span className="capitalize">{reward.type.replace('_', ' ').toLowerCase()}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Valor:</span>
            <span>
              {reward.type.includes('PERCENTAGE') ? `${reward.value}%` : formatCurrency(reward.value)}
            </span>
          </div>
          {customerId && (
            <Button 
              className="w-full" 
              disabled={!canRedeem}
              variant={canRedeem ? 'default' : 'outline'}
            >
              {canRedeem ? 'Canjear' : 'Puntos Insuficientes'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Customer Reward Card
function CustomerRewardCard({ customerReward }: { customerReward: CustomerReward }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return 'bg-green-100 text-green-800';
      case 'USED': return 'bg-gray-100 text-gray-800';
      case 'EXPIRED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Gift className="h-5 w-5 text-muted-foreground" />
          <div>
            <h4 className="font-medium">{customerReward.reward.name}</h4>
            <p className="text-sm text-muted-foreground">
              {customerReward.reward.type.includes('PERCENTAGE') ? 
                `${customerReward.reward.value}% descuento` : 
                `${formatCurrency(customerReward.reward.value)} descuento`
              }
            </p>
          </div>
        </div>
        <div className="text-right">
          <Badge className={getStatusColor(customerReward.status)}>
            {customerReward.status === 'AVAILABLE' ? 'Disponible' : 
             customerReward.status === 'USED' ? 'Usado' : 'Expirado'}
          </Badge>
          {customerReward.expirationDate && (
            <p className="text-xs text-muted-foreground mt-1">
              Expira: {new Date(customerReward.expirationDate).toLocaleDateString()}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// History Section Component
function HistorySection({ customerId, programId }: { customerId?: string; programId: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de Transacciones</CardTitle>
        <CardDescription>
          Historial de puntos ganados y canjeados
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Funcionalidad de historial en desarrollo...
        </p>
      </CardContent>
    </Card>
  );
}

// Program Settings Component
function ProgramSettings({ program }: { program: LoyaltyProgram }) {
  const [form, setForm] = React.useState({
    pointsPerPurchase: program.pointsPerPurchase,
    minimumPurchase: program.minimumPurchase,
    welcomeBonus: program.welcomeBonus,
    birthdayBonus: program.birthdayBonus,
    referralBonus: program.referralBonus,
    pointsExpirationDays: program.pointsExpirationDays ?? 0,
    isActive: program.isActive,
    description: program.description || '',
  });
  const updateProgram = useUpdateLoyaltyProgram();

  const onChange = (key: keyof typeof form, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSave = () => {
    updateProgram.mutate({ id: program.id, program: form });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuración del Programa</CardTitle>
        <CardDescription>
          Gestiona la configuración del programa de lealtad
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Puntos por compra</label>
            <input
              type="number"
              className="border rounded px-2 py-1"
              value={form.pointsPerPurchase}
              onChange={(e) => onChange('pointsPerPurchase', Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Compra mínima</label>
            <input
              type="number"
              className="border rounded px-2 py-1"
              value={form.minimumPurchase}
              onChange={(e) => onChange('minimumPurchase', Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Bono de bienvenida</label>
            <input
              type="number"
              className="border rounded px-2 py-1"
              value={form.welcomeBonus}
              onChange={(e) => onChange('welcomeBonus', Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Bono de cumpleaños</label>
            <input
              type="number"
              className="border rounded px-2 py-1"
              value={form.birthdayBonus}
              onChange={(e) => onChange('birthdayBonus', Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Bono por referido</label>
            <input
              type="number"
              className="border rounded px-2 py-1"
              value={form.referralBonus}
              onChange={(e) => onChange('referralBonus', Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Días de expiración</label>
            <input
              type="number"
              className="border rounded px-2 py-1"
              value={form.pointsExpirationDays}
              onChange={(e) => onChange('pointsExpirationDays', Number(e.target.value))}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm text-muted-foreground">Descripción</label>
            <textarea
              className="border rounded px-2 py-1 w-full"
              value={form.description}
              onChange={(e) => onChange('description', e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 md:col-span-2">
            <input
              id="isActive"
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => onChange('isActive', e.target.checked)}
            />
            <label htmlFor="isActive" className="text-sm">Programa activo</label>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={onSave} disabled={updateProgram.isPending}>
            {updateProgram.isPending ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Loading Skeleton
function LoyaltyDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-32" />
            ))}
          </div>
        </CardContent>
      </Card>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}