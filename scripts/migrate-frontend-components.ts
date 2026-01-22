import fs from 'fs';
import path from 'path';

async function migrateFrontendComponents() {
  console.log('🔄 MIGRANDO COMPONENTES DEL FRONTEND');
  console.log('=====================================');

  const frontendSrcPath = path.join(process.cwd(), '..', 'apps', 'frontend', 'src');
  
  // 1. Actualizar archivo de configuración de Supabase principal
  console.log('\n1. Actualizando configuración principal de Supabase...');
  
  const supabaseMainConfig = `import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { 
  Product, 
  Category, 
  Customer, 
  Supplier, 
  User,
  Role,
  Permission 
} from '@/types/supabase';

// Client-side Supabase client
export const createClient = () => createClientComponentClient();

// Re-exportar tipos para compatibilidad
export type {
  Product,
  Category,
  Customer,
  Supplier,
  User,
  Role,
  Permission
} from '@/types/supabase';

// Tipos de base de datos actualizados para Supabase
export type Database = {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>;
      };
      categories: {
        Row: Category;
        Insert: Omit<Category, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Category, 'id' | 'created_at' | 'updated_at'>>;
      };
      products: {
        Row: Product;
        Insert: Omit<Product, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Product, 'id' | 'created_at' | 'updated_at'>>;
      };
      customers: {
        Row: Customer;
        Insert: Omit<Customer, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Customer, 'id' | 'created_at' | 'updated_at'>>;
      };
      suppliers: {
        Row: Supplier;
        Insert: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Supplier, 'id' | 'created_at' | 'updated_at'>>;
      };
      roles: {
        Row: Role;
        Insert: Omit<Role, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Role, 'id' | 'created_at' | 'updated_at'>>;
      };
      permissions: {
        Row: Permission;
        Insert: Omit<Permission, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Permission, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
  };
};
`;

  const supabaseMainPath = path.join(frontendSrcPath, 'lib', 'supabase.ts');
  fs.writeFileSync(supabaseMainPath, supabaseMainConfig);
  console.log(`   ✅ Actualizado: ${supabaseMainPath}`);

  // 2. Actualizar archivo de tipos index.ts para compatibilidad
  console.log('\n2. Actualizando archivo de tipos principal...');
  
  const indexTypesContent = `// Re-exportar todos los tipos de Supabase para compatibilidad
export * from './supabase';

// Mantener algunos tipos legacy para compatibilidad hacia atrás
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  CASHIER = 'CASHIER',
  VIEWER = 'VIEWER'
}

// Alias para compatibilidad con código existente
export type { Product as ProductType } from './supabase';
export type { Category as CategoryType } from './supabase';
export type { Customer as CustomerType } from './supabase';
export type { Supplier as SupplierType } from './supabase';
export type { User as UserType } from './supabase';

// Tipos de formularios re-exportados
export type {
  CreateProductData,
  UpdateProductData,
  CreateCategoryData,
  UpdateCategoryData,
  CreateCustomerData,
  UpdateCustomerData,
  CreateSupplierData,
  UpdateSupplierData
} from './supabase';

// Tipos de respuesta API
export type {
  ApiResponse,
  PaginatedResponse
} from './supabase';

// Enums re-exportados
export {
  PaymentMethod,
  SaleStatus,
  MovementType,
  ReferenceType
} from './supabase';
`;

  const indexTypesPath = path.join(frontendSrcPath, 'types', 'index.ts');
  fs.writeFileSync(indexTypesPath, indexTypesContent);
  console.log(`   ✅ Actualizado: ${indexTypesPath}`);

  // 3. Actualizar hook de autenticación
  console.log('\n3. Actualizando hook de autenticación...');
  
  const authHookContent = `'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    // Obtener sesión inicial
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error obteniendo sesión:', error);
          setError(error.message);
        } else {
          setUser(session?.user ?? null);
        }
      } catch (err) {
        console.error('Error en getInitialSession:', err);
        setError('Error de conexión');
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        setUser(session?.user ?? null);
        setLoading(false);
        setError(null);

        // Redirigir según el estado de autenticación
        if (event === 'SIGNED_IN') {
          router.push('/dashboard');
        } else if (event === 'SIGNED_OUT') {
          router.push('/auth/signin');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase.auth, router]);

  // Funciones de autenticación
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (err) {
      const errorMessage = 'Error de conexión al iniciar sesión';
      setError(errorMessage);
      return { data: null, error: { message: errorMessage } };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        setError(error.message);
        return { error };
      }

      return { error: null };
    } catch (err) {
      const errorMessage = 'Error al cerrar sesión';
      setError(errorMessage);
      return { error: { message: errorMessage } };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, metadata?: any) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      });

      if (error) {
        setError(error.message);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (err) {
      const errorMessage = 'Error al registrar usuario';
      setError(errorMessage);
      return { data: null, error: { message: errorMessage } };
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        setError(error.message);
        return { user: null, error };
      }
      setUser(user);
      return { user, error: null };
    } catch (err) {
      const errorMessage = 'Error al actualizar usuario';
      setError(errorMessage);
      return { user: null, error: { message: errorMessage } };
    }
  };

  return {
    user,
    loading,
    error,
    signIn,
    signOut,
    signUp,
    refreshUser,
    supabase,
  };
}
`;

  const authHookPath = path.join(frontendSrcPath, 'hooks', 'use-auth.tsx');
  fs.writeFileSync(authHookPath, authHookContent);
  console.log(`   ✅ Actualizado: ${authHookPath}`);

  // 4. Crear archivo de utilidades para Supabase
  console.log('\n4. Creando utilidades de Supabase...');
  
  const supabaseUtilsContent = `import { createClient } from '@/lib/supabase';
import type { 
  Product, 
  Category, 
  Customer, 
  Supplier,
  CreateProductData,
  UpdateProductData,
  CreateCategoryData,
  UpdateCategoryData,
  CreateCustomerData,
  UpdateCustomerData,
  ProductFilters
} from '@/types/supabase';

const supabase = createClient();

// ============================================================================
// PRODUCTOS
// ============================================================================

export const productService = {
  async getAll(filters?: ProductFilters) {
    let query = supabase
      .from('products')
      .select(\`
        *,
        category:categories(*),
        supplier:suppliers(*)
      \`)
      .eq('is_active', true);

    if (filters?.category_id) {
      query = query.eq('category_id', filters.category_id);
    }

    if (filters?.supplier_id) {
      query = query.eq('supplier_id', filters.supplier_id);
    }

    if (filters?.search) {
      query = query.or(\`name.ilike.%\${filters.search}%,sku.ilike.%\${filters.search}%,barcode.ilike.%\${filters.search}%\`);
    }

    if (filters?.min_price !== undefined) {
      query = query.gte('sale_price', filters.min_price);
    }

    if (filters?.max_price !== undefined) {
      query = query.lte('sale_price', filters.max_price);
    }

    if (filters?.min_stock !== undefined) {
      query = query.gte('stock_quantity', filters.min_stock);
    }

    if (filters?.max_stock !== undefined) {
      query = query.lte('stock_quantity', filters.max_stock);
    }

    const { data, error } = await query.order('name');
    return { data: data as Product[], error };
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('products')
      .select(\`
        *,
        category:categories(*),
        supplier:suppliers(*)
      \`)
      .eq('id', id)
      .single();

    return { data: data as Product, error };
  },

  async create(productData: CreateProductData) {
    const { data, error } = await supabase
      .from('products')
      .insert(productData)
      .select()
      .single();

    return { data: data as Product, error };
  },

  async update(id: string, productData: UpdateProductData) {
    const { data, error } = await supabase
      .from('products')
      .update(productData)
      .eq('id', id)
      .select()
      .single();

    return { data: data as Product, error };
  },

  async delete(id: string) {
    const { data, error } = await supabase
      .from('products')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single();

    return { data: data as Product, error };
  },

  async getLowStock(threshold?: number) {
    const minStock = threshold || 10;
    const { data, error } = await supabase
      .from('products')
      .select(\`
        *,
        category:categories(*)
      \`)
      .lte('stock_quantity', minStock)
      .eq('is_active', true)
      .order('stock_quantity');

    return { data: data as Product[], error };
  }
};

// ============================================================================
// CATEGORÍAS
// ============================================================================

export const categoryService = {
  async getAll() {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('name');

    return { data: data as Category[], error };
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single();

    return { data: data as Category, error };
  },

  async create(categoryData: CreateCategoryData) {
    const { data, error } = await supabase
      .from('categories')
      .insert(categoryData)
      .select()
      .single();

    return { data: data as Category, error };
  },

  async update(id: string, categoryData: UpdateCategoryData) {
    const { data, error } = await supabase
      .from('categories')
      .update(categoryData)
      .eq('id', id)
      .select()
      .single();

    return { data: data as Category, error };
  },

  async delete(id: string) {
    const { data, error } = await supabase
      .from('categories')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single();

    return { data: data as Category, error };
  }
};

// ============================================================================
// CLIENTES
// ============================================================================

export const customerService = {
  async getAll() {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('is_active', true)
      .order('name');

    return { data: data as Customer[], error };
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();

    return { data: data as Customer, error };
  },

  async create(customerData: CreateCustomerData) {
    const { data, error } = await supabase
      .from('customers')
      .insert(customerData)
      .select()
      .single();

    return { data: data as Customer, error };
  },

  async update(id: string, customerData: UpdateCustomerData) {
    const { data, error } = await supabase
      .from('customers')
      .update(customerData)
      .eq('id', id)
      .select()
      .single();

    return { data: data as Customer, error };
  },

  async delete(id: string) {
    const { data, error } = await supabase
      .from('customers')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single();

    return { data: data as Customer, error };
  }
};

// ============================================================================
// PROVEEDORES
// ============================================================================

export const supplierService = {
  async getAll() {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('is_active', true)
      .order('name');

    return { data: data as Supplier[], error };
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .single();

    return { data: data as Supplier, error };
  },

  async create(supplierData: any) {
    const { data, error } = await supabase
      .from('suppliers')
      .insert(supplierData)
      .select()
      .single();

    return { data: data as Supplier, error };
  },

  async update(id: string, supplierData: any) {
    const { data, error } = await supabase
      .from('suppliers')
      .update(supplierData)
      .eq('id', id)
      .select()
      .single();

    return { data: data as Supplier, error };
  },

  async delete(id: string) {
    const { data, error } = await supabase
      .from('suppliers')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single();

    return { data: data as Supplier, error };
  }
};

// ============================================================================
// UTILIDADES GENERALES
// ============================================================================

export const supabaseUtils = {
  // Verificar conexión
  async testConnection() {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('count')
        .limit(1);

      return { connected: !error, error };
    } catch (err) {
      return { connected: false, error: err };
    }
  },

  // Obtener estadísticas generales
  async getStats() {
    try {
      const [productsResult, categoriesResult, customersResult] = await Promise.all([
        supabase.from('products').select('count').eq('is_active', true),
        supabase.from('categories').select('count').eq('is_active', true),
        supabase.from('customers').select('count').eq('is_active', true)
      ]);

      return {
        products: productsResult.data?.[0]?.count || 0,
        categories: categoriesResult.data?.[0]?.count || 0,
        customers: customersResult.data?.[0]?.count || 0,
        error: null
      };
    } catch (error) {
      return {
        products: 0,
        categories: 0,
        customers: 0,
        error
      };
    }
  }
};
`;

  const utilsPath = path.join(frontendSrcPath, 'lib', 'supabase-utils.ts');
  fs.writeFileSync(utilsPath, supabaseUtilsContent);
  console.log(`   ✅ Creado: ${utilsPath}`);

  console.log('\n✅ MIGRACIÓN COMPLETADA');
  console.log('========================');
  console.log('📁 Archivos actualizados:');
  console.log(`   - ${supabaseMainPath}`);
  console.log(`   - ${indexTypesPath}`);
  console.log(`   - ${authHookPath}`);
  console.log(`   - ${utilsPath}`);
  console.log('\n💡 Próximos pasos:');
  console.log('   1. Verificar que no hay errores de TypeScript');
  console.log('   2. Probar la aplicación frontend');
  console.log('   3. Actualizar componentes específicos si es necesario');
}

migrateFrontendComponents().catch(console.error);