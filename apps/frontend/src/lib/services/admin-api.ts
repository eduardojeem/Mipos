import { api } from '@/lib/api';

// Types for API responses
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'CASHIER' | 'SUPER_ADMIN' | 'MANAGER' | 'EMPLOYEE' | 'VIEWER' | 'INACTIVE';
  status: 'active' | 'inactive';
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
  changes?: Record<string, any>;
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

// API Service Class
export class AdminApiService {
  private static cache = new Map<string, { ts: number; value: { users: User[]; total: number } }>();
  private static cacheTTL = 10000;
  // Users Management
  static async getUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    source?: 'auth' | 'auto';
  }): Promise<{ users: User[]; total: number }> {
    try {
      const key = JSON.stringify({ ...(params || {}), source: (params?.source ?? 'auth') });
      const now = Date.now();
      const cached = this.cache.get(key);
      if (cached && now - cached.ts < this.cacheTTL) {
        return cached.value;
      }
      const response = await api.get('/users', { params: { ...(params || {}), source: (params?.source ?? 'auth') } });
      const users: User[] = (response?.data?.data || response?.data?.users || []) as User[];
      const total: number = response?.data?.total ?? (Array.isArray(users) ? users.length : 0);
      const value = { users, total };
      this.cache.set(key, { ts: now, value });
      return value;
    } catch (error: any) {
      const status = error?.response?.status;
      const details = error?.response?.data;

      // Graceful fallback to keep UI stable
      if (status === 401 || status === 403) {
        console.warn('AdminApiService.getUsers unauthorized; returning empty list for stability.');
        return { users: [], total: 0 };
      }
      if (status === 404) {
        console.warn('AdminApiService.getUsers not found (404); returning empty list.');
        return { users: [], total: 0 };
      }
      if (!error?.response || error?.code === 'NETWORK_ERROR' || (typeof error?.message === 'string' && error.message.includes('fetch'))) {
        console.warn('AdminApiService.getUsers network/backend error; returning empty list.');
        return { users: [], total: 0 };
      }
      if (status && status >= 500) {
        console.warn('AdminApiService.getUsers server error; returning empty list.');
        return { users: [], total: 0 };
      }

      console.error('Error fetching users:', details || error);
      throw error;
    }
  }

  static async createUser(userData: {
    email: string;
    password: string;
    name: string;
    role: string;
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
}
