'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { getErrorMessage } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import type { CategoryWithCount } from '../hooks/useCategoryManagement';
import api from '@/lib/api';
import { buildCategoryTree, flattenCategoryTree, getDescendantIds } from '../utils/categoryTree';

interface CategoryEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: CategoryWithCount | null;
  allCategories: CategoryWithCount[];
  onSuccess: () => void;
  getOrgId: () => string | null;
}

export function CategoryEditModal({ open, onOpenChange, category, allCategories, onSuccess, getOrgId }: CategoryEditModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<{ name: string; description: string; is_active: boolean; parent_id: string | null }>({
    name: '',
    description: '',
    is_active: true,
    parent_id: null,
  });
  const [submitting, setSubmitting] = useState(false);

  const invalidParentIds = useMemo(() => {
    if (!category) return new Set<string>();
    const descendants = getDescendantIds(allCategories, category.id);
    const out = new Set<string>(descendants);
    out.add(category.id);
    return out;
  }, [allCategories, category]);

  const parentOptions = useMemo(() => {
    const tree = buildCategoryTree(allCategories);
    const expandedAll = new Set(allCategories.map((item) => item.id));
    const rows = flattenCategoryTree(tree, expandedAll);
    return rows
      .filter(({ node }) => !invalidParentIds.has(node.id))
      .map(({ node, level }) => ({
        id: node.id,
        name: node.name,
        level,
      }));
  }, [allCategories, invalidParentIds]);

  useEffect(() => {
    if (open) {
      setFormData({
        name: category?.name || '',
        description: category?.description || '',
        is_active: category?.is_active ?? true,
        parent_id: ((category as unknown as Record<string, unknown>)?.parent_id as string) ?? null,
      });
    }
  }, [open, category]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const name = formData.name.trim();
    const description = formData.description.trim();

    if (!name) {
      toast({ title: 'Error', description: 'El nombre es requerido', variant: 'destructive' });
      return;
    }

    setSubmitting(true);

    try {
      const orgId = getOrgId();
      if (!orgId) throw new Error('No hay organización seleccionada');

      const payload = {
        name,
        description,
        is_active: formData.is_active,
        parent_id: formData.parent_id,
      };

      if (category) {
        const res = await api.put(`/categories/${category.id}`, payload);
        if (!res.data?.success) {
          throw new Error(res.data?.error || 'No se pudo actualizar la categoría');
        }
        toast({ title: 'Categoría actualizada' });
      } else {
        const res = await api.post('/categories', payload);
        if (!res.data?.success) {
          throw new Error(res.data?.error || 'No se pudo crear la categoría');
        }
        toast({ title: 'Categoría creada' });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{category ? 'Editar categoría' : 'Nueva categoría'}</DialogTitle>
          <DialogDescription>
            {category ? 'Modifica los datos de la categoría.' : 'Crea una nueva categoría de productos.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Ej: Maquillaje"
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="description">Descripción</Label>
              <span className="text-xs text-muted-foreground">{formData.description.length}/200</span>
            </div>
            <Input
              id="description"
              value={formData.description}
              onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Descripción opcional corta"
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label>Categoría padre</Label>
            <Select
              value={formData.parent_id ?? '__root__'}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, parent_id: value === '__root__' ? null : value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sin padre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__root__">Sin padre</SelectItem>
                {parentOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    <span className="flex items-center gap-2">
                      <span className="inline-block" style={{ width: option.level * 12 }} />
                      <span className="truncate">{option.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-md border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="is_active" className="text-sm font-medium cursor-pointer">Categoría activa</Label>
              <p className="text-sm text-muted-foreground">
                {formData.is_active ? 'Visible en el catálogo' : 'Oculta en el catálogo'}
              </p>
            </div>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {category ? 'Guardar cambios' : 'Crear categoría'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
