'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Gift, Eye, Edit } from 'lucide-react';

interface LoyaltyReward {
  id: string;
  name: string;
  description: string;
  type: string;
  value: number;
  pointsCost: number;
  isActive: boolean;
  timesRedeemed: number;
  category?: string;
  expiresAt?: string;
}

interface RewardCardProps {
  reward: LoyaltyReward;
  onView?: (reward: LoyaltyReward) => void;
  onEdit?: (reward: LoyaltyReward) => void;
}

export function RewardCard({ reward, onView, onEdit }: RewardCardProps) {
  const formatValue = (type: string, value: number): string => {
    if (type.includes('PERCENTAGE')) {
      return `${value}%`;
    }
    return `$${value}`;
  };

  const formatNumber = (num: number): string => {
    return num.toLocaleString('es-ES');
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30">
                      <Gift className="h-5 w-5 text-purple-600 dark:text-purple-400" aria-hidden="true" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{reward.name}</CardTitle>
                      {reward.category && (
                        <Badge variant="outline" className="mt-1">
                          {reward.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {formatNumber(reward.pointsCost)}
                    </div>
                    <div className="text-xs text-muted-foreground">puntos</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4 line-clamp-2">
                  {reward.description}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Valor:</span>
                      <div className="font-semibold">
                        {formatValue(reward.type, reward.value)}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Canjeado:</span>
                      <div className="font-semibold">{reward.timesRedeemed}x</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {onView && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onView(reward)}
                        aria-label={`Ver detalles de ${reward.name}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(reward)}
                        aria-label={`Editar ${reward.name}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs space-y-1">
            <div>Tipo: {reward.type}</div>
            <div>Valor: {formatValue(reward.type, reward.value)}</div>
            <div>Costo en puntos: {formatNumber(reward.pointsCost)}</div>
            <div>Estado: {reward.isActive ? 'Activa' : 'Inactiva'}</div>
            {reward.expiresAt && <div>Expira: {reward.expiresAt}</div>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
