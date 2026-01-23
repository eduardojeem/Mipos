'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';

export interface AdminProfile {
  id: string;
  email: string;
  fullName: string;
  role: string;
  phone?: string;
  bio?: string;
  location?: string;
  avatar?: string;
  createdAt: string;
  updatedAt?: string;
  lastLogin?: string;
  permissions: string[];
  recentActivity: Array<{
    action: string;
    resource_type: string;
    created_at: string;
    ip_address: string;
  }>;
  twoFactorEnabled: boolean;
}

export interface ProfileUpdateData {
  fullName?: string;
  phone?: string;
  bio?: string;
  location?: string;
  avatar?: string;
}

export interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
}

export function useAdminProfile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Obtener perfil de administrador
  const {
    data: profile,
    isLoading,
    error,
    refetch
  } = useQuery<AdminProfile>({
    queryKey: ['admin-profile'],
    queryFn: async () => {
      const response = await api.get('/admin/profile');
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: 2,
  });

  // Actualizar perfil
  const updateProfileMutation = useMutation({
    mutationFn: async (updates: ProfileUpdateData) => {
      const response = await api.put('/admin/profile', updates);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-profile'] });
      toast({
        title: 'Perfil actualizado',
        description: 'Los cambios se han guardado correctamente.',
      });
    },
    onError: (error: any) => {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'No se pudo actualizar el perfil.',
        variant: 'destructive'
      });
    }
  });

  // Cambiar contraseña
  const changePasswordMutation = useMutation({
    mutationFn: async (passwordData: PasswordChangeData) => {
      const response = await api.patch('/admin/profile', passwordData);
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: 'Contraseña actualizada',
        description: 'Tu contraseña se ha cambiado correctamente.',
      });
    },
    onError: (error: any) => {
      console.error('Error changing password:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'No se pudo cambiar la contraseña.',
        variant: 'destructive'
      });
    }
  });

  // Subir avatar
  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('avatar', file);
      
      const response = await api.post('/admin/profile/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-profile'] });
      toast({
        title: 'Avatar actualizado',
        description: 'Tu foto de perfil se ha actualizado correctamente.',
      });
    },
    onError: (error: any) => {
      console.error('Error uploading avatar:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'No se pudo subir la imagen.',
        variant: 'destructive'
      });
    }
  });

  return {
    profile,
    isLoading,
    error,
    refetch,
    updateProfile: updateProfileMutation.mutate,
    isUpdatingProfile: updateProfileMutation.isPending,
    changePassword: changePasswordMutation.mutate,
    isChangingPassword: changePasswordMutation.isPending,
    uploadAvatar: uploadAvatarMutation.mutate,
    isUploadingAvatar: uploadAvatarMutation.isPending,
  };
}

// Hook para estadísticas del perfil
export function useAdminProfileStats() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-profile-stats'],
    queryFn: async () => {
      const response = await api.get('/admin/profile/stats');
      return response.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
  });

  return {
    stats,
    isLoading,
  };
}

// Hook para actividad reciente
export function useAdminActivity(limit: number = 10) {
  const { data: activity, isLoading } = useQuery({
    queryKey: ['admin-activity', limit],
    queryFn: async () => {
      const response = await api.get(`/admin/profile/activity?limit=${limit}`);
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
  });

  return {
    activity,
    isLoading,
  };
}