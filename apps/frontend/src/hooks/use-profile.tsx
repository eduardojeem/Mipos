'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/lib/toast';
import { createClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase';

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

interface UseProfileReturn {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  updateProfile: (data: Partial<UserProfile>) => Promise<boolean>;
  updateAvatar: (file: File) => Promise<boolean>;
  updateAvatarUrl: (avatarUrl: string) => Promise<boolean>;
  refreshProfile: () => Promise<void>;
}

export function useProfile(): UseProfileReturn {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  // Load profile data from Supabase
  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Detectar modo mock: Supabase no configurado o cliente incompleto
      let isMockAuth = false;
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        isMockAuth = !session || !!sessionError || typeof (supabase as any).from !== 'function';
      } catch {
        isMockAuth = true;
      }

      if (isMockAuth) {
        // Evitar fetch a API y proporcionar perfil mínimo local para no romper la UI
        const mockId = 'mock-user';
        const mockEmail = 'usuario@sistema.com';
        const mockName = 'Usuario';
        const combinedProfile: UserProfile = {
          id: mockId,
          name: mockName,
          email: mockEmail,
          phone: undefined,
          bio: undefined,
          location: undefined,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${mockId}`,
          role: 'user',
          createdAt: new Date().toISOString(),
          updatedAt: undefined,
          lastLogin: undefined,
        };
        // Mantener perfil previo si existe, si no asignar el mock
        setProfile(prev => prev ?? combinedProfile);
        return;
      }

      // Preferir API interna que ya maneja fallback (users + auth)
      const response = await fetch('/api/auth/profile', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('No autorizado o perfil no disponible');
      }
      const json = await response.json();
      const data = json?.data;
      if (!data) {
        throw new Error('Perfil no disponible');
      }

      const combinedProfile: UserProfile = {
        id: data.id,
        name: data.name || 'Usuario',
        email: data.email || '',
        phone: data.phone || undefined,
        bio: undefined,
        location: data.location || undefined,
        avatar: data.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.id}`,
        role: data.role || 'user',
        createdAt: data.created_at || new Date().toISOString(),
        updatedAt: data.updated_at || undefined,
        lastLogin: data.lastLogin || undefined,
      };

      setProfile(combinedProfile);
    } catch (primaryErr) {
      console.warn('Fallo al obtener perfil via API, usando fallback Supabase:', primaryErr);
      // Fallback: usar cliente de Supabase directamente
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw new Error(`Error de autenticación: ${authError.message}`);
        if (!user) throw new Error('Usuario no autenticado');

        const { data: userData, error: userError } = await (supabase as any)
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (userError && userError.code !== 'PGRST116') {
          console.warn('Error al obtener datos de usuario:', userError);
        }

        const combinedProfile: UserProfile = {
          id: user.id,
          name: userData?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
          email: userData?.email || user.email || '',
          phone: userData?.phone || user.user_metadata?.phone || undefined,
          bio: user.user_metadata?.bio || undefined,
          location: user.user_metadata?.location || undefined,
          avatar: user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
          role: user.user_metadata?.role || 'user',
          createdAt: userData?.created_at || (user as any).created_at || new Date().toISOString(),
          updatedAt: userData?.updated_at || undefined,
          lastLogin: userData?.last_login || (user as any).last_sign_in_at || undefined,
        };

        setProfile(combinedProfile);
      } catch (fallbackErr) {
        const errorMessage = fallbackErr instanceof Error ? fallbackErr.message : 'Error desconocido';
        setError(errorMessage);
        if (/Supabase no configurado/i.test(errorMessage)) {
          console.warn('Perfil no disponible: Supabase no configurado (modo mock activo).');
        } else {
          console.error('Error loading profile (fallback):', fallbackErr);
          toast.error(errorMessage);
        }
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

      // Detectar modo mock para evitar llamadas a API en desarrollo sin Supabase
      let isMockAuth = false;
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        isMockAuth = !session || !!sessionError || typeof (supabase as any).from !== 'function';
      } catch {
        isMockAuth = true;
      }

      if (isMockAuth) {
        // Actualizar localmente el estado del perfil y evitar errores de red
        setProfile(prev => prev ? {
          ...prev,
          name: (updates.name ?? prev.name),
          phone: (updates.phone ?? prev.phone),
          avatar: (updates.avatar ?? prev.avatar),
          bio: (updates.bio ?? prev.bio),
          location: (updates.location ?? prev.location),
          updatedAt: new Date().toISOString(),
        } : prev);
        toast.info('Modo mock: perfil actualizado localmente');
        return true;
      }

      // Construir payload para API (usar avatar_url en vez de avatar)
      const payload: any = {};
      if (typeof updates.name === 'string') payload.name = updates.name;
      if (typeof updates.phone === 'string') payload.phone = updates.phone;
      if (typeof updates.avatar === 'string') payload.avatar_url = updates.avatar;
      if (typeof updates.location === 'string') payload.location = updates.location;
      if (typeof updates.bio === 'string') payload.bio = updates.bio;

      const resp = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        throw new Error('Error al actualizar perfil');
      }

      const result = await resp.json();
      const data = result?.data;
      if (!result.success || !data) {
        throw new Error(result?.error || 'Error al actualizar perfil');
      }

      setProfile(prev => prev ? {
        ...prev,
        name: (data.name ?? prev.name),
        phone: (data.phone ?? prev.phone),
        avatar: (data.avatar_url ?? prev.avatar),
        bio: (data.bio ?? prev.bio),
        location: (data.location ?? prev.location),
        updatedAt: (data.updated_at ?? new Date().toISOString()),
      } : prev);

      toast.success('Perfil actualizado correctamente');
      return true;
    } catch (apiErr) {
      console.warn('PUT /api/auth/profile falló, usando fallback Supabase:', apiErr);
      // Fallback: intentar actualización directa vía Supabase como antes
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error('Usuario no autenticado');

        const userUpdates: any = {
          email: updates.email || user.email || '',
          name: updates.name || (user.user_metadata?.full_name) || (user.email?.split('@')[0]) || 'Usuario',
          phone: updates.phone,
          is_active: true,
        };
        const cleanUpdates = Object.fromEntries(Object.entries(userUpdates).filter(([_, v]) => v !== undefined));
        const { error: upsertError } = await (supabase as any)
          .from('users')
          .upsert(cleanUpdates, { onConflict: 'id', ignoreDuplicates: false });
        if (upsertError) throw new Error(`Error al actualizar perfil: ${upsertError.message}`);

        const metadataUpdates: any = { ...user.user_metadata };
        if (updates.name) metadataUpdates.full_name = updates.name;
        if (updates.email) metadataUpdates.email = updates.email;
        if (updates.avatar) metadataUpdates.avatar_url = updates.avatar;
        if (updates.bio) metadataUpdates.bio = updates.bio;
        if (updates.location) metadataUpdates.location = updates.location;
        if (typeof (supabase as any).auth?.updateUser === 'function') {
          const { error: metadataError } = await (supabase as any).auth.updateUser({ data: metadataUpdates, ...(updates.email && { email: updates.email }) });
          if (metadataError) console.warn('Error al actualizar metadata:', metadataError);
        } else {
          console.warn('updateUser no disponible: Supabase no configurado (modo mock).');
        }

        setProfile(prev => prev ? { ...prev, ...updates } : null);
        toast.success('Perfil actualizado correctamente');
        return true;
      } catch (fallbackUpdateErr) {
        const errorMessage = fallbackUpdateErr instanceof Error ? fallbackUpdateErr.message : 'Error al actualizar perfil';
        setError(errorMessage);
        toast.error(errorMessage);
        return false;
      }
    } finally {
      setIsLoading(false);
    }
  }, [profile, supabase]);

  // Update avatar with URL
  const updateAvatarUrl = useCallback(async (avatarUrl: string): Promise<boolean> => {
    if (!profile) {
      toast.error('No hay perfil cargado');
      return false;
    }

    try {
      setIsLoading(true);
      
      // Update profile with new avatar URL
      const success = await updateProfile({ avatar: avatarUrl });
      
      if (success) {
        toast.success('Avatar actualizado correctamente');
      }
      
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al actualizar avatar';
      setError(errorMessage);
      toast.error(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [profile, updateProfile]);

  // Update avatar with file upload
  const updateAvatar = useCallback(async (file: File): Promise<boolean> => {
    if (!profile) {
      toast.error('No hay perfil cargado');
      return false;
    }

    try {
      setIsLoading(true);
      
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error('Usuario no autenticado');
      }

      // Verificar disponibilidad de almacenamiento en modo mock
      if (!(supabase as any).storage) {
        const msg = 'Supabase Storage no configurado';
        setError(msg);
        toast.error(msg);
        return false;
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Error al subir imagen: ${uploadError.message}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile with new avatar URL
      const success = await updateProfile({ avatar: publicUrl });
      
      if (success) {
        toast.success('Avatar actualizado correctamente');
      }
      
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al actualizar avatar';
      setError(errorMessage);
      toast.error(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [profile, supabase, updateProfile]);

  // Refresh profile data
  const refreshProfile = useCallback(async () => {
    await loadProfile();
  }, [loadProfile]);

  // Load profile on mount
  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Auto-refresh profile data every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isLoading) {
        refreshProfile();
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [isLoading, refreshProfile]);

  // Listen for profile updates from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'profile-updated') {
        refreshProfile();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [refreshProfile]);

  // Broadcast profile updates to other tabs/windows
  const broadcastUpdate = useCallback(() => {
    localStorage.setItem('profile-updated', Date.now().toString());
    localStorage.removeItem('profile-updated');
  }, []);

  // Enhanced update functions that broadcast changes
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