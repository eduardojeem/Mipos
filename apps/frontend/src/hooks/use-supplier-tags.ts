'use client';

import { useState, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { SupplierTag } from '@/types/suppliers';
import api from '@/lib/api';

interface TaggedSupplier {
  id: string;
  name: string;
  email: string;
  tags: SupplierTag[];
  category: string;
  status: string;
}

interface TagsState {
  tags: SupplierTag[];
  suppliers: TaggedSupplier[];
  loading: boolean;
  error: string | null;
}

interface TagFormData {
  name: string;
  color: string;
  description: string;
  category: 'performance' | 'location' | 'product' | 'relationship' | 'custom';
}

export function useSupplierTags() {
  const { toast } = useToast();
  const [state, setState] = useState<TagsState>({
    tags: [],
    suppliers: [],
    loading: true,
    error: null
  });

  const loadTags = useCallback(async () => {
    try {
      const response = await api.get('/suppliers/tags');
      return response.data;
    } catch (error) {
      console.error('Error loading tags:', error);
      // Mock data for development
      return [
        {
          id: '1',
          name: 'Premium',
          color: '#22c55e',
          description: 'Proveedores de alta calidad y confiabilidad',
          category: 'performance',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
          supplierCount: 8
        },
        {
          id: '2',
          name: 'Local',
          color: '#3b82f6',
          description: 'Proveedores locales',
          category: 'location',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
          supplierCount: 12
        },
        {
          id: '3',
          name: 'Tecnología',
          color: '#8b5cf6',
          description: 'Proveedores de productos tecnológicos',
          category: 'product',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
          supplierCount: 6
        },
        {
          id: '4',
          name: 'Estratégico',
          color: '#f59e0b',
          description: 'Proveedores estratégicos para el negocio',
          category: 'relationship',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
          supplierCount: 4
        }
      ];
    }
  }, []);

  const loadSuppliers = useCallback(async () => {
    try {
      const response = await api.get('/suppliers?include=tags');
      return response.data.suppliers || [];
    } catch (error) {
      console.error('Error loading suppliers:', error);
      // Mock data for development
      return [
        {
          id: '1',
          name: 'TechSupply Corp',
          email: 'contact@techsupply.com',
          category: 'Tecnología',
          status: 'active',
          tags: [
            { id: '1', name: 'Premium', color: '#22c55e', category: 'performance', createdAt: '', updatedAt: '', supplierCount: 0 },
            { id: '3', name: 'Tecnología', color: '#8b5cf6', category: 'product', createdAt: '', updatedAt: '', supplierCount: 0 }
          ]
        },
        {
          id: '2',
          name: 'Local Materials',
          email: 'info@localmaterials.com',
          category: 'Materiales',
          status: 'active',
          tags: [
            { id: '2', name: 'Local', color: '#3b82f6', category: 'location', createdAt: '', updatedAt: '', supplierCount: 0 }
          ]
        }
      ];
    }
  }, []);

  const loadData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const [tags, suppliers] = await Promise.all([loadTags(), loadSuppliers()]);
      setState({
        tags,
        suppliers,
        loading: false,
        error: null
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Error loading data'
      }));
    }
  }, [loadTags, loadSuppliers]);

  const createTag = useCallback(async (formData: TagFormData) => {
    if (!formData.name.trim()) {
      toast({
        title: 'Error',
        description: 'El nombre de la etiqueta es requerido',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const response = await api.post('/suppliers/tags', formData);
      setState(prev => ({
        ...prev,
        tags: [...prev.tags, response.data]
      }));
      toast({
        title: 'Éxito',
        description: 'Etiqueta creada correctamente',
      });
      return true;
    } catch (error) {
      console.error('Error creating tag:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear la etiqueta',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  const updateTag = useCallback(async (tagId: string, formData: TagFormData) => {
    if (!formData.name.trim()) return false;
    
    try {
      const response = await api.put(`/suppliers/tags/${tagId}`, formData);
      setState(prev => ({
        ...prev,
        tags: prev.tags.map(tag => tag.id === tagId ? response.data : tag)
      }));
      toast({
        title: 'Éxito',
        description: 'Etiqueta actualizada correctamente',
      });
      return true;
    } catch (error) {
      console.error('Error updating tag:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la etiqueta',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  const deleteTag = useCallback(async (tagId: string) => {
    try {
      await api.delete(`/suppliers/tags/${tagId}`);
      setState(prev => ({
        ...prev,
        tags: prev.tags.filter(tag => tag.id !== tagId)
      }));
      toast({
        title: 'Éxito',
        description: 'Etiqueta eliminada correctamente',
      });
      return true;
    } catch (error) {
      console.error('Error deleting tag:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la etiqueta',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  const assignTags = useCallback(async (supplierIds: string[], tagId: string) => {
    if (supplierIds.length === 0) return false;

    try {
      await api.post('/suppliers/tags/assign', {
        supplierIds,
        tagId
      });
      
      const tag = state.tags.find(t => t.id === tagId);
      if (tag) {
        setState(prev => ({
          ...prev,
          suppliers: prev.suppliers.map(supplier => 
            supplierIds.includes(supplier.id) 
              ? { ...supplier, tags: [...supplier.tags, tag] }
              : supplier
          )
        }));
      }
      
      toast({
        title: 'Éxito',
        description: `Etiqueta asignada a ${supplierIds.length} proveedores`,
      });
      return true;
    } catch (error) {
      console.error('Error assigning tags:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron asignar las etiquetas',
        variant: 'destructive',
      });
      return false;
    }
  }, [state.tags, toast]);

  const removeTagFromSupplier = useCallback(async (supplierId: string, tagId: string) => {
    try {
      await api.delete(`/suppliers/${supplierId}/tags/${tagId}`);
      
      setState(prev => ({
        ...prev,
        suppliers: prev.suppliers.map(supplier => 
          supplier.id === supplierId 
            ? { ...supplier, tags: supplier.tags.filter(tag => tag.id !== tagId) }
            : supplier
        )
      }));
      
      toast({
        title: 'Éxito',
        description: 'Etiqueta removida correctamente',
      });
      return true;
    } catch (error) {
      console.error('Error removing tag:', error);
      toast({
        title: 'Error',
        description: 'No se pudo remover la etiqueta',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  return {
    ...state,
    loadData,
    createTag,
    updateTag,
    deleteTag,
    assignTags,
    removeTagFromSupplier
  };
}