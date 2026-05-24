'use client';

import { useEffect, useCallback } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { createClient } from '@/lib/supabase';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  bio?: string;
  location?: string;
  avatar?: string;
  role: string;
  createdAt: string;
  updatedAt?: string;
  lastLogin?: string;
}

interface ProfileApiData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  bio?: string;
  location?: string;
  avatar_url?: string;
  role?: string;
  created_at?: string;
  updated_at?: string;
  lastLogin?: string;
}

interface UseProfileReturn {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  updateProfile: (data: Partial<UserProfile>) => Promise<boolean>;
  updateAvatar: (file: File) => Promise<boolean>;
  updateAvatarUrl: (avatarUrl: string) => Promise<boolean>;
  refreshProfile: () => Promise<unknown>;
}

function mapProfileData(data: ProfileApiData): UserProfile {
  return {
    id: data.id,
    name: data.name || 'Usuario',
    email: data.email || '',
    phone: data.phone || undefined,
    bio: data.bio || undefined,
    location: data.location || undefined,
    avatar: data.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.id}`,
    role: data.role || 'USER',
    createdAt: data.created_at || new Date().toISOString(),
    updatedAt: data.updated_at || undefined,
    lastLogin: data.lastLogin || undefined,
  };
}

function getMockProfile() {
  const mockId = 'mock-user';
  return {
    id: mockId,
    name: 'Usuario',
    email: 'usuario@sistema.com',
    phone: undefined,
    bio: undefined,
    location: undefined,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${mockId}`,
    role: 'USER',
    createdAt: new Date().toISOString(),
    updatedAt: undefined,
    lastLogin: undefined,
  } satisfies UserProfile;
}

export function useProfile(): UseProfileReturn {
  const queryClient = useQueryClient();
  const supabase = createClient();

  const fetchProfile = useCallback(async (): Promise<UserProfile | null> => {
    let isMockAuth = false;
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      const supabaseObj = supabase as unknown as { from?: unknown };
      isMockAuth = !session || !!sessionError || typeof supabaseObj.from !== 'function';
    } catch {
      isMockAuth = true;
    }

    if (isMockAuth) {
      return getMockProfile();
    }

    const response = await fetch('/api/auth/profile', { cache: 'no-store' });
    const json = await response.json().catch(() => ({}));

    if (!response.ok || !json?.data) {
      throw new Error(json?.error || 'No se pudo cargar el perfil');
    }

    return mapProfileData(json.data as ProfileApiData);
  }, [supabase]);

  const { data: profile, isLoading, error, refetch: refreshProfile } = useQuery({
    queryKey: ['profile'],
    queryFn: fetchProfile,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    refetchInterval: 5 * 60 * 1000,
  });

  const safeProfile = profile ?? null;
  const safeError = error instanceof Error ? error.message : (error ? String(error) : null);

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: Partial<UserProfile>) => {
      if (!profile) {
        throw new Error('No hay perfil cargado para actualizar');
      }

      let isMockAuth = false;
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        const supabaseObj = supabase as unknown as { from?: unknown };
        isMockAuth = !session || !!sessionError || typeof supabaseObj.from !== 'function';
      } catch {
        isMockAuth = true;
      }

      if (isMockAuth) {
        return { mock: true, profile: profile ? {
          ...profile,
          name: updates.name ?? profile.name,
          phone: updates.phone ?? profile.phone,
          avatar: updates.avatar ?? profile.avatar,
          bio: updates.bio ?? profile.bio,
          location: updates.location ?? profile.location,
          updatedAt: new Date().toISOString(),
        } : profile };
      }

      const payload: Record<string, unknown> = {};
      if (typeof updates.name === 'string') payload.name = updates.name;
      if (typeof updates.phone === 'string') payload.phone = updates.phone;
      if (typeof updates.avatar === 'string') payload.avatar_url = updates.avatar;
      if (typeof updates.location === 'string') payload.location = updates.location;
      if (typeof updates.bio === 'string') payload.bio = updates.bio;

      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok || !json?.success || !json?.data) {
        throw new Error(json?.error || 'Error al actualizar perfil');
      }

      return { mock: false, profile: mapProfileData(json.data as ProfileApiData) };
    },
    onSuccess: (result) => {
      if (result.mock) {
        toast.info('Modo mock: perfil actualizado localmente');
        queryClient.setQueryData(['profile'], result.profile);
      } else {
        toast.success('Perfil actualizado correctamente');
        queryClient.setQueryData(['profile'], result.profile);
      }
      broadcastUpdate();
    },
    onError: (err) => {
      const errorMessage = err instanceof Error ? err.message : 'Error al actualizar perfil';
      toast.error(errorMessage);
    },
  });

  const updateProfile = useCallback(async (updates: Partial<UserProfile>): Promise<boolean> => {
    try {
      await updateProfileMutation.mutateAsync(updates);
      return true;
    } catch {
      return false;
    }
  }, [updateProfileMutation]);

  const updateAvatarUrl = useCallback(async (avatarUrl: string): Promise<boolean> => {
    if (!profile) {
      toast.error('No hay perfil cargado');
      return false;
    }

    return updateProfile({ avatar: avatarUrl });
  }, [profile, updateProfile]);

  const updateAvatar = useCallback(async (file: File): Promise<boolean> => {
    if (!profile) {
      toast.error('No hay perfil cargado');
      return false;
    }

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Usuario no autenticado');
      }

      const supabaseObj = supabase as unknown as { storage?: unknown };
      if (!supabaseObj.storage) {
        throw new Error('Supabase Storage no configurado');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Error al subir imagen: ${uploadError.message}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return updateProfile({ avatar: publicUrl });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al actualizar avatar';
      toast.error(errorMessage);
      return false;
    }
  }, [profile, supabase, updateProfile]);

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'profile-updated') {
        refreshProfile();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [refreshProfile]);

  const broadcastUpdate = useCallback(() => {
    localStorage.setItem('profile-updated', Date.now().toString());
    localStorage.removeItem('profile-updated');
  }, []);

  return {
    profile: safeProfile,
    isLoading,
    error: safeError,
    updateProfile,
    updateAvatar,
    updateAvatarUrl,
    refreshProfile,
  };
}
