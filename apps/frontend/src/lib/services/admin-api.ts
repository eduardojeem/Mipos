import { api } from '@/lib/api';
import { getEnvMode, isMockAuthEnabled } from '@/lib/env';

// Types for API responses
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'OWNER' | 'ADMIN' | 'SELLER' | 'WAREHOUSE' | 'SUPER_ADMIN' | 'CASHIER' | 'MANAGER' | 'EMPLOYEE' | 'VIEWER' | 'INACTIVE';
  status: 'active' | 'inactive' | 'suspended';
  organizationId?: string;  // NUEVO: Multi-tenant support
  organizationName?: string;
  isOwner?: boolean;
  createdAt: string;
  lastLogin?: string;
  phone?: string;
}

export interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  userId: string;
  userName?: string;
  changes?: Record<string, unknown>;
  timestamp: string;
  ipAddress?: string;
}

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalSales: number;
  totalRevenue: number;
  salesGrowth: number;
  revenueGrowth: number;
  topProducts: Array<{
    id: string;
    name: string;
    sales: number;
    revenue: number;
  }>;
}

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  sessionTimeout: number;
  passwordExpiry: number;
  maxLoginAttempts: number;
  ipWhitelistEnabled: boolean;
  auditLoggingEnabled: boolean;
  encryptionEnabled: boolean;
  sslRequired: boolean;
}

export interface ThreatDetection {
  id: string;
  type: 'suspicious_login' | 'brute_force' | 'unusual_activity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: string;
  resolved: boolean;
}

export interface BlockedIP {
  id: string;
  ipAddress: string;
  reason: string;
  blockedAt: string;
  expiresAt?: string;
}

export interface ActiveSession {
  id: string;
  userId: string;
  userName: string;
  ipAddress: string;
  userAgent: string;
  loginTime: string;
  lastActivity: string;
  location?: string;
}

type ApiErrorLike = {
  code?: string;
  message?: string;
  response?: {
    status?: number;
    data?: {
      error?: string;
      message?: string;
    } | unknown;
  };
};

function extractApiErrorMessage(error: ApiErrorLike, fallback: string) {
  const responseData = error.response?.data as { error?: string; message?: string } | undefined
  return (
    responseData?.error ||
    responseData?.message ||
    error.message ||
    fallback
  )
}

// API Service Class
export class AdminApiService {
  // Users Management
  static async getUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    status?: string;
    organizationId?: string;  // NUEVO: Multi-tenant support
    source?: 'auth' | 'auto';
  }): Promise<{ users: User[]; total: number; teamTotal: number }> {
    try {
      const useMock = isMockAuthEnabled() || getEnvMode() === 'mock';
      const response = await api.get('/users', { 
        params,
        headers: useMock ? { 'x-env-mode': 'mock', 'x-user-role': 'super_admin' } : undefined
      });
      const users: User[] = (response?.data?.data || response?.data?.users || []) as User[];
      const total: number = response?.data?.total ?? (Array.isArray(users) ? users.length : 0);
      const teamTotal: number = response?.data?.teamTotal ?? total;
      
      return { users, total, teamTotal };
    } catch (error: unknown) {
      const apiError = (error && typeof error === 'object' ? error : {}) as ApiErrorLike
      const status = apiError.response?.status;
      const details = apiError.response?.data;
      const fallbackMessage = 'No se pudieron cargar los usuarios'

      if (status === 401 || status === 403) {
        throw new Error(extractApiErrorMessage(apiError, 'No tienes permisos para ver usuarios'))
      }
      if (status === 404) {
        throw new Error(extractApiErrorMessage(apiError, 'La ruta de usuarios no esta disponible'))
      }
      if (!apiError.response || apiError.code === 'NETWORK_ERROR' || (typeof apiError.message === 'string' && apiError.message.includes('fetch'))) {
        throw new Error(extractApiErrorMessage(apiError, 'No se pudo conectar con el servicio de usuarios'))
      }
      if (status && status >= 500) {
        throw new Error(extractApiErrorMessage(apiError, 'El servidor no pudo devolver los usuarios'))
      }

      console.error('Error fetching users:', details || error);
      throw new Error(extractApiErrorMessage(apiError, fallbackMessage));
    }
  }

  static async createUser(userData: {
    email: string;
    password: string;
    name: string;
    role: string;
    status?: string;
    organizationId?: string;
  }): Promise<User> {
    try {
      const response = await api.post('/users', userData);
      return response.data.user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  static async updateUser(userId: string, userData: {
    name?: string;
    email?: string;
    role?: string;
    password?: string;
    status?: string;
    organizationId?: string;
  }): Promise<User> {
    try {
      const response = await api.put(`/users/${userId}`, userData);
      return response.data.user;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  static async deleteUser(userId: string): Promise<void> {
    try {
      await api.delete(`/users/${userId}`);
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  static invalidateUsersCache() {
    // Deprecated: Cache is now fully handled by React Query
  }
}
