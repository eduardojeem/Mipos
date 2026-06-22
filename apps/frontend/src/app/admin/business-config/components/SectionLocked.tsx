'use client';

import { Lock, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';

interface SectionLockedProps {
  sectionLabel: string;
  requiredPlan: string;
  currentPlan?: string;
}

export function SectionLocked({ sectionLabel, requiredPlan, currentPlan }: SectionLockedProps) {
  return (
    <Card className="border-amber-200/50 bg-amber-50/50 dark:border-amber-900/30 dark:bg-amber-950/10">
      <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center space-y-4">
        {/* Lock icon */}
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/30">
          <Lock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">
            {sectionLabel} requiere plan {requiredPlan}
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {currentPlan ? (
              <>
                Tu plan actual es <span className="font-medium">{currentPlan}</span>.{' '}
                Actualiza a <span className="font-medium">{requiredPlan}</span> para desbloquear esta sección.
              </>
            ) : (
              <>Actualiza tu plan para acceder a esta sección.</>
            )}
          </p>
        </div>

        {/* CTA Button */}
        <Button asChild className="gap-2 bg-amber-600 hover:bg-amber-700">
          <Link href="/admin/subscriptions">
            <Sparkles className="h-4 w-4" />
            Ver planes y upgrade
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
