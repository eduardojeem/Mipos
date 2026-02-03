'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import type { User, AuthChangeEvent, Session, PostgrestError } from '@supabase/supabase-js';
import type { 
  Product, 
  Category, 
  Customer, 
  Supplier, 
  Role,
  Permission,
  CreateProductData,
  UpdateProductData 
} from '@/types/supabase';

interface ProductFilters {
  category_id?: string;
  search?: string;
  is_active?: boolean;
}

export function useSupabase() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Obtener sesión inicial
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };

    getInitialSession();

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, session: Session | null) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  // Funciones de autenticación
  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const signUp = async (email: string, password: string, metadata?: Record<string, unknown>) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });
    return { data, error };
  };

  // Funciones de datos
  const getProducts = async (filters?: ProductFilters) => {
    let query = supabase
      .from('products')
      .select(`
        *,
        category:categories!products_category_id_fkey(*),
        supplier:suppliers!products_supplier_id_fkey(*)
      `);

    if (filters?.category_id) {
      query = query.eq('category_id', filters.category_id);
    }

    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,sku.ilike.%${filters.search}%`);
    }

    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    const { data, error } = await query;
    return { data: data as Product[], error };
  };

  const getCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (!error && Array.isArray(data)) {
        return { data: data as Category[], error: null };
      }


      const resp = await fetch('/api/categories', { cache: 'no-store' });
      if (resp.ok) {
        const json = await resp.json();
        const arr = Array.isArray(json?.data) ? json.data : Array.isArray(json?.categories) ? json.categories : [];
        return { data: (arr || []) as Category[], error: null };
      }

      const normalized = (error && typeof error === 'object' && Object.keys(error).length === 0) ? 'Unknown Supabase error (empty object)' : error;
      if (normalized) {
        console.error('Error fetching categories:', normalized);
      }
      return { data: [] as Category[], error: normalized as PostgrestError };
    } catch (e: unknown) {
      try {
        const resp = await fetch('/api/categories', { cache: 'no-store' });
        if (resp.ok) {
          const json = await resp.json();
          const arr = Array.isArray(json?.data) ? json.data : Array.isArray(json?.categories) ? json.categories : [];
          return { data: (arr || []) as Category[], error: null };
        }
      } catch {}
      return { data: [] as Category[], error: e as PostgrestError };
    }
  };

  const getCustomers = async () => {
    let query = supabase
      .from('customers')
      .select('*')
      .eq('is_active', true)
      .order('name');

    try {
      if (typeof window !== 'undefined') {
        const raw = window.localStorage.getItem('selected_organization');
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            const orgId = parsed?.id || parsed?.organization_id || raw;
            if (orgId) query = query.eq('organization_id', orgId);
          } catch {
            const orgId = raw;
            if (orgId) query = query.eq('organization_id', orgId);
          }
        }
      }
    } catch {}

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching customers (hook):', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
    }
    
    return { data: data as Customer[], error };
  };

  const getSuppliers = async () => {
    let query = supabase
      .from('suppliers')
      .select('*')
      .eq('is_active', true)
      .order('name');

    try {
      if (typeof window !== 'undefined') {
        const raw = window.localStorage.getItem('selected_organization');
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            const orgId = parsed?.id || parsed?.organization_id || raw;
            if (orgId) query = query.eq('organization_id', orgId);
          } catch {
            const orgId = raw;
            if (orgId) query = query.eq('organization_id', orgId);
          }
        }
      }
    } catch {}

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching suppliers (hook):', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
    }
    
    return { data: data as Supplier[], error };
  };

  const getRoles = async () => {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching roles:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
    }
    
    return { data: data as Role[], error };
  };

  const getPermissions = async () => {
    const { data, error } = await supabase
      .from('permissions')
      .select('*')
      .order('resource', { ascending: true });
    
    return { data: data as Permission[], error };
  };

  return {
    user,
    loading,
    supabase,
    signIn,
    signOut,
    signUp,
    getProducts,
    getCategories,
    getCustomers,
    getSuppliers,
    getRoles,
    getPermissions,
    createProduct: async (productData: CreateProductData) => {
      const { data, error } = await supabase
        .from('products')
        .insert(productData)
        .select('*')
        .single();
      if (error) return null;
      return data as Product;
    },
    updateProduct: async (id: string, productData: UpdateProductData) => {
      const { data, error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', id)
        .select('*')
        .single();
      if (error) return null;
      return data as Product;
    },
    deleteProduct: async (id: string) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
      return !error;
    }
  };
}
