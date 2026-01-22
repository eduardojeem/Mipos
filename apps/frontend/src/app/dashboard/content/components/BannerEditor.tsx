'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Banner } from '../hooks/useContent';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

interface BannerEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  banner?: Banner | null;
  isEditMode: boolean;
}

export function BannerEditor({ open, onOpenChange, banner, isEditMode }: BannerEditorProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [title, setTitle] = useState(banner?.title || '');
  const [description, setDescription] = useState(banner?.description || '');
  const [imageUrl, setImageUrl] = useState(banner?.imageUrl || '');
  const [linkUrl, setLinkUrl] = useState(banner?.linkUrl || '');
  const [position, setPosition] = useState<Banner['position']>(banner?.position || 'HERO');
  const [isActive, setIsActive] = useState(!!banner?.isActive);
  const [order, setOrder] = useState<number>(banner?.order ?? 1);

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/content/banners', {
        title, description, imageUrl, linkUrl, position, isActive, order
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['content-banners'] });
      qc.invalidateQueries({ queryKey: ['content-stats'] });
      toast({ title: 'Banner creado', description: 'El banner se creó correctamente.' });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: 'Error', description: 'No se pudo crear el banner.', variant: 'destructive' });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.put('/content/banners', {
        id: banner?.id,
        updates: { title, description, imageUrl, linkUrl, position, isActive, order }
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['content-banners'] });
      qc.invalidateQueries({ queryKey: ['content-stats'] });
      toast({ title: 'Banner actualizado', description: 'Cambios guardados correctamente.' });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: 'Error', description: 'No se pudo actualizar el banner.', variant: 'destructive' });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditMode && banner?.id) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Editar Banner' : 'Nuevo Banner'}
          </DialogTitle>
        </DialogHeader>
        <form className="p-6 space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Título</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div>
              <Label>Posición</Label>
              <Input value={position} onChange={(e) => setPosition(e.target.value as Banner['position'])} />
            </div>
          </div>
          <div>
            <Label>Descripción</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>URL de Imagen</Label>
              <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
            </div>
            <div>
              <Label>Enlace</Label>
              <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2 pt-6">
              <Checkbox checked={isActive} onCheckedChange={(v) => setIsActive(!!v)} />
              <span>Activo</span>
            </div>
            <div>
              <Label>Orden</Label>
              <Input type="number" value={order} onChange={(e) => setOrder(Number(e.target.value))} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {isEditMode ? 'Guardar cambios' : 'Crear banner'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
