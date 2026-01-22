'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Trophy, 
  Star, 
  Gift, 
  TrendingUp,
  Award,
  Coins,
  Calendar,
  Crown
} from 'lucide-react';
import { useCustomerLoyalty, CustomerLoyalty } from '@/hooks/use-loyalty';
import { formatCurrency } from '@/lib/utils';

interface CustomerLoyaltyCardProps {
  customerId: string;
  programId?: string;
  compact?: boolean;
  showActions?: boolean;
}

function CustomerLoyaltyCard({ 
  customerId, 
  programId = '',
  compact = false,
  showActions = true
}: CustomerLoyaltyCardProps) {
  const { data: customerLoyalty, isLoading, error } = useCustomerLoyalty(customerId, programId);

  if (isLoading) {
    return <CustomerLoyaltyCardSkeleton compact={compact} />;
  }

  if (error || !customerLoyalty) {
    return <NotEnrolledCard customerId={customerId} programId={programId} />;
  }

  return compact ? (
    <CompactLoyaltyCard customerLoyalty={customerLoyalty} showActions={showActions} />
  ) : (
    <FullLoyaltyCard customerLoyalty={customerLoyalty} showActions={showActions} />
  );
}

// Full Loyalty Card Component
function FullLoyaltyCard({ 
  customerLoyalty, 
  showActions 
}: { 
  customerLoyalty: CustomerLoyalty; 
  showActions: boolean; 
}) {
  const nextTier = null; // customerLoyalty.program.tiers?.find(
    // t => t.minPoints > (customerLoyalty.currentTier?.minPoints || 0)
  // );
  
  const progressToNextTier = 100; // nextTier && customerLoyalty.currentTier ? 
    // ((customerLoyalty.currentPoints - customerLoyalty.currentTier.minPoints) / 
    //  (nextTier.minPoints - customerLoyalty.currentTier.minPoints)) * 100 : 100;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              {customerLoyalty.program.name}
            </CardTitle>
            <CardDescription className="text-blue-100">
              Miembro desde {new Date(customerLoyalty.enrollmentDate).toLocaleDateString()}
            </CardDescription>
          </div>
          {customerLoyalty.currentTier && (
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
              <Crown className="h-3 w-3 mr-1" />
              {customerLoyalty.currentTier.name}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Points Summary */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center justify-center mb-2">
              <Coins className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-600">
              {customerLoyalty.currentPoints.toLocaleString()}
            </div>
            <p className="text-sm text-green-700">Puntos Disponibles</p>
          </div>

          <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {customerLoyalty.totalPointsEarned.toLocaleString()}
            </div>
            <p className="text-sm text-blue-700">Total Ganados</p>
          </div>

          <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-center justify-center mb-2">
              <Gift className="h-5 w-5 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-purple-600">
              {customerLoyalty.totalPointsRedeemed.toLocaleString()}
            </div>
            <p className="text-sm text-purple-700">Total Canjeados</p>
          </div>
        </div>

        {/* Current Tier Info */}
        {customerLoyalty.currentTier && (
          <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-yellow-100 rounded-full">
                <Award className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-semibold text-yellow-800">
                  {customerLoyalty.currentTier.name}
                </h3>
                <p className="text-sm text-yellow-700">
                  Multiplicador de puntos: {customerLoyalty.currentTier.multiplier}x
                </p>
              </div>
            </div>
            
            {customerLoyalty.currentTier.benefits && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-yellow-800">Beneficios:</p>
                <div className="text-sm text-yellow-700">
                  <div className="flex items-center gap-2">
                    <Star className="h-3 w-3" />
                    {customerLoyalty.currentTier.benefits}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Progress to Next Tier */}
        {/* {nextTier && customerLoyalty.currentTier && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="font-medium">Progreso al siguiente nivel</h4>
              <Badge variant="outline">
                {nextTier.name}
              </Badge>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{customerLoyalty.currentTier.name}</span>
                <span>{nextTier.name}</span>
              </div>
              <Progress value={progressToNextTier} className="h-3" />
              <div className="flex justify-between text-sm">
                <span>{customerLoyalty.currentPoints} puntos</span>
                <span>{nextTier.minPoints} puntos</span>
              </div>
            </div>
          </div>
        )} */}

        {/* Actions */}
        {showActions && (
          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" className="flex-1">
              <Gift className="h-4 w-4 mr-2" />
              Ver Recompensas
            </Button>
            <Button variant="outline" className="flex-1">
              <Calendar className="h-4 w-4 mr-2" />
              Historial
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Compact Loyalty Card Component
function CompactLoyaltyCard({ 
  customerLoyalty, 
  showActions 
}: { 
  customerLoyalty: CustomerLoyalty; 
  showActions: boolean; 
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-blue-600" />
            <span className="font-medium">{customerLoyalty.program.name}</span>
          </div>
          {customerLoyalty.currentTier && (
            <Badge variant="secondary" className="text-xs">
              {customerLoyalty.currentTier.name}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">
              {customerLoyalty.currentPoints.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Disponibles</p>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">
              {customerLoyalty.totalPointsEarned.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Ganados</p>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-purple-600">
              {customerLoyalty.totalPointsRedeemed.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Canjeados</p>
          </div>
        </div>

        {showActions && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1">
              <Gift className="h-3 w-3 mr-1" />
              Recompensas
            </Button>
            <Button size="sm" variant="outline" className="flex-1">
              <Calendar className="h-3 w-3 mr-1" />
              Historial
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Not Enrolled Card Component
function NotEnrolledCard({ customerId, programId }: { customerId: string; programId: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="p-6 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="p-3 bg-gray-100 rounded-full">
            <Trophy className="h-6 w-6 text-gray-400" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">No inscrito en programa de lealtad</h3>
            <p className="text-sm text-gray-500 mt-1">
              Este cliente no está inscrito en ningún programa de lealtad
            </p>
          </div>
          <Button>
            <Star className="h-4 w-4 mr-2" />
            Inscribir Cliente
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Loading Skeleton
function CustomerLoyaltyCardSkeleton({ compact }: { compact: boolean }) {
  if (compact) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-16" />
          </div>
          <div className="grid grid-cols-3 gap-3 mb-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="text-center">
                <Skeleton className="h-6 w-12 mx-auto mb-1" />
                <Skeleton className="h-3 w-16 mx-auto" />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 flex-1" />
            <Skeleton className="h-8 flex-1" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="text-center p-4 bg-gray-50 rounded-lg">
              <Skeleton className="h-5 w-5 mx-auto mb-2" />
              <Skeleton className="h-8 w-16 mx-auto mb-1" />
              <Skeleton className="h-4 w-20 mx-auto" />
            </div>
          ))}
        </div>
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-16 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 flex-1" />
        </div>
      </CardContent>
    </Card>
  );
}

// También exportar como named export para compatibilidad
export { CustomerLoyaltyCard };
export default CustomerLoyaltyCard;