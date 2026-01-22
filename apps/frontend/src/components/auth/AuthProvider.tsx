'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { toast } from '@/lib/toast';

interface UserRole {
  id: string;
  role_id: string;
  role: {
    id: string;
    name: string;
    display_name: string;
    description: string;
  };
  is_active: boolean;
  expires_at: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRoles: UserRole[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, userData?: any) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  hasRole: (roleName: string) => boolean;
  hasPermission: (permissionName: string) => boolean;
  canManageProducts: () => boolean;
  refreshUserRoles: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  
  const supabase = createClient();

  // Cargar roles del usuario
  const loadUserRoles = useCallback(async (userId: string) => {
    try {
      // Use API route to bypass RLS issues on client side
      const response = await fetch('/api/auth/my-roles')
      
      if (!response.ok) {
        // Silent fail for 401 (not logged in) or just log generic error
        if (response.status !== 401) {
            console.error('Failed to load roles:', response.status, response.statusText)
        }
        return []
      }

      const roles = await response.json()
      return roles as UserRole[]
    } catch (error) {
      console.error('Error in loadUserRoles:', error)
      return []
    }
  }, []);

  // Refrescar roles del usuario
  const refreshUserRoles = useCallback(async () => {
    if (user) {
      const roles = await loadUserRoles(user.id);
      setUserRoles(roles);
    }
  }, [user, loadUserRoles]);

  // Verificar si el usuario tiene un rol específico
  const hasRole = useCallback((roleName: string): boolean => {
    if (!user) return false;

    // Primero, verificar rol en metadata del usuario (más confiable)
    const userMetadata = user.user_metadata || {};
    const userRole = userMetadata.role;
    
    if (userRole === roleName || userRole === roleName.toUpperCase()) {
      return true;
    }

    // Fallback: verificar en userRoles (si están cargados)
    return userRoles.some(userRole => 
      userRole.role.name === roleName && 
      userRole.is_active &&
      (!userRole.expires_at || new Date(userRole.expires_at) > new Date())
    );
  }, [user, userRoles]);

  // Verificar si el usuario tiene un permiso específico
  const hasPermission = useCallback((permissionName: string): boolean => {
    if (!user) return false;

    // Primero, verificar permisos en metadata del usuario (más confiable)
    const userMetadata = user.user_metadata || {};
    const permissions = userMetadata.permissions || [];
    
    // Convertir formato de permisos (products:create -> products.create)
    const normalizedPermission = permissionName.replace(':', '.');
    const alternativePermission = permissionName.replace('.', ':');
    
    if (permissions.includes(normalizedPermission) || permissions.includes(alternativePermission)) {
      return true;
    }

    // Fallback: verificar por rol en metadata
    const userRole = userMetadata.role;
    if (userRole) {
      const rolePermissions: Record<string, string[]> = {
        'SUPER_ADMIN': ['products.create', 'products.read', 'products.update', 'products.delete', 'categories.create', 'categories.read', 'categories.update', 'categories.delete', 'suppliers.create', 'suppliers.read', 'suppliers.update', 'suppliers.delete'],
        'ADMIN': ['products.create', 'products.read', 'products.update', 'products.delete', 'categories.create', 'categories.read', 'categories.update', 'categories.delete', 'suppliers.create', 'suppliers.read', 'suppliers.update', 'suppliers.delete'],
        'MANAGER': ['products.create', 'products.read', 'products.update', 'products.delete', 'categories.create', 'categories.read', 'categories.update', 'suppliers.create', 'suppliers.read', 'suppliers.update'],
        'INVENTORY_MANAGER': ['products.create', 'products.read', 'products.update', 'categories.read', 'suppliers.read'],
        'CASHIER': ['products.read', 'categories.read', 'suppliers.read'],
        'EMPLOYEE': ['products.read', 'categories.read', 'suppliers.read'],
        'VIEWER': ['products.read', 'categories.read', 'suppliers.read']
      };

      const rolePerms = rolePermissions[userRole] || [];
      return rolePerms.includes(normalizedPermission);
    }

    // Fallback final: verificar en userRoles (si están cargados)
    return userRoles.some(userRole => {
      const rolePermissions: Record<string, string[]> = {
        admin: ['products.create', 'products.read', 'products.update', 'products.delete'],
        manager: ['products.create', 'products.read', 'products.update', 'products.delete'],
        inventory_manager: ['products.create', 'products.read', 'products.update'],
        cashier: ['products.read'],
        viewer: ['products.read']
      };
      const permissions = rolePermissions[userRole.role.name] || [];
      return permissions.includes(normalizedPermission);
    });
  }, [user, userRoles]);

  // Verificar si puede gestionar productos
  const canManageProducts = useCallback((): boolean => {
    if (!user) return false;

    // Verificar permisos específicos primero
    if (hasPermission('products.create') || hasPermission('products:create')) {
      return true;
    }

    // Verificar roles que pueden gestionar productos
    return hasRole('SUPER_ADMIN') || 
           hasRole('ADMIN') || 
           hasRole('MANAGER') || 
           hasRole('INVENTORY_MANAGER') ||
           hasRole('admin') || 
           hasRole('manager') || 
           hasRole('inventory_manager');
  }, [user, hasRole, hasPermission]);

  // Inicializar autenticación
  useEffect(() => {
    let mounted = true;

    async function getInitialSession() {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (mounted) {
        if (error) {
          console.error('Error getting session:', error);
        } else {
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            const roles = await loadUserRoles(session.user.id);
            setUserRoles(roles);
          }
        }
        setLoading(false);
      }
    }

    getInitialSession();

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            const roles = await loadUserRoles(session.user.id);
            setUserRoles(roles);
          } else {
            setUserRoles([]);
          }
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase.auth, loadUserRoles]);

  // Función de inicio de sesión
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(`Error al iniciar sesión: ${error.message}`);
        return { error };
      }

      if (data.user) {
        const roles = await loadUserRoles(data.user.id);
        setUserRoles(roles);
        toast.success('Sesión iniciada exitosamente');
      }

      return { error: null };
    } catch (error) {
      console.error('Error in signIn:', error);
      toast.error('Error inesperado al iniciar sesión');
      return { error };
    }
  };

  // Función de registro
  const signUp = async (email: string, password: string, userData?: any) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      });

      if (error) {
        toast.error(`Error al registrarse: ${error.message}`);
        return { error };
      }

      toast.success('Registro exitoso. Revisa tu email para confirmar la cuenta.');
      return { error: null };
    } catch (error) {
      console.error('Error in signUp:', error);
      toast.error('Error inesperado al registrarse');
      return { error };
    }
  };

  // Función de cierre de sesión
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        toast.error(`Error al cerrar sesión: ${error.message}`);
      } else {
        setUser(null);
        setSession(null);
        setUserRoles([]);
        toast.success('Sesión cerrada exitosamente');
      }
    } catch (error) {
      console.error('Error in signOut:', error);
      toast.error('Error inesperado al cerrar sesión');
    }
  };

  const value: AuthContextType = {
    user,
    session,
    userRoles,
    loading,
    signIn,
    signUp,
    signOut,
    hasRole,
    hasPermission,
    canManageProducts,
    refreshUserRoles
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}