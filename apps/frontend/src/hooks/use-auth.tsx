'use client';

import { useState, useEffect, useCallback, createContext, useContext, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { User, AuthContextType, USER_ROLES, USER_STATUS } from '@/types/auth';
import { useRouter } from 'next/navigation';
import { toast } from '@/lib/toast';
import { useSessionInvalidation } from './use-session-invalidation';

// Create Auth Context
const AuthContext = createContext<AuthContextType | null>(null);
let lastResolvedRole: string | null = null;
let lastResolvedUserId: string | null = null;
const ROLE_PRIORITY = [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.CASHIER, USER_ROLES.EMPLOYEE, USER_ROLES.USER] as const;

// Enhanced auth provider with improved fallback functionality and faster loading
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);
  const userRef = useRef<User | null>(null);
  const router = useRouter();
  // Start listening for session invalidation due to permission changes
  useSessionInvalidation();

  // Detecta modo mock en desarrollo cuando Supabase no está configurado o se fuerza por variable
  const isDevMockMode = useCallback(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const forced = (process.env.NEXT_PUBLIC_MOCK_AUTH || process.env.MOCK_AUTH || '').toString().toLowerCase() === 'true';
    const missing = !url || !anon || url.trim().length === 0 || anon.trim().length === 0;
    return process.env.NODE_ENV === 'development' && (missing || forced);
  }, []);

  // Helper function to extract name from email
  const extractNameFromEmail = useCallback((email: string): string => {
    const localPart = email.split('@')[0];
    return localPart
      .split(/[._-]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }, []);

  const syncCurrentSessionRecord = useCallback(async (method: 'POST' | 'DELETE' = 'POST') => {
    if (typeof window === 'undefined') return;

    try {
      await fetch('/api/auth/sessions/sync', {
        method,
        credentials: 'include',
        cache: 'no-store',
      });
    } catch {
      // No bloquear el flujo de auth por errores de sincronizacion
    }
  }, []);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined' || !user?.id) {
      return;
    }

    const syncIfVisible = () => {
      if (document.visibilityState === 'visible') {
        void syncCurrentSessionRecord('POST');
      }
    };

    const intervalId = window.setInterval(syncIfVisible, 5 * 60 * 1000);
    window.addEventListener('focus', syncIfVisible);
    document.addEventListener('visibilitychange', syncIfVisible);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', syncIfVisible);
      document.removeEventListener('visibilitychange', syncIfVisible);
    };
  }, [user?.id, syncCurrentSessionRecord]);

  // Enhanced fallback user creation with better functionality
  const createFallbackUser = useCallback((authUser: SupabaseUser): User => {
    const metadata = authUser.user_metadata || {};
    const appMetadata = authUser.app_metadata || {};

    // Try to determine role from various sources — prioritize metadata over heuristics
    let role: string = USER_ROLES.USER; // Default to USER, will be upgraded by profile API

    if (metadata.role && Object.values(USER_ROLES).includes(metadata.role)) {
      role = metadata.role;
    } else if (appMetadata.role && Object.values(USER_ROLES).includes(appMetadata.role)) {
      role = appMetadata.role;
    } else if (authUser.email?.includes('admin')) {
      role = USER_ROLES.ADMIN;
    } else if (authUser.email?.includes('manager')) {
      role = USER_ROLES.MANAGER;
    }

    if (userRef.current?.id === authUser.id) {
      role = pickStrongerRole(userRef.current.role, role);
    }

    // Extract name from various sources
    const name = metadata.full_name ||
      metadata.fullName ||
      metadata.name ||
      appMetadata.full_name ||
      extractNameFromEmail(authUser.email || '');

    return {
      id: authUser.id,
      email: authUser.email || '',
      name: name,
      role: role,
      status: USER_STATUS.ACTIVE,
      createdAt: authUser.created_at || new Date().toISOString(),
      updatedAt: authUser.updated_at || new Date().toISOString(),
      lastLogin: authUser.last_sign_in_at,
      organizationId: metadata.organization_id || metadata.organizationId || appMetadata.organization_id || appMetadata.organizationId || userRef.current?.organizationId,
    };
  }, [extractNameFromEmail]);

  // Crea un usuario mock de alto nivel para modo desarrollo
  const createMockAuthUser = useCallback((email?: string, role?: string): SupabaseUser => {
    const now = new Date().toISOString();
    const mockEmail = email || 'admin@mock.local';
    const mockRole = (role && Object.values(USER_ROLES).includes(role as keyof typeof USER_ROLES)) ? role! : USER_ROLES.ADMIN;
    return {
      id: `mock-${Math.random().toString(36).slice(2)}`,
      email: mockEmail,
      user_metadata: {
        full_name: extractNameFromEmail(mockEmail),
        role: mockRole,
      },
      app_metadata: {
        role: mockRole,
      },
      created_at: now,
      updated_at: now,
      last_sign_in_at: now,
    } as unknown as SupabaseUser;
  }, [extractNameFromEmail]);

  // Enhanced function to fetch user data with better fallback and TIMEOUT
  const fetchUserData = useCallback(async (authUser: SupabaseUser): Promise<User> => {
    // Evitar llamadas a la API en modo mock de desarrollo cuando Supabase no está configurado
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      const unconfigured = !!error || !session;
      if (isDevMockMode() && unconfigured) {
        return createFallbackUser(authUser);
      }
    } catch {
      if (isDevMockMode()) {
        return createFallbackUser(authUser);
      }
    }

    // Track timeout id for cleanup
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    try {
      // ⚡ OPTIMIZACIÓN: Timeout de 8 segundos (las respuestas pueden tardar ~10s bajo carga)
      const controller = new AbortController();
      timeoutId = setTimeout(() => {
        controller.abort('timeout'); // Proporcionar una razón para la cancelación
      }, 8000);

      // Fetch user profile via backend API to avoid client-side Supabase probe issues
      const selectedOrganizationId = getSelectedOrganizationId();
      const response = await fetch('/api/auth/profile', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(selectedOrganizationId ? { 'x-organization-id': selectedOrganizationId } : {}),
        },
        cache: 'no-store',
        signal: controller.signal,
      });

      if (!response.ok) {
        console.warn('Profile API returned non-OK, using fallback:', response.statusText);
        return createFallbackUser(authUser);
      }

      const json = await response.json();
      const { success, error: apiError, data } = json || {};
      if (apiError || success === false || !data) {
        console.warn('Profile API error, using fallback:', apiError);
        return createFallbackUser(authUser);
      }
      const userData = data as { 
        name?: string; 
        role?: string; 
        id?: string; 
        email?: string; 
        created_at?: string; 
        updated_at?: string;
        organizationId?: string;
        organization_id?: string;
      };
      const name = userData.name || extractNameFromEmail(authUser.email || '');
      const role = normalizeRole(userData.role || USER_ROLES.CASHIER);

      return {
        id: userData.id || authUser.id,
        email: userData.email || authUser.email || '',
        name,
        role,
        status: USER_STATUS.ACTIVE,
        createdAt: userData.created_at || new Date().toISOString(),
        updatedAt: userData.updated_at || new Date().toISOString(),
        lastLogin: authUser.last_sign_in_at,
        organizationId: userData.organizationId || userData.organization_id,
      };
    } catch (err) {
      // Si es un AbortError por timeout, usar fallback silencioso sin ensuciar consola
      if (err instanceof Error && err.name === 'AbortError') {
        return createFallbackUser(authUser);
      }
      // Otros errores de red: log mínimo
      console.warn('Error de red en fetchUserData, usando fallback.');
      return createFallbackUser(authUser);
    } finally {
      // Asegurar limpieza del timeout en cualquier caso
      if (timeoutId) clearTimeout(timeoutId);
    }
  }, [supabase, isDevMockMode, createFallbackUser, extractNameFromEmail]);

  // Refresh user data
  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        // Si Supabase no está configurado, usar usuario mock
        const msg = (error?.message || '');
        const lowerMsg = msg.toLowerCase();
        
        if (msg.includes('Invalid Refresh Token') || msg.includes('Refresh Token Not Found')) {
             console.warn('Auth: Refresh token inválido en refreshUser, cerrando sesión.');
             if (typeof window !== 'undefined') {
                 const key = `sb-${process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID}-auth-token`;
                 window.localStorage.removeItem(key);
                 window.localStorage.removeItem('selected_organization');
             }
             setUser(null);
             return;
        }

        if (isDevMockMode() && (lowerMsg.includes('supabase no configurado') || lowerMsg.includes('supabase not configured'))) {
          const mockAuthUser = createMockAuthUser();
          const fallbackUser = createFallbackUser(mockAuthUser);
          setUser({ ...fallbackUser, role: normalizeRole(fallbackUser.role) });
        } else {
          throw error;
        }
      }

      if (session?.user) {
        void syncCurrentSessionRecord('POST');
        const userData = await fetchUserData(session.user);
        setUser({ ...userData, role: normalizeRole(userData.role) });
      } else {
        if (isDevMockMode()) {
          const mockAuthUser = createMockAuthUser();
          const fallbackUser = createFallbackUser(mockAuthUser);
          setUser({ ...fallbackUser, role: normalizeRole(fallbackUser.role) });
        } else {
          setUser(null);
        }
      }
    } catch (err) {
      console.error('Error refreshing user:', err);
      setError(err instanceof Error ? err.message : 'Error refreshing user');
    } finally {
      setLoading(false);
    }
  }, [supabase.auth, isDevMockMode, createMockAuthUser, createFallbackUser, fetchUserData, syncCurrentSessionRecord]);

  // Sign in function
  const signIn = useCallback(async (email: string, password: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        const msg = (error?.message || '').toLowerCase();
        const isSupabaseUnconfigured = msg.includes('supabase no configurado') || msg.includes('supabase not configured');
        if (isSupabaseUnconfigured) {
          // Fallback de desarrollo: crear usuario mock basado en el email
          const now = new Date().toISOString();
          const role = email.includes('admin')
            ? USER_ROLES.ADMIN
            : email.includes('manager')
              ? USER_ROLES.MANAGER
              : USER_ROLES.CASHIER;

          const mockAuthUser = {
            id: `mock-${Math.random().toString(36).slice(2)}`,
            email,
            user_metadata: {
              full_name: extractNameFromEmail(email),
              role,
            },
            app_metadata: {
              role,
            },
            created_at: now,
            updated_at: now,
            last_sign_in_at: now,
          } as unknown as SupabaseUser;

          const fallbackUser = createFallbackUser(mockAuthUser);
          setUser({ ...fallbackUser, role: normalizeRole(fallbackUser.role) });
          // No lanzar error: tratamos el login como exitoso en modo desarrollo
        } else {
          throw error;
        }
      }

      if (data.user) {
        void syncCurrentSessionRecord('POST');
        const fallbackUser = createFallbackUser(data.user);
        setUser({ ...fallbackUser, role: normalizeRole(fallbackUser.role) });

        void fetchUserData(data.user)
          .then((userData) => {
            setUser({ ...userData, role: normalizeRole(userData.role) });
            try {
              const uid = String(userData.id || data.user?.id);
              const last = typeof window !== 'undefined' ? window.localStorage.getItem('last_user_id') : null;
              if (typeof window !== 'undefined' && last && last !== uid) {
                window.localStorage.removeItem('selected_organization');
              }
              if (typeof window !== 'undefined') {
                window.localStorage.setItem('last_user_id', uid);
              }
            } catch {}
          })
          .catch((backgroundError) => {
            console.warn('Background sign-in user fetch failed:', backgroundError);
          });

        try {
          const uid = String(fallbackUser.id || data.user.id);
          const last = typeof window !== 'undefined' ? window.localStorage.getItem('last_user_id') : null;
          if (typeof window !== 'undefined' && last && last !== uid) {
            window.localStorage.removeItem('selected_organization');
          }
          if (typeof window !== 'undefined') {
            window.localStorage.setItem('last_user_id', uid);
          }
        } catch {}

        // Update last login - always try to update (but users table doesn't have last_login column)
        // This is commented out since the users table schema doesn't include last_login
        // try {
        //   await supabase
        //     .from('users')
        //     .update({ last_login: new Date().toISOString() })
        //     .eq('id', data.user.id);
        // } catch (updateError) {
        //   console.warn('Could not update last login:', updateError);
        // }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error signing in';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [supabase.auth, createFallbackUser, fetchUserData, extractNameFromEmail, syncCurrentSessionRecord]);

  // Sign out function
  const signOut = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      // Registrar actividad de cierre de sesión antes de invalidar la sesión
      try {
        await fetch('/api/profile/activity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'logout', resource: 'auth' }),
        });
      } catch (loggingError) {
        console.warn('No se pudo registrar actividad de logout:', loggingError);
      }

      await syncCurrentSessionRecord('DELETE');

      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      setUser(null);
      toast.success('Sesión cerrada', { description: 'Has salido correctamente.' });
      router.push('/auth/signin');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error signing out';
      setError(errorMessage);
      toast.error('Error al cerrar sesión', { description: errorMessage });
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [supabase.auth, router, syncCurrentSessionRecord]);

  // Sign up function
  const signUp = useCallback(async (email: string, password: string, userData?: Record<string, unknown>): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData || {}
        }
      });

      if (error) {
        throw error;
      }

      // Note: User will be null until email is confirmed
      if (data.user && data.user.email_confirmed_at) {
        const userDataResult = await fetchUserData(data.user);
        setUser({ ...userDataResult, role: normalizeRole(userDataResult.role) });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error signing up';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [supabase.auth, fetchUserData]);

  // Reset password function
  const resetPassword = useCallback(async (email: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        throw error;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error sending reset password email';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [supabase.auth]);

  useEffect(() => {
    // Get initial session with timeout protection
    const getInitialSession = async () => {
      try {
        // ⚡ TIMEOUT OPTIMIZADO: Máximo 5 segundos para evitar esperas eternas
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session timeout')), 5000)
        );

        const result = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]) as { data: { session: Session | null }; error: Error | null };
        
        const { data: { session }, error } = result;

        if (error) {
          const msg = error?.message || '';
          const isSupabaseUnconfigured = msg.includes('Supabase no configurado') || msg.toLowerCase().includes('supabase not configured');
          const isInvalidRefreshToken = msg.includes('Invalid Refresh Token') || msg.includes('Refresh Token Not Found');

          if (isSupabaseUnconfigured) {
            // Modo desarrollo sin Supabase: manejar silenciosamente sin ensuciar la consola
            console.warn('Auth: Supabase no configurado, activando usuario mock en desarrollo');
            setError(null);
            if (isDevMockMode()) {
              const mockAuthUser = createMockAuthUser();
              const fallbackUser = createFallbackUser(mockAuthUser);
              setUser({ ...fallbackUser, role: normalizeRole(fallbackUser.role) });
            } else {
              setUser(null);
            }
          } else if (isInvalidRefreshToken) {
            // Token inválido/expirado irreversiblemente -> forzar logout limpio
            console.warn('Auth: Refresh token inválido, cerrando sesión local.');
            // Limpiar almacenamiento local de supabase si es posible
            const key = `sb-${process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID}-auth-token`;
            if (typeof window !== 'undefined') {
               window.localStorage.removeItem(key);
               // También limpiar nuestras keys
               window.localStorage.removeItem('selected_organization');
               window.localStorage.removeItem('last_user_id');
            }
            setUser(null);
            setError(null); 
            // Opcional: router.push('/auth/signin');
          } else {
            console.error('Error getting session:', error);
            setError(error.message);
            setUser(null);
          }
        } else if (session?.user) {
          void syncCurrentSessionRecord('POST');
          // Optimistic update for instant UI feedback
          const fallbackUser = createFallbackUser(session.user);
          // Normalizar rol desde fallback para que Sidebar no oculte secciones
          setUser({ ...fallbackUser, role: normalizeRole(fallbackUser.role) });
          
          // Fetch fresh data in background
          fetchUserData(session.user)
            .then(userData => {
              // Only update if data actually changed to avoid re-renders
              if (JSON.stringify(userData) !== JSON.stringify(fallbackUser)) {
                setUser({ ...userData, role: normalizeRole(userData.role) });
                try {
                  const uid = String(userData.id || session.user.id);
                  const last = typeof window !== 'undefined' ? window.localStorage.getItem('last_user_id') : null;
                  if (typeof window !== 'undefined' && last && last !== uid) {
                    window.localStorage.removeItem('selected_organization');
                  }
                  if (typeof window !== 'undefined') {
                    window.localStorage.setItem('last_user_id', uid);
                  }
                } catch {}
              }
            })
            .catch(err => console.error('Background user fetch failed:', err));
        } else {
          if (isDevMockMode()) {
            const mockAuthUser = createMockAuthUser();
            const fallbackUser = createFallbackUser(mockAuthUser);
            setUser({ ...fallbackUser, role: normalizeRole(fallbackUser.role) });
          } else {
            setUser(null);
          }
        }
      } catch (err) {
        const msg = (err as Error)?.message || '';
        const isSupabaseUnconfigured = msg.includes('Supabase no configurado') || msg.toLowerCase().includes('supabase not configured') || msg.includes('timeout');
        if (isSupabaseUnconfigured) {
          console.warn('Auth: Supabase no configurado durante getInitialSession; usando usuario mock');
          setError(null);
          if (isDevMockMode()) {
            const mockAuthUser = createMockAuthUser();
            const fallbackUser = createFallbackUser(mockAuthUser);
            setUser({ ...fallbackUser, role: normalizeRole(fallbackUser.role) });
          } else {
            setUser(null);
          }
        } else {
          console.error('Error in getInitialSession:', err);
          setError('Connection error');
          setUser(null);
        }
      } finally {
        // ⚡ SIEMPRE establecer loading a false después del timeout
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        try {
          if (event === 'SIGNED_IN' && session?.user) {
            void syncCurrentSessionRecord('POST');
            // Optimistic update
            const fallbackUser = createFallbackUser(session.user);
            setUser({ ...fallbackUser, role: normalizeRole(fallbackUser.role) });
            
            // Background update
            fetchUserData(session.user).then((ud) => {
              setUser({ ...ud, role: normalizeRole(ud.role) });
              try {
                const uid = String(ud.id || session.user.id);
                const last = typeof window !== 'undefined' ? window.localStorage.getItem('last_user_id') : null;
                if (typeof window !== 'undefined' && last && last !== uid) {
                  window.localStorage.removeItem('selected_organization');
                }
                if (typeof window !== 'undefined') {
                  window.localStorage.setItem('last_user_id', uid);
                }
              } catch {}
            });
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
          } else if (event === 'TOKEN_REFRESHED' && session?.user) {
            void syncCurrentSessionRecord('POST');
            // Background update is enough for token refresh, but we can be safe
            fetchUserData(session.user).then((ud) => {
              setUser({ ...ud, role: normalizeRole(ud.role) });
            });
          }
        } catch (err) {
          const msg = (err as Error)?.message || '';
          const isSupabaseUnconfigured = msg.includes('Supabase no configurado') || msg.toLowerCase().includes('supabase not configured');
          if (isSupabaseUnconfigured) {
            console.warn('Auth: Supabase no configurado durante cambio de estado');
            setError(null);
          } else {
            console.error('Error handling auth state change:', err);
            setError('Authentication error');
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase.auth, fetchUserData, createMockAuthUser, createFallbackUser, isDevMockMode, syncCurrentSessionRecord]);

  const value = useMemo<AuthContextType>(() => ({
    user,
    loading,
    error,
    signIn,
    signOut,
    signUp,
    refreshUser,
    resetPassword,
  }), [user, loading, error, signIn, signOut, signUp, refreshUser, resetPassword]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth context
export function useAuthContext(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}

// Legacy hook for backward compatibility
export function useAuth() {
  return useAuthContext();
}

// Convenience hooks
export function useUser() {
  const { user } = useAuthContext();
  return user;
}

export function useIsAuthenticated() {
  const { user, loading } = useAuthContext();
  return { isAuthenticated: !!user, loading };
}

export function useIsAdmin() {
  const { user } = useAuthContext();
  return user?.role === USER_ROLES.ADMIN || user?.role === USER_ROLES.SUPER_ADMIN;
}

export function useIsSuperAdmin() {
  const { user } = useAuthContext();
  return user?.role === USER_ROLES.SUPER_ADMIN;
}

export function useIsManager() {
  const { user } = useAuthContext();
  return user?.role === USER_ROLES.MANAGER ||
    user?.role === USER_ROLES.ADMIN ||
    user?.role === USER_ROLES.SUPER_ADMIN;
}

export function useIsCashier() {
  const { user } = useAuthContext();
  return user?.role === USER_ROLES.CASHIER;
}

export function useUserRole() {
  const { user } = useAuthContext();
  return user?.role || null;
}

export function useUserStatus() {
  const { user } = useAuthContext();
  return user?.status || null;
}

// Hook to check if using fallback mode
export function useIsFallbackMode() {
  useAuthContext(); // Consumir el contexto para asegurar que se use dentro del provider
  return false; // Always return false since we removed the isCustomTable property
}

// Unifica el origen del rol en frontend devolviendo un valor normalizado
function normalizeRole(role?: string): string {
  const key = (role || '').toUpperCase();
  if (key === USER_ROLES.SUPER_ADMIN) return USER_ROLES.SUPER_ADMIN;
  if (key === 'OWNER' || key === USER_ROLES.ADMIN) return USER_ROLES.ADMIN;
  if (key === USER_ROLES.MANAGER) return USER_ROLES.MANAGER;
  if (key === USER_ROLES.CASHIER) return USER_ROLES.CASHIER;
  if (key === USER_ROLES.EMPLOYEE) return USER_ROLES.EMPLOYEE;
  return USER_ROLES.USER;
}

function getRolePriority(role?: string | null): number {
  const normalized = normalizeRole(role || undefined);
  const index = ROLE_PRIORITY.indexOf(normalized as (typeof ROLE_PRIORITY)[number]);
  return index === -1 ? ROLE_PRIORITY.length : index;
}

function pickStrongerRole(...roles: Array<string | null | undefined>): string {
  const normalized = roles
    .map((role) => normalizeRole(role || undefined))
    .filter(Boolean);

  return normalized.sort((a, b) => getRolePriority(a) - getRolePriority(b))[0] || USER_ROLES.USER;
}

function getSelectedOrganizationId(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = window.localStorage.getItem('selected_organization');
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    return typeof parsed?.id === 'string' ? parsed.id : undefined;
  } catch {
    return undefined;
  }
}

// Devuelve el rol resuelto/normalizado sin volver a consultar
export function useResolvedRole(): string {
  const { user } = useAuthContext();
  const current = normalizeRole(user?.role);
  if (!user?.id) {
    lastResolvedRole = null;
    lastResolvedUserId = null;
    return current;
  }
  if (lastResolvedUserId && lastResolvedUserId !== user.id) {
    lastResolvedRole = null;
  }
  lastResolvedUserId = user.id;
  if (current && current !== USER_ROLES.USER) {
    lastResolvedRole = pickStrongerRole(lastResolvedRole, current);
  }
  return lastResolvedRole || current;
}
