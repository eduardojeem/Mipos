'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Trophy, Eye, Edit, Users, Medal, Percent, Plus, Trash2 } from 'lucide-react';
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

export function ProgramCard({ program, onView, onEdit }: ProgramCardProps) {
  const { data: links = [], isPending } = useTierPromotionLinks(program.id);
  const linkMutation = useLinkPromotionToTier();
  const unlinkMutation = useUnlinkPromotionFromTier();
  const [newPromotionId, setNewPromotionId] = useState('');

  const handleLinkPromotion = () => {
    if (!newPromotionId.trim()) return;
    linkMutation.mutate(
      { tierId: program.id, promotionId: newPromotionId.trim() },
      {
        onSuccess: () => {
          setNewPromotionId('');
        },
      }
    );
  };

  const handleUnlinkPromotion = (promotionId: string) => {
    unlinkMutation.mutate({ tierId: program.id, promotionId });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        className="hover:shadow-lg transition-all duration-300 border-l-4"
        style={{ borderLeftColor: program.color || '#3b82f6' }}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="p-2 rounded-lg"
                style={{ backgroundColor: `${program.color || '#3b82f6'}20` }}
              >
                <Trophy
                  className="h-5 w-5"
                  style={{ color: program.color || '#3b82f6' }}
                  aria-hidden="true"
                />
              </div>
              <div>
                <CardTitle className="text-lg">{program.name}</CardTitle>
                <Badge variant={program.isActive ? 'default' : 'secondary'} className="mt-1">
                  {program.isActive ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
            </div>
            <div className="flex gap-2">
              {onView && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onView(program)}
                  aria-label={`Ver detalles de ${program.name}`}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              )}
              {onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(program)}
                  aria-label={`Editar ${program.name}`}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">{program.description}</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Puntos por compra:</span>
              <div className="font-semibold">{program.pointsPerPurchase}x</div>
            </div>
            <div>
              <span className="text-muted-foreground">Compra mínima:</span>
              <div className="font-semibold">${program.minimumPurchase}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Miembros:</span>
              <div className="font-semibold flex items-center gap-1">
                <Users className="h-3 w-3" aria-hidden="true" />
                {program.members.toLocaleString()}
              </div>
            </div>
            {program.tier && (
              <div>
                <span className="text-muted-foreground">Nivel:</span>
                <div className="font-semibold flex items-center gap-1">
                  <Medal className="h-3 w-3" aria-hidden="true" />
                  {program.tier}
                </div>
              </div>
            )}
          </div>

          {/* Promociones vinculadas */}
          <Separator className="my-4" />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Percent className="w-4 h-4" aria-hidden="true" />
                Promociones vinculadas
              </h4>
              {isPending && (
                <span className="text-xs text-muted-foreground">Cargando…</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {links.length === 0 && (
                <Badge variant="outline" className="text-muted-foreground">
                  Sin vínculos
                </Badge>
              )}
              {links.map((l) => (
                <div key={l.promotionId} className="flex items-center gap-2">
                  <Badge>{l.promotionId}</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUnlinkPromotion(l.promotionId)}
                    disabled={unlinkMutation.isPending}
                    aria-label={`Desvincular promoción ${l.promotionId}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="ID de promoción (ej. PROMO-001)"
                value={newPromotionId}
                onChange={(e) => setNewPromotionId(e.target.value)}
                className="flex-1"
                aria-label="ID de promoción a vincular"
              />
              <Button
                onClick={handleLinkPromotion}
                disabled={linkMutation.isPending || !newPromotionId.trim()}
                className="gap-2"
                aria-label="Vincular promoción"
              >
                <Plus className="w-4 h-4" />
                Vincular
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
