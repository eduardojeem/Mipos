'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Trophy, Users, Star, ChevronRight, Plus, Trash2, Percent, Loader2 } from 'lucide-react';
import { useTierPromotionLinks, useLinkPromotionToTier, useUnlinkPromotionFromTier } from '@/hooks/use-promotion-links';

interface LoyaltyProgram {
  id: string;
  name: string;
  description: string;
  pointsPerPurchase: number;
  minimumPurchase: number;
  isActive: boolean;
  members: number;
  tier?: string;
  color?: string;
}

interface ProgramCardProps {
  program: LoyaltyProgram;
  onView?: (program: LoyaltyProgram) => void;
  onEdit?: (program: LoyaltyProgram) => void;
}

export function ProgramCard({ program, onView: _onView, onEdit }: ProgramCardProps) {
  const { data: links = [], isPending } = useTierPromotionLinks(program.id);
  const linkMutation = useLinkPromotionToTier();
  const unlinkMutation = useUnlinkPromotionFromTier();
  const [newPromotionId, setNewPromotionId] = useState('');
  const [promoOpen, setPromoOpen] = useState(false);

  const accentColor = program.color || '#8b5cf6';

  const handleLinkPromotion = () => {
    if (!newPromotionId.trim()) return;
    linkMutation.mutate(
      { tierId: program.id, promotionId: newPromotionId.trim() },
      { onSuccess: () => setNewPromotionId('') }
    );
  };

  const handleUnlinkPromotion = (promotionId: string) => {
    unlinkMutation.mutate({ tierId: program.id, promotionId });
  };

  return (
    <Card
      className="group overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
      style={{ borderTopColor: accentColor, borderTopWidth: 3 }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="flex-shrink-0 rounded-xl p-2.5"
              style={{ backgroundColor: `${accentColor}18` }}
            >
              <Trophy className="h-5 w-5" style={{ color: accentColor }} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <CardTitle className="truncate text-base" title={program.name}>
                {program.name}
              </CardTitle>
              <span
                className={`inline-flex items-center mt-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  program.isActive
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                <span
                  className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${
                    program.isActive ? 'bg-emerald-500' : 'bg-muted-foreground'
                  }`}
                />
                {program.isActive ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          </div>

          <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onEdit(program)}
                aria-label={`Editar ${program.name}`}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {program.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{program.description}</p>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div className="rounded-lg bg-muted/40 px-2 py-2">
            <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-0.5">
              <Star className="h-3 w-3" />
              Pts/compra
            </div>
            <div className="font-bold">{program.pointsPerPurchase}x</div>
          </div>
          <div className="rounded-lg bg-muted/40 px-2 py-2">
            <div className="text-muted-foreground text-xs mb-0.5">Mín. compra</div>
            <div className="font-bold">${program.minimumPurchase.toLocaleString('es')}</div>
          </div>
          <div className="rounded-lg bg-muted/40 px-2 py-2">
            <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-0.5">
              <Users className="h-3 w-3" />
              Miembros
            </div>
            <div className="font-bold">{program.members.toLocaleString('es')}</div>
          </div>
        </div>

        <Separator />

        {/* Promotions section — now in a Popover, not inline */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Percent className="h-3.5 w-3.5" />
            {isPending ? (
              'Cargando...'
            ) : (
              <>
                <span className="font-semibold text-foreground">{links.length}</span>{' '}
                {links.length === 1 ? 'promoción vinculada' : 'promociones vinculadas'}
              </>
            )}
          </div>
          <Popover open={promoOpen} onOpenChange={setPromoOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs">
                <Plus className="h-3 w-3" />
                Gestionar
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Percent className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold text-sm">Promociones vinculadas</span>
                </div>

                {links.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sin promociones vinculadas.</p>
                ) : (
                  <div className="space-y-1.5">
                    {links.map((l) => (
                      <div key={l.promotionId} className="flex items-center justify-between rounded-lg bg-muted/40 px-2 py-1.5">
                        <span className="font-mono text-xs">{l.promotionId}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:text-destructive"
                          onClick={() => handleUnlinkPromotion(l.promotionId)}
                          disabled={unlinkMutation.isPending}
                          aria-label={`Desvincular ${l.promotionId}`}
                        >
                          {unlinkMutation.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <Separator />
                <div className="flex gap-2">
                  <Input
                    placeholder="ID de promoción..."
                    value={newPromotionId}
                    onChange={(e) => setNewPromotionId(e.target.value)}
                    className="h-8 flex-1 text-xs"
                    onKeyDown={(e) => e.key === 'Enter' && handleLinkPromotion()}
                    aria-label="ID de promoción a vincular"
                  />
                  <Button
                    size="sm"
                    className="h-8"
                    onClick={handleLinkPromotion}
                    disabled={linkMutation.isPending || !newPromotionId.trim()}
                    aria-label="Vincular promoción"
                  >
                    {linkMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </CardContent>
    </Card>
  );
}
