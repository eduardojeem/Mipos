/**
 * Unified Authentication and Permission Types
 * Single source of truth for all auth-related types
 */

// Base User type from Supabase Auth
export interface SupabaseUser {
  id: string;
  email?: string;
  phone?: string;
  created_at?: string;
  updated_at?: string;
  email_confirmed_at?: string;
  phone_confirmed_at?: string;
  last_sign_in_at?: string;
  app_metadata?: Record<string, any>;
  user_metadata?: Record<string, any>;
}

// Extended User type for our application
export interface User {
  id: string;
  email: string;
  name: string;
  full_name?: string;
  role: string;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
  updatedAt?: string;
  lastLogin?: string;
  avatar?: string;
  phone?: string;
}

// Role definition
export interface Role {
  id: string;
  name: string;
  description?: string;
  isSystemRole: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

// Permission definition
export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

// User with roles and permissions
export interface UserWithRoles extends User {
  roles: Role[];
  permissions: Permission[];
}

// Permission check result
export interface PermissionCheck {
  hasPermission: boolean;
  reason?: string;
}

// Auth context type
export interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, userData?: Partial<User>) => Promise<void>;
  refreshUser: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

// Permission context type
export interface PermissionContextType {
  user: UserWithRoles | null;
  loading: boolean;
  error: string | null;
  permissions: Permission[];
  roles: Role[];
  hasPermission: (resource: string, action: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isManager: boolean;
  isCashier: boolean;
  refreshPermissions: () => Promise<void>;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface UserApiResponse extends ApiResponse {
  data?: User[];
  user?: User;
}

// Constants
export const USER_ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  CASHIER: 'CASHIER',
  EMPLOYEE: 'EMPLOYEE',
  USER: 'USER'
} as const;

export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended'
} as const;

export const PERMISSION_RESOURCES = {
  USERS: 'users',
  PRODUCTS: 'products',
  CATEGORIES: 'categories',
  CUSTOMERS: 'customers',
  SALES: 'sales',
  INVENTORY: 'inventory',
  REPORTS: 'reports',
  SETTINGS: 'settings',
  SYSTEM: 'system'
} as const;

export const PERMISSION_ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  VIEW: 'view',
  EXPORT: 'export',
  MANAGE: 'manage'
} as const;

export type UserRole = keyof typeof USER_ROLES;
export type UserStatusType = keyof typeof USER_STATUS;
export type PermissionResource = keyof typeof PERMISSION_RESOURCES;
export type PermissionAction = keyof typeof PERMISSION_ACTIONS;