'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

interface MediaUploaderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MediaUploader({ open, onOpenChange }: MediaUploaderProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [originalName, setOriginalName] = useState('');
  const [url, setUrl] = useState('');
  const [mimeType, setMimeType] = useState('image/jpeg');
  const [size, setSize] = useState<number>(0);
  const [folder, setFolder] = useState('general');
  const [caption, setCaption] = useState('');

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/content/media', {
        originalName, url, mimeType, size, folder, caption
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['content-media'] });
      qc.invalidateQueries({ queryKey: ['content-stats'] });
      toast({ title: 'Archivo creado', description: 'El archivo se registró correctamente.' });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: 'Error', description: 'No se pudo registrar el archivo.', variant: 'destructive' });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Subir Archivos</DialogTitle>
        </DialogHeader>
        <form className="p-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <Label>Nombre Original</Label>
            <Input value={originalName} onChange={(e) => setOriginalName(e.target.value)} required />
          </div>
          <div>
            <Label>URL</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} required />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Mime Type</Label>
              <Input value={mimeType} onChange={(e) => setMimeType(e.target.value)} />
            </div>
            <div>
              <Label>Tamaño (bytes)</Label>
              <Input type="number" value={size} onChange={(e) => setSize(Number(e.target.value))} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Carpeta</Label>
              <Input value={folder} onChange={(e) => setFolder(e.target.value)} />
            </div>
            <div>
              <Label>Descripción</Label>
              <Textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={3} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={createMutation.isPending}>Crear</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
