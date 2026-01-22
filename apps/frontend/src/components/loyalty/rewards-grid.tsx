'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Gift, 
  Star, 
  Percent, 
  DollarSign, 
  ShoppingBag,
  Calendar,
  Check,
  X,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { 
  useAvailableRewards, 
  useRedeemReward,
  Reward,
  CustomerLoyalty 
} from '@/hooks/use-loyalty';
import { formatCurrency } from '@/lib/utils';
import { toast } from '@/lib/toast';

interface RewardsGridProps {
  programId: string;
  customerId?: string;
  customerLoyalty?: CustomerLoyalty | null;
  showRedeemButton?: boolean;
  compact?: boolean;
}

export default function RewardsGrid({ 
  programId, 
  customerId, 
  customerLoyalty,
  showRedeemButton = true,
  compact = false
}: RewardsGridProps) {
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [showRedeemDialog, setShowRedeemDialog] = useState(false);

  const { data: rewards, isLoading, error } = useAvailableRewards(programId, customerId);
  const redeemMutation = useRedeemReward();

  const handleRedeemClick = (reward: Reward) => {
    setSelectedReward(reward);
    setShowRedeemDialog(true);
  };

  const handleConfirmRedeem = async () => {
    if (!selectedReward || !customerId) return;

    try {
      await redeemMutation.mutateAsync({
        customerId,
        rewardId: selectedReward.id,
        programId
      });
      
      toast.success('¡Recompensa canjeada exitosamente!');
      setShowRedeemDialog(false);
      setSelectedReward(null);
    } catch (error) {
      toast.error('Error al canjear la recompensa');
    }
  };

  if (isLoading) {
    return <RewardsGridSkeleton compact={compact} />;
  }

  if (error) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Error al cargar las recompensas. Intenta nuevamente.
        </AlertDescription>
      </Alert>
    );
  }

  if (!rewards || rewards.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="p-3 bg-gray-100 rounded-full">
              <Gift className="h-6 w-6 text-gray-400" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">No hay recompensas disponibles</h3>
              <p className="text-sm text-gray-500 mt-1">
                Las recompensas aparecerán aquí cuando estén configuradas
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className={`grid gap-4 ${compact ? 'md:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
        {rewards.map((reward) => (
          <RewardCard
            key={reward.id}
            reward={reward}
            customerLoyalty={customerLoyalty}
            showRedeemButton={showRedeemButton}
            onRedeemClick={handleRedeemClick}
            compact={compact}
          />
        ))}
      </div>

      {/* Redeem Confirmation Dialog */}
      <Dialog open={showRedeemDialog} onOpenChange={setShowRedeemDialog}>
        <DialogContent aria-labelledby="redeem-confirm-title">
          <DialogHeader>
            <DialogTitle id="redeem-confirm-title">Confirmar Canje de Recompensa</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres canjear esta recompensa?
            </DialogDescription>
          </DialogHeader>
          
          {selectedReward && (
            <div className="py-4">
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <div className="p-2 bg-white rounded-full">
                  <Gift className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">{selectedReward.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedReward.description}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className="font-medium text-red-600">
                      -{selectedReward.pointsCost} puntos
                    </span>
                    <span className="text-green-600">
                      {selectedReward.type.includes('PERCENTAGE') ? 
                        `${selectedReward.value}% descuento` : 
                        `${formatCurrency(selectedReward.value)} descuento`
                      }
                    </span>
                  </div>
                </div>
              </div>
              
              {customerLoyalty && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span>Puntos actuales:</span>
                    <span className="font-medium">{customerLoyalty.currentPoints.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Costo de recompensa:</span>
                    <span className="font-medium text-red-600">-{selectedReward.pointsCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium pt-2 border-t border-blue-200 mt-2">
                    <span>Puntos restantes:</span>
                    <span className={customerLoyalty.currentPoints - selectedReward.pointsCost >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {(customerLoyalty.currentPoints - selectedReward.pointsCost).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRedeemDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmRedeem}
              disabled={redeemMutation.isPending}
            >
              {redeemMutation.isPending ? 'Canjeando...' : 'Confirmar Canje'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Individual Reward Card Component
function RewardCard({ 
  reward, 
  customerLoyalty,
  showRedeemButton,
  onRedeemClick,
  compact
}: { 
  reward: Reward; 
  customerLoyalty?: CustomerLoyalty | null;
  showRedeemButton: boolean;
  onRedeemClick: (reward: Reward) => void;
  compact: boolean;
}) {
  const canRedeem = customerLoyalty && customerLoyalty.currentPoints >= reward.pointsCost;
  const isActive = reward.isActive && (!reward.validUntil || new Date(reward.validUntil) > new Date());

  const getRewardIcon = (type: string) => {
    if (type.includes('PERCENTAGE')) return Percent;
    if (type.includes('FIXED')) return DollarSign;
    if (type.includes('PRODUCT')) return ShoppingBag;
    return Gift;
  };

  const getRewardTypeLabel = (type: string) => {
    switch (type) {
      case 'PERCENTAGE_DISCOUNT': return 'Descuento %';
      case 'FIXED_DISCOUNT': return 'Descuento Fijo';
      case 'FREE_PRODUCT': return 'Producto Gratis';
      case 'FREE_SHIPPING': return 'Envío Gratis';
      default: return 'Recompensa';
    }
  };

  const getRewardValue = (reward: Reward) => {
    if (reward.type.includes('PERCENTAGE')) {
      return `${reward.value}% OFF`;
    } else if (reward.type.includes('FIXED')) {
      return `${formatCurrency(reward.value)} OFF`;
    } else {
      return 'Gratis';
    }
  };

  const RewardIcon = getRewardIcon(reward.type);

  return (
    <Card className={`relative overflow-hidden transition-all duration-200 hover:shadow-md ${
      canRedeem ? 'border-green-200 bg-green-50/30' : 
      !isActive ? 'border-gray-200 bg-gray-50/50 opacity-75' : 
      'border-gray-200'
    }`}>
      {/* Premium/Featured Badge */}
      {reward.pointsCost > 1000 && (
        <div className="absolute top-2 right-2">
          <Badge variant="secondary" className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white border-0">
            <Sparkles className="h-3 w-3 mr-1" />
            Premium
          </Badge>
        </div>
      )}

      <CardHeader className={compact ? 'pb-3' : 'pb-4'}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-full ${
              canRedeem ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              <RewardIcon className={`h-4 w-4 ${
                canRedeem ? 'text-green-600' : 'text-gray-500'
              }`} />
            </div>
            <div>
              <CardTitle className={`text-base ${compact ? 'text-sm' : ''}`}>
                {reward.name}
              </CardTitle>
              <Badge variant="outline" className="text-xs mt-1">
                {getRewardTypeLabel(reward.type)}
              </Badge>
            </div>
          </div>
        </div>
        
        {!compact && (
          <CardDescription className="text-sm">
            {reward.description}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className={`space-y-3 ${compact ? 'pt-0' : ''}`}>
        {/* Reward Value */}
        <div className="text-center p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
          <div className="text-lg font-bold text-blue-600">
            {getRewardValue(reward)}
          </div>
          <p className="text-xs text-blue-700">Valor de la recompensa</p>
        </div>

        {/* Points Cost */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Costo:</span>
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 text-yellow-500" />
            <span className="font-medium">{reward.pointsCost.toLocaleString()} puntos</span>
          </div>
        </div>

        {/* Availability */}
        {reward.maxRedemptions && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Disponibles:</span>
            <span className="font-medium">
              {reward.maxRedemptions - (reward.currentRedemptions || 0)} de {reward.maxRedemptions}
            </span>
          </div>
        )}

        {/* Expiration */}
        {reward.validUntil && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>Expira: {new Date(reward.validUntil).toLocaleDateString()}</span>
          </div>
        )}

        {/* Redeem Button */}
        {showRedeemButton && (
          <Button 
            className="w-full" 
            disabled={!canRedeem || !isActive}
            variant={canRedeem ? 'default' : 'outline'}
            onClick={() => onRedeemClick(reward)}
          >
            {!isActive ? (
              <>
                <X className="h-4 w-4 mr-2" />
                No Disponible
              </>
            ) : canRedeem ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Canjear Ahora
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 mr-2" />
                Puntos Insuficientes
              </>
            )}
          </Button>
        )}

        {/* Points Needed */}
        {customerLoyalty && !canRedeem && isActive && (
          <p className="text-xs text-center text-muted-foreground">
            Necesitas {(reward.pointsCost - customerLoyalty.currentPoints).toLocaleString()} puntos más
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// Loading Skeleton
function RewardsGridSkeleton({ compact }: { compact: boolean }) {
  const itemCount = compact ? 4 : 6;
  
  return (
    <div className={`grid gap-4 ${compact ? 'md:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
      {Array.from({ length: itemCount }).map((_, i) => (
        <Card key={i}>
          <CardHeader className={compact ? 'pb-3' : 'pb-4'}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div>
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            </div>
            {!compact && <Skeleton className="h-4 w-full mt-2" />}
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-16 w-full rounded-lg" />
            <div className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
            <Skeleton className="h-9 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}