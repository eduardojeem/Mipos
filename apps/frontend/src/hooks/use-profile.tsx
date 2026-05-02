'use client';

import { useState, useEffect, useCallback } from 'react';
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
  refreshProfile: () => Promise<void>;
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
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let isMockAuth = false;
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        isMockAuth = !session || !!sessionError || typeof (supabase as any).from !== 'function';
      } catch {
        isMockAuth = true;
      }

      if (isMockAuth) {
        setProfile((prev) => prev ?? getMockProfile());
        return;
      }

      const response = await fetch('/api/auth/profile', { cache: 'no-store' });
      const json = await response.json().catch(() => ({}));

      if (!response.ok || !json?.data) {
        throw new Error(json?.error || 'No se pudo cargar el perfil');
      }

      setProfile(mapProfileData(json.data as ProfileApiData));
    } catch (primaryErr) {
      console.warn('Primary profile fetch failed, using auth fallback:', primaryErr);

      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw new Error(`Error de autenticacion: ${authError.message}`);
        if (!user) throw new Error('Usuario no autenticado');

        const metadata = (user.user_metadata || {}) as Record<string, unknown>;
        const fallbackProfile: UserProfile = {
          id: user.id,
          name: String(metadata.full_name || metadata.name || user.email?.split('@')[0] || 'Usuario'),
          email: user.email || '',
          phone: typeof metadata.phone === 'string' ? metadata.phone : undefined,
          bio: typeof metadata.bio === 'string' ? metadata.bio : undefined,
          location: typeof metadata.location === 'string' ? metadata.location : undefined,
          avatar: typeof metadata.avatar_url === 'string'
            ? metadata.avatar_url
            : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
          role: String(metadata.role || 'USER'),
          createdAt: user.created_at || new Date().toISOString(),
          updatedAt: typeof user.updated_at === 'string' ? user.updated_at : undefined,
          lastLogin: typeof user.last_sign_in_at === 'string' ? user.last_sign_in_at : undefined,
        };

        setProfile(fallbackProfile);
      } catch (fallbackErr) {
        const errorMessage = fallbackErr instanceof Error ? fallbackErr.message : 'Error desconocido';
        setError(errorMessage);
        console.error('Error loading profile:', fallbackErr);
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>): Promise<boolean> => {
    if (!profile) {
      toast.error('No hay perfil cargado para actualizar');
      return false;
    }

    try {
      setIsLoading(true);
      setError(null);

      let isMockAuth = false;
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        isMockAuth = !session || !!sessionError || typeof (supabase as any).from !== 'function';
      } catch {
        isMockAuth = true;
      }

      if (isMockAuth) {
        setProfile((prev) => prev ? {
          ...prev,
          name: updates.name ?? prev.name,
          phone: updates.phone ?? prev.phone,
          avatar: updates.avatar ?? prev.avatar,
          bio: updates.bio ?? prev.bio,
          location: updates.location ?? prev.location,
          updatedAt: new Date().toISOString(),
        } : prev);
        toast.info('Modo mock: perfil actualizado localmente');
        return true;
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

      setProfile(mapProfileData(json.data as ProfileApiData));
      toast.success('Perfil actualizado correctamente');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al actualizar perfil';
      setError(errorMessage);
      toast.error(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [profile, supabase]);

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
      setIsLoading(true);
      setError(null);

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Usuario no autenticado');
      }

      if (!(supabase as any).storage) {
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
      setError(errorMessage);
      toast.error(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [profile, supabase, updateProfile]);

  const refreshProfile = useCallback(async () => {
    await loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isLoading) {
        refreshProfile();
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isLoading, refreshProfile]);

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

  const enhancedUpdateProfile = useCallback(async (data: Partial<UserProfile>): Promise<boolean> => {
    const success = await updateProfile(data);
    if (success) {
      broadcastUpdate();
    }
    return success;
  }, [updateProfile, broadcastUpdate]);

  const enhancedUpdateAvatar = useCallback(async (file: File): Promise<boolean> => {
    const success = await updateAvatar(file);
    if (success) {
      broadcastUpdate();
    }
    return success;
  }, [updateAvatar, broadcastUpdate]);

  const enhancedUpdateAvatarUrl = useCallback(async (avatarUrl: string): Promise<boolean> => {
    const success = await updateAvatarUrl(avatarUrl);
    if (success) {
      broadcastUpdate();
    }
    return success;
  }, [updateAvatarUrl, broadcastUpdate]);

  return {
    profile,
    isLoading,
    error,
    updateProfile: enhancedUpdateProfile,
    updateAvatar: enhancedUpdateAvatar,
    updateAvatarUrl: enhancedUpdateAvatarUrl,
    refreshProfile,
  };
}
