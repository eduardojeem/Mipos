'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { WebPage } from '../hooks/useContent';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

interface PageEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  page?: WebPage | null;
  isEditMode: boolean;
}

export function PageEditor({ open, onOpenChange, page, isEditMode }: PageEditorProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [title, setTitle] = useState(page?.title || '');
  const [slug, setSlug] = useState(page?.slug || '');
  const [category, setCategory] = useState(page?.category || 'Principal');
  const [metaDescription, setMetaDescription] = useState(page?.metaDescription || '');
  const [content, setContent] = useState(page?.content || '');
  const [isPublished, setIsPublished] = useState(!!page?.isPublished);

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/content/pages', {
        title, slug, category, metaDescription, content, isPublished
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['content-pages'] });
      qc.invalidateQueries({ queryKey: ['content-stats'] });
      toast({ title: 'Página creada', description: 'La página se creó correctamente.' });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: 'Error', description: 'No se pudo crear la página.', variant: 'destructive' });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.put('/content/pages', {
        id: page?.id,
        updates: { title, slug, category, metaDescription, content, isPublished }
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['content-pages'] });
      qc.invalidateQueries({ queryKey: ['content-stats'] });
      toast({ title: 'Página actualizada', description: 'Cambios guardados correctamente.' });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: 'Error', description: 'No se pudo actualizar la página.', variant: 'destructive' });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditMode && page?.id) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Editar Página' : 'Nueva Página'}
          </DialogTitle>
        </DialogHeader>
        <form className="p-6 space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Título</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div>
              <Label>Slug</Label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Categoría</Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Checkbox checked={isPublished} onCheckedChange={(v) => setIsPublished(!!v)} />
              <span>Publicado</span>
            </div>
          </div>
          <div>
            <Label>Meta descripción</Label>
            <Textarea value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} rows={3} />
          </div>
          <div>
            <Label>Contenido (HTML)</Label>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={6} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {isEditMode ? 'Guardar cambios' : 'Crear página'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
