'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

type ResolutionStrategy = 'client_wins' | 'server_wins' | 'merge_fields' | 'last_write_wins';

interface ConflictResolutionModalProps {
  open: boolean;
  onClose: () => void;
  localRecord: any;
  remoteRecord: any;
  fields?: string[];
  onResolve: (strategy: ResolutionStrategy) => void;
}

function FieldDiff({ label, localValue, remoteValue }: { label: string; localValue: any; remoteValue: any }) {
  const changed = JSON.stringify(localValue) !== JSON.stringify(remoteValue);
  return (
    <div className="grid grid-cols-3 gap-3 items-start py-2">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-sm">
        <Badge variant={changed ? 'default' : 'outline'}>Local</Badge>
        <span className="ml-2 break-words">{String(localValue ?? '')}</span>
      </div>
      <div className="text-sm">
        <Badge variant={changed ? 'destructive' : 'outline'}>Servidor</Badge>
        <span className="ml-2 break-words">{String(remoteValue ?? '')}</span>
      </div>
    </div>
  );
}

export default function ConflictResolutionModal({ open, onClose, localRecord, remoteRecord, fields, onResolve }: ConflictResolutionModalProps) {
  const diffFields = fields && fields.length > 0 ? fields : Object.keys({ ...(localRecord || {}), ...(remoteRecord || {}) });

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? undefined : onClose())}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Conflicto de edición detectado</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Diferencias entre tu edición y la versión del servidor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-3 gap-3 font-medium text-xs text-muted-foreground">
                <div>Campo</div>
                <div>Local</div>
                <div>Servidor</div>
              </div>
              <Separator />
              {diffFields.map((f) => (
                <FieldDiff key={f} label={f} localValue={localRecord?.[f]} remoteValue={remoteRecord?.[f]} />
              ))}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button variant="secondary" onClick={() => onResolve('server_wins')}>Mantener cambios del servidor</Button>
            <Button variant="default" onClick={() => onResolve('client_wins')}>Mantener mis cambios</Button>
            <Button variant="default" onClick={() => onResolve('merge_fields')}>Mezclar campos</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}