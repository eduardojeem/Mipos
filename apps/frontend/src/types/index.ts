// Re-exportar todos los tipos de Supabase para compatibilidad
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
export type { CartItem } from './supabase';
export type { Theme } from './supabase';

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
