'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  Star, 
  Gift, 
  Trophy, 
  TrendingUp, 
  Users, 
  Award,
  Crown,
  Zap,
  Calendar,
  ArrowUp,
  ArrowDown,
  Plus,
  Minus,
  Settings,
  Eye,
  ShoppingBag,
  Percent,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  Edit,
  Trash2
} from 'lucide-react';
import { 
  loyaltyService, 
  LoyaltyProgram as LoyaltyProgramType,
  CustomerLoyalty,
  LoyaltyReward,
  PointsTransaction,
  LoyaltyStats,
  LoyaltyTier
} from '@/lib/loyalty-service';
import { UICustomer } from '@/lib/customer-service';
import { useToast } from '@/components/ui/use-toast';

interface LoyaltyProgramProps {
  customers: UICustomer[];
  selectedCustomerId?: string;
}

export default function LoyaltyProgram({ customers, selectedCustomerId }: LoyaltyProgramProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [program, setProgram] = useState<LoyaltyProgramType | null>(null);
  const [stats, setStats] = useState<LoyaltyStats | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<UICustomer | null>(null);
  const [customerLoyalty, setCustomerLoyalty] = useState<CustomerLoyalty | null>(null);
  const [transactions, setTransactions] = useState<PointsTransaction[]>([]);
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [availableRewards, setAvailableRewards] = useState<LoyaltyReward[]>([]);
  const [showAddPoints, setShowAddPoints] = useState(false);
  const [pointsToAdd, setPointsToAdd] = useState('');
  const [pointsReason, setPointsReason] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedCustomerId) {
      const customer = customers.find(c => c.id === selectedCustomerId);
      if (customer) {
        setSelectedCustomer(customer);
        loadCustomerLoyalty(selectedCustomerId);
      }
    }
  }, [selectedCustomerId, customers]);

  const loadData = () => {
    const programData = loyaltyService.getProgram();
    const statsData = loyaltyService.getLoyaltyStats();
    const rewardsData = loyaltyService.getRewards();
    
    setProgram(programData);
    setStats(statsData);
    setRewards(rewardsData);
  };

  const loadCustomerLoyalty = (customerId: string) => {
    let loyalty = loyaltyService.getCustomerLoyalty(customerId);
    
    if (!loyalty) {
      loyalty = loyaltyService.initializeCustomerLoyalty(customerId);
    }
    
    const customerTransactions = loyaltyService.getPointsTransactions(customerId);
    const customerAvailableRewards = loyaltyService.getAvailableRewards(customerId);
    
    setCustomerLoyalty(loyalty);
    setTransactions(customerTransactions);
    setAvailableRewards(customerAvailableRewards);
  };

  const handleAddPoints = () => {
    if (!selectedCustomer || !pointsToAdd || !pointsReason) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos",
        variant: "destructive"
      });
      return;
    }

    const points = parseInt(pointsToAdd);
    if (isNaN(points) || points <= 0) {
      toast({
        title: "Error",
        description: "Ingresa una cantidad válida de puntos",
        variant: "destructive"
      });
      return;
    }

    loyaltyService.addPoints(selectedCustomer.id, points, pointsReason);
    loadCustomerLoyalty(selectedCustomer.id);
    loadData(); // Refresh stats
    
    setPointsToAdd('');
    setPointsReason('');
    setShowAddPoints(false);
    
    toast({
      title: "Puntos agregados",
      description: `Se agregaron ${points} puntos a ${selectedCustomer.name}`
    });
  };

  const handleRedeemReward = (rewardId: string) => {
    if (!selectedCustomer) return;

    const success = loyaltyService.redeemReward(selectedCustomer.id, rewardId);
    
    if (success) {
      const reward = rewards.find(r => r.id === rewardId);
      loadCustomerLoyalty(selectedCustomer.id);
      loadData();
      
      toast({
        title: "Recompensa canjeada",
        description: `${reward?.name} ha sido canjeada exitosamente`
      });
    } else {
      toast({
        title: "Error",
        description: "No se pudo canjear la recompensa",
        variant: "destructive"
      });
    }
  };

  const getTierColor = (tierId: string): string => {
    const tier = program?.tiers.find(t => t.id === tierId);
    return tier?.color || '#gray';
  };

  const getTierIcon = (tierId: string): string => {
    const tier = program?.tiers.find(t => t.id === tierId);
    return tier?.icon || '🏆';
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'earned': return <ArrowUp className="h-4 w-4 text-green-600" />;
      case 'redeemed': return <ArrowDown className="h-4 w-4 text-red-600" />;
      case 'bonus': return <Gift className="h-4 w-4 text-blue-600" />;
      case 'expired': return <Clock className="h-4 w-4 text-gray-600" />;
      default: return <Zap className="h-4 w-4 text-purple-600" />;
    }
  };

  if (!program || !stats) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3 text-muted-foreground">Cargando programa de fidelidad...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
                <Crown className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl">{program.name}</CardTitle>
                <p className="text-muted-foreground">{program.description}</p>
              </div>
            </div>
            <Badge variant={program.isActive ? "default" : "secondary"}>
              {program.isActive ? "Activo" : "Inactivo"}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="customers">Clientes</TabsTrigger>
          <TabsTrigger value="rewards">Recompensas</TabsTrigger>
          <TabsTrigger value="settings">Configuración</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Miembros Totales</p>
                    <p className="text-2xl font-bold">{stats.totalMembers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Miembros Activos</p>
                    <p className="text-2xl font-bold">{stats.activeMembers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Star className="h-8 w-8 text-yellow-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Puntos Emitidos</p>
                    <p className="text-2xl font-bold">{stats.totalPointsIssued.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Gift className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Puntos Canjeados</p>
                    <p className="text-2xl font-bold">{stats.totalPointsRedeemed.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tier Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Distribución por Niveles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.tierDistribution.map((tier) => (
                  <div key={tier.tierId} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getTierIcon(tier.tierId)}</span>
                      <div>
                        <p className="font-medium">{tier.name}</p>
                        <p className="text-sm text-muted-foreground">{tier.count} miembros</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={tier.percentage} className="w-20" />
                      <span className="text-sm font-medium">{tier.percentage.toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Rewards */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Recompensas Más Populares
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.topRewards.map((reward, index) => (
                  <div key={reward.rewardId} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="w-8 h-8 rounded-full p-0 flex items-center justify-center">
                        {index + 1}
                      </Badge>
                      <span className="font-medium">{reward.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {reward.redemptions} canjes
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-6">
          {/* Customer Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Seleccionar Cliente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {customers.map((customer) => {
                  const loyalty = loyaltyService.getCustomerLoyalty(customer.id);
                  const tier = loyalty ? program.tiers.find(t => t.id === loyalty.currentTier) : null;
                  
                  return (
                    <Card 
                      key={customer.id} 
                      className={`cursor-pointer transition-colors ${
                        selectedCustomer?.id === customer.id ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => {
                        setSelectedCustomer(customer);
                        loadCustomerLoyalty(customer.id);
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>
                              {customer.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium">{customer.name}</p>
                            <p className="text-sm text-muted-foreground">{customer.email}</p>
                            {loyalty && tier && (
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-lg">{tier.icon}</span>
                                <span className="text-sm font-medium">{tier.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {loyalty.currentPoints} pts
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Customer Loyalty Details */}
          {selectedCustomer && customerLoyalty && (
            <div className="space-y-6">
              {/* Customer Loyalty Overview */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <span className="text-2xl">{getTierIcon(customerLoyalty.currentTier)}</span>
                      Perfil de Fidelidad - {selectedCustomer.name}
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddPoints(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Puntos
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-primary">{customerLoyalty.currentPoints}</p>
                      <p className="text-sm text-muted-foreground">Puntos Actuales</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-green-600">{customerLoyalty.totalPointsEarned}</p>
                      <p className="text-sm text-muted-foreground">Puntos Totales Ganados</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-purple-600">{customerLoyalty.pointsToNextTier}</p>
                      <p className="text-sm text-muted-foreground">Puntos para Siguiente Nivel</p>
                    </div>
                  </div>

                  {customerLoyalty.pointsToNextTier > 0 && (
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Progreso al siguiente nivel</span>
                        <span>{Math.max(0, 100 - (customerLoyalty.pointsToNextTier / 100))}%</span>
                      </div>
                      <Progress 
                        value={Math.max(0, 100 - (customerLoyalty.pointsToNextTier / 100))} 
                        className="h-2"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Miembro desde: {formatDate(customerLoyalty.memberSince)}</span>
                    <span>Última actividad: {formatDate(customerLoyalty.lastActivity)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Available Rewards */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gift className="h-5 w-5" />
                    Recompensas Disponibles
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {availableRewards.length === 0 ? (
                    <div className="text-center py-8">
                      <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No hay recompensas disponibles</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {availableRewards.map((reward) => (
                        <Card key={reward.id} className="border-2">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h4 className="font-medium">{reward.name}</h4>
                                <p className="text-sm text-muted-foreground">{reward.description}</p>
                              </div>
                              <Badge variant="secondary">
                                {reward.pointsCost} pts
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {reward.type === 'discount' && <Percent className="h-4 w-4 text-green-600" />}
                                {reward.type === 'cashback' && <DollarSign className="h-4 w-4 text-blue-600" />}
                                {reward.type === 'product' && <ShoppingBag className="h-4 w-4 text-purple-600" />}
                                {reward.type === 'service' && <Zap className="h-4 w-4 text-orange-600" />}
                                <span className="text-sm capitalize">{reward.type}</span>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => handleRedeemReward(reward.id)}
                                disabled={customerLoyalty.currentPoints < reward.pointsCost}
                              >
                                Canjear
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Transaction History */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Historial de Puntos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {transactions.length === 0 ? (
                    <div className="text-center py-8">
                      <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No hay transacciones</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {transactions.slice(0, 10).map((transaction) => (
                        <div key={transaction.id} className="flex items-center justify-between p-3 border rounded">
                          <div className="flex items-center gap-3">
                            {getTransactionIcon(transaction.type)}
                            <div>
                              <p className="font-medium">{transaction.description}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatDate(transaction.createdAt)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-medium ${
                              transaction.points > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {transaction.points > 0 ? '+' : ''}{transaction.points} pts
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="rewards" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5" />
                Gestión de Recompensas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rewards.map((reward) => (
                  <Card key={reward.id} className="border-2">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium">{reward.name}</h4>
                          <p className="text-sm text-muted-foreground">{reward.description}</p>
                        </div>
                        <Badge variant={reward.isActive ? "default" : "secondary"}>
                          {reward.isActive ? "Activa" : "Inactiva"}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Costo:</span>
                          <span className="font-medium">{reward.pointsCost} puntos</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Tipo:</span>
                          <span className="capitalize">{reward.type}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Canjes:</span>
                          <span>{reward.usedCount}</span>
                        </div>
                        {reward.usageLimit && (
                          <div className="flex justify-between text-sm">
                            <span>Límite:</span>
                            <span>{reward.usageLimit}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configuración del Programa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label>Puntos por Dólar</Label>
                    <Input 
                      type="number" 
                      value={program.pointsPerDollar} 
                      readOnly 
                      className="bg-muted"
                    />
                  </div>
                  <div>
                    <Label>Bono de Bienvenida</Label>
                    <Input 
                      type="number" 
                      value={program.welcomeBonus} 
                      readOnly 
                      className="bg-muted"
                    />
                  </div>
                  <div>
                    <Label>Bono de Cumpleaños</Label>
                    <Input 
                      type="number" 
                      value={program.birthdayBonus} 
                      readOnly 
                      className="bg-muted"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label>Bono por Referido</Label>
                    <Input 
                      type="number" 
                      value={program.referralBonus} 
                      readOnly 
                      className="bg-muted"
                    />
                  </div>
                  <div>
                    <Label>Días de Expiración</Label>
                    <Input 
                      type="number" 
                      value={program.pointsExpireDays || 365} 
                      readOnly 
                      className="bg-muted"
                    />
                  </div>
                  <div>
                    <Label>Mínimo para Canje</Label>
                    <Input 
                      type="number" 
                      value={program.minimumRedemption} 
                      readOnly 
                      className="bg-muted"
                    />
                  </div>
                </div>
              </div>

              {/* Tiers */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Niveles de Membresía</h3>
                <div className="space-y-4">
                  {program.tiers.map((tier) => (
                    <Card key={tier.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{tier.icon}</span>
                            <div>
                              <h4 className="font-medium" style={{ color: tier.color }}>
                                {tier.name}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {tier.minPoints}+ puntos
                              </p>
                            </div>
                          </div>
                          <div className="text-right text-sm">
                            <p>Multiplicador: {tier.benefits.pointsMultiplier}x</p>
                            <p>Descuento: {tier.benefits.discountPercentage}%</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Points Modal */}
      {showAddPoints && selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Agregar Puntos - {selectedCustomer.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="points">Cantidad de Puntos</Label>
                <Input
                  id="points"
                  type="number"
                  placeholder="Ej: 100"
                  value={pointsToAdd}
                  onChange={(e) => setPointsToAdd(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="reason">Motivo</Label>
                <Input
                  id="reason"
                  placeholder="Ej: Compra especial, promoción, etc."
                  value={pointsReason}
                  onChange={(e) => setPointsReason(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowAddPoints(false)}
                >
                  Cancelar
                </Button>
                <Button onClick={handleAddPoints}>
                  Agregar Puntos
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}