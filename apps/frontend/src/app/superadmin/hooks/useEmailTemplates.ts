import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';

export interface EmailTemplate {
  id: string;
  name: string;
  slug: string;
  subject: string;
  html_content: string;
  text_content: string | null;
  category: 'auth' | 'billing' | 'system' | 'marketing';
  description: string | null;
  variables: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

interface UseEmailTemplatesOptions {
  category?: string;
  search?: string;
}

/**
 * Hook para gestionar email templates
 */
export function useEmailTemplates(options: UseEmailTemplatesOptions = {}) {
  const { category, search } = options;
  const queryClient = useQueryClient();

  // Construir query params
  const params = new URLSearchParams();
  if (category) params.append('category', category);
  if (search) params.append('search', search);

  // Fetch templates
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['email-templates', category, search],
    queryFn: async () => {
      const url = `/api/superadmin/email-templates${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al cargar plantillas');
      }
      
      return response.json();
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (newTemplate: Partial<EmailTemplate>) => {
      const response = await fetch('/api/superadmin/email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTemplate),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear plantilla');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success('Plantilla creada', {
        description: 'La plantilla de email se creó correctamente',
      });
    },
    onError: (error: Error) => {
      toast.error('Error al crear plantilla', {
        description: error.message,
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<EmailTemplate> }) => {
      const response = await fetch(`/api/superadmin/email-templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar plantilla');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success('Plantilla actualizada', {
        description: 'Los cambios se guardaron correctamente',
      });
    },
    onError: (error: Error) => {
      toast.error('Error al actualizar plantilla', {
        description: error.message,
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/superadmin/email-templates/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar plantilla');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success('Plantilla eliminada', {
        description: 'La plantilla se eliminó correctamente',
      });
    },
    onError: (error: Error) => {
      toast.error('Error al eliminar plantilla', {
        description: error.message,
      });
    },
  });

  return {
    templates: (data?.templates as EmailTemplate[]) || [],
    total: data?.total || 0,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    refresh: refetch,
    createTemplate: createMutation.mutateAsync,
    updateTemplate: updateMutation.mutateAsync,
    deleteTemplate: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
