import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Cargar variables de entorno desde la raíz del proyecto
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateFrontendTypes() {
  console.log('🔄 ACTUALIZANDO TIPOS DEL FRONTEND PARA SUPABASE');
  console.log('================================================');

  try {
    // 1. Verificar estructura de tablas en Supabase
    console.log('\n1. Verificando estructura de tablas...');
    
    const tables = ['roles', 'permissions', 'categories', 'suppliers', 'customers', 'products'];
    const tableStructures: Record<string, any> = {};

    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);

        if (!error && data && data.length > 0) {
          tableStructures[table] = Object.keys(data[0]);
          console.log(`   ✅ ${table}: ${Object.keys(data[0]).length} campos`);
        } else {
          console.log(`   ⚠️  ${table}: Sin datos para analizar estructura`);
        }
      } catch (err) {
        console.log(`   ❌ ${table}: Error - ${err}`);
      }
    }

    // 2. Generar tipos TypeScript actualizados
    console.log('\n2. Generando tipos TypeScript actualizados...');

    const updatedTypes = `// Tipos actualizados para Supabase - Generado automáticamente
// Fecha: ${new Date().toISOString()}

// ============================================================================
// TIPOS DE ROLES Y PERMISOS
// ============================================================================

export interface Role {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  resource: string;
  action: string;
  created_at: string;
  updated_at: string;
}

export interface RolePermission {
  id: string;
  role_id: string;
  permission_id: string;
  granted_at: string;
  granted_by: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// TIPOS DE USUARIOS
// ============================================================================

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role_id: string;
  assigned_at: string;
  assigned_by: string;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// TIPOS DE PRODUCTOS Y CATEGORÍAS
// ============================================================================

export interface Category {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  _count?: {
    products: number;
  };
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  description?: string;
  cost_price: number;
  sale_price: number;
  stock_quantity: number;
  min_stock: number;
  max_stock?: number;
  category_id: string;
  supplier_id?: string;
  barcode?: string;
  image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: Category;
  supplier?: Supplier;
}

// ============================================================================
// TIPOS DE PROVEEDORES Y CLIENTES
// ============================================================================

export interface Supplier {
  id: string;
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  tax_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  tax_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  total_purchases?: number;
  last_purchase?: string;
}

// ============================================================================
// TIPOS DE VENTAS Y TRANSACCIONES
// ============================================================================

export interface Sale {
  id: string;
  customer_id?: string;
  user_id: string;
  total_amount: number;
  tax_amount: number;
  discount_amount: number;
  payment_method: 'CASH' | 'CARD' | 'TRANSFER' | 'OTHER';
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED';
  notes?: string;
  created_at: string;
  updated_at: string;
  customer?: Customer;
  user?: User;
  items?: SaleItem[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  discount_amount: number;
  created_at: string;
  updated_at: string;
  product?: Product;
}

// ============================================================================
// TIPOS DE INVENTARIO
// ============================================================================

export interface InventoryMovement {
  id: string;
  product_id: string;
  movement_type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER';
  quantity: number;
  reference_type?: 'SALE' | 'PURCHASE' | 'ADJUSTMENT' | 'RETURN';
  reference_id?: string;
  notes?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  product?: Product;
  user?: User;
}

// ============================================================================
// TIPOS DE FORMULARIOS Y OPERACIONES
// ============================================================================

export interface CreateCategoryData {
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface UpdateCategoryData {
  name?: string;
  description?: string;
  is_active?: boolean;
}

export interface CreateProductData {
  name: string;
  sku: string;
  description?: string;
  cost_price: number;
  sale_price: number;
  stock_quantity: number;
  min_stock: number;
  max_stock?: number;
  category_id: string;
  supplier_id?: string;
  barcode?: string;
  image_url?: string;
  is_active?: boolean;
}

export interface UpdateProductData {
  name?: string;
  sku?: string;
  description?: string;
  cost_price?: number;
  sale_price?: number;
  stock_quantity?: number;
  min_stock?: number;
  max_stock?: number;
  category_id?: string;
  supplier_id?: string;
  barcode?: string;
  image_url?: string;
  is_active?: boolean;
}

export interface CreateCustomerData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  tax_id?: string;
  is_active?: boolean;
}

export interface UpdateCustomerData {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  tax_id?: string;
  is_active?: boolean;
}

export interface CreateSupplierData {
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  tax_id?: string;
  is_active?: boolean;
}

export interface UpdateSupplierData {
  name?: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  tax_id?: string;
  is_active?: boolean;
}

// ============================================================================
// TIPOS DE RESPUESTAS DE API
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================================================
// TIPOS DE FILTROS Y BÚSQUEDA
// ============================================================================

export interface ProductFilters {
  category_id?: string;
  supplier_id?: string;
  min_price?: number;
  max_price?: number;
  min_stock?: number;
  max_stock?: number;
  is_active?: boolean;
  search?: string;
}

export interface SaleFilters {
  customer_id?: string;
  user_id?: string;
  payment_method?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  min_amount?: number;
  max_amount?: number;
}

// ============================================================================
// ENUMS Y CONSTANTES
// ============================================================================

export enum UserRoleEnum {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  CASHIER = 'CASHIER',
  VIEWER = 'VIEWER'
}

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  TRANSFER = 'TRANSFER',
  OTHER = 'OTHER'
}

export enum SaleStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED'
}

export enum MovementType {
  IN = 'IN',
  OUT = 'OUT',
  ADJUSTMENT = 'ADJUSTMENT',
  TRANSFER = 'TRANSFER'
}

export enum ReferenceType {
  SALE = 'SALE',
  PURCHASE = 'PURCHASE',
  ADJUSTMENT = 'ADJUSTMENT',
  RETURN = 'RETURN'
}

// ============================================================================
// TIPOS DE CONFIGURACIÓN Y SISTEMA
// ============================================================================

export interface SystemConfig {
  company_name: string;
  company_address?: string;
  company_phone?: string;
  company_email?: string;
  tax_rate: number;
  currency: string;
  timezone: string;
  language: string;
}

export interface NotificationSettings {
  low_stock_alerts: boolean;
  sale_notifications: boolean;
  email_notifications: boolean;
  sms_notifications: boolean;
}

// Exportar todo como default también para compatibilidad
export default {
  Role,
  Permission,
  RolePermission,
  User,
  UserRole,
  Category,
  Product,
  Supplier,
  Customer,
  Sale,
  SaleItem,
  InventoryMovement,
  UserRoleEnum,
  PaymentMethod,
  SaleStatus,
  MovementType,
  ReferenceType
};
`;

    // 3. Escribir archivo de tipos actualizado
    const typesPath = path.join(process.cwd(), 'apps', 'frontend', 'src', 'types', 'supabase.ts');
    fs.writeFileSync(typesPath, updatedTypes);
    console.log(`   ✅ Tipos escritos en: ${typesPath}`);

    // 4. Crear archivo de configuración de Supabase actualizado
    console.log('\n3. Actualizando configuración de Supabase...');

    const supabaseConfig = `import { createClientComponentClient, createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from './types/supabase';

// Cliente para componentes del lado del cliente
export const createClient = () => createClientComponentClient<Database>();

// Cliente para componentes del lado del servidor
export const createServerClient = () => {
  const cookieStore = cookies();
  return createServerComponentClient<Database>({ cookies: () => cookieStore });
};

// Configuración de Supabase
export const supabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
};

// Verificar configuración
if (!supabaseConfig.url || !supabaseConfig.anonKey) {
  throw new Error('Faltan variables de entorno de Supabase');
}

// Exportar tipos de base de datos
export type { Database } from './types/supabase';
`;

    const configPath = path.join(process.cwd(), 'apps', 'frontend', 'src', 'lib', 'supabase-config.ts');
    fs.writeFileSync(configPath, supabaseConfig);
    console.log(`   ✅ Configuración escrita en: ${configPath}`);

    // 5. Crear hook actualizado para Supabase
    console.log('\n4. Creando hook actualizado de Supabase...');

    const supabaseHook = `'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-config';
import type { User } from '@supabase/supabase-js';
import type { 
  Product, 
  Category, 
  Customer, 
  Supplier, 
  Sale,
  Role,
  Permission 
} from '@/types/supabase';

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
      async (event, session) => {
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

  const signUp = async (email: string, password: string, metadata?: any) => {
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
  const getProducts = async (filters?: any) => {
    let query = supabase
      .from('products')
      .select(\`
        *,
        category:categories(*),
        supplier:suppliers(*)
      \`);

    if (filters?.category_id) {
      query = query.eq('category_id', filters.category_id);
    }

    if (filters?.search) {
      query = query.or(\`name.ilike.%\${filters.search}%,sku.ilike.%\${filters.search}%\`);
    }

    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    const { data, error } = await query;
    return { data: data as Product[], error };
  };

  const getCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('name');
    
    return { data: data as Category[], error };
  };

  const getCustomers = async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('is_active', true)
      .order('name');
    
    return { data: data as Customer[], error };
  };

  const getSuppliers = async () => {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('is_active', true)
      .order('name');
    
    return { data: data as Supplier[], error };
  };

  const getRoles = async () => {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .eq('is_active', true)
      .order('name');
    
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
  };
}
`;

    const hookPath = path.join(process.cwd(), 'apps', 'frontend', 'src', 'hooks', 'use-supabase.ts');
    fs.writeFileSync(hookPath, supabaseHook);
    console.log(`   ✅ Hook escrito en: ${hookPath}`);

    console.log('\n✅ ACTUALIZACIÓN COMPLETADA');
    console.log('============================');
    console.log('📁 Archivos creados/actualizados:');
    console.log(`   - ${typesPath}`);
    console.log(`   - ${configPath}`);
    console.log(`   - ${hookPath}`);
    console.log('\n💡 Próximos pasos:');
    console.log('   1. Actualizar imports en componentes existentes');
    console.log('   2. Reemplazar tipos antiguos por los nuevos');
    console.log('   3. Probar la integración con Supabase');

  } catch (error) {
    console.error('❌ Error actualizando tipos del frontend:', error);
    process.exit(1);
  }
}

updateFrontendTypes();