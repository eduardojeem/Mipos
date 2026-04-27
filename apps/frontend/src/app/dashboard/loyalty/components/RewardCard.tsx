'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Gift, Edit, Star, Clock, TrendingUp } from 'lucide-react';

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
  /** Maximum timesRedeemed across all visible rewards — used to build the popularity bar */
  maxRedeemed?: number;
}

function formatRewardValue(type: string, value: number): string {
  if (type.toLowerCase().includes('percentage') || type.toLowerCase().includes('percent')) {
    return `${value}% desc.`;
  }
  return `$${value.toLocaleString('es')}`;
}

function getExpiryUrgency(expiresAt?: string): 'urgent' | 'soon' | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  const days = ms / 86400000;
  if (days < 0) return null; // already expired — handled separately
  if (days <= 7) return 'urgent';
  if (days <= 30) return 'soon';
  return null;
}

export function RewardCard({ reward, onView, onEdit, maxRedeemed = 100 }: RewardCardProps) {
  const isExpired = reward.expiresAt ? new Date(reward.expiresAt) < new Date() : false;
  const expiryUrgency = getExpiryUrgency(reward.expiresAt);
  const popularityPct = maxRedeemed > 0
    ? Math.round((reward.timesRedeemed / maxRedeemed) * 100)
    : 0;

  return (
    <Card className="group overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          {/* Left: icon + name */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex-shrink-0 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 p-2.5 dark:from-purple-950/30 dark:to-pink-950/30">
              <Gift className="h-5 w-5 text-purple-600 dark:text-purple-400" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <CardTitle className="truncate text-base" title={reward.name}>
                {reward.name}
              </CardTitle>
              <div className="mt-1 flex flex-wrap items-center gap-1">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    reward.isActive && !isExpired
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <span
                    className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${
                      reward.isActive && !isExpired ? 'bg-emerald-500' : 'bg-muted-foreground'
                    }`}
                  />
                  {isExpired ? 'Expirada' : reward.isActive ? 'Activa' : 'Inactiva'}
                </span>
                {reward.category && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {reward.category}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Right: points cost */}
          <div className="flex-shrink-0 text-right">
            <div className="flex items-center gap-1 text-xl font-bold text-purple-600 dark:text-purple-400">
              <Star className="h-4 w-4" />
              {reward.pointsCost.toLocaleString('es')}
            </div>
            <div className="text-[11px] text-muted-foreground">puntos</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {reward.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{reward.description}</p>
        )}

        {/* Value + redemption count */}
        <div className="flex items-center justify-between text-sm">
          <div>
            <span className="text-xs text-muted-foreground">Valor: </span>
            <span className="font-semibold">{formatRewardValue(reward.type, reward.value)}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <TrendingUp className="h-3 w-3" />
            {reward.timesRedeemed.toLocaleString('es')}x canjeado
          </div>
        </div>

        {/* Popularity bar */}
        <div className="space-y-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-1.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-700"
              style={{ width: `${popularityPct}%` }}
            />
          </div>
          <p className="text-right text-[10px] text-muted-foreground">
            {popularityPct}% de popularidad
          </p>
        </div>

        {/* Expiry warning */}
        {reward.expiresAt && (
          <div
            className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs ${
              expiryUrgency === 'urgent'
                ? 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400'
                : expiryUrgency === 'soon'
                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400'
                  : 'bg-muted/50 text-muted-foreground'
            }`}
          >
            <Clock className="h-3 w-3 flex-shrink-0" />
            Expira: {new Date(reward.expiresAt).toLocaleDateString('es')}
          </div>
        )}

        {/* Action buttons */}
        {(onView || onEdit) && (
          <div className="flex gap-2 pt-1">
            {onView && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-8 text-xs"
                onClick={() => onView(reward)}
                aria-label={`Ver detalles de ${reward.name}`}
              >
                Ver detalles
              </Button>
            )}
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3"
                onClick={() => onEdit(reward)}
                aria-label={`Editar ${reward.name}`}
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
