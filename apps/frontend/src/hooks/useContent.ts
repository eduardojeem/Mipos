import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contentService, ContentFilters, CreateContentData, UpdateContentData } from '@/services/contentService';
import { toast } from 'sonner';

export function useContent(filters: ContentFilters = {}) {
  return useQuery({
    queryKey: ['content', filters],
    queryFn: () => contentService.getContent(filters),
    staleTime: 30000, // 30 seconds
    gcTime: 300000,   // 5 minutes
  });
}

export function useContentById(id: string) {
  return useQuery({
    queryKey: ['content', id],
    queryFn: () => contentService.getContentById(id),
    enabled: !!id,
  });
}

export function useCreateContent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateContentData) => contentService.createContent(data),
    onSuccess: (newContent) => {
      // Invalidate and refetch content queries
      queryClient.invalidateQueries({ queryKey: ['content'] });
      toast.success('Contenido creado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al crear contenido: ${error.message}`);
    },
  });
}

export function useUpdateContent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: UpdateContentData) => contentService.updateContent(data),
    onSuccess: (updatedContent) => {
      // Update the specific content item in cache
      queryClient.setQueryData(['content', updatedContent.id], updatedContent);
      // Invalidate content list queries
      queryClient.invalidateQueries({ queryKey: ['content'] });
      toast.success('Contenido actualizado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar contenido: ${error.message}`);
    },
  });
}

export function useDeleteContent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => contentService.deleteContent(id),
    onSuccess: () => {
      // Invalidate and refetch content queries
      queryClient.invalidateQueries({ queryKey: ['content'] });
      toast.success('Contenido eliminado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al eliminar contenido: ${error.message}`);
    },
  });
}

export function useDuplicateContent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => contentService.duplicateContent(id),
    onSuccess: () => {
      // Invalidate and refetch content queries
      queryClient.invalidateQueries({ queryKey: ['content'] });
      toast.success('Contenido duplicado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al duplicar contenido: ${error.message}`);
    },
  });
}