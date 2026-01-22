import type { Customer } from '@/types';
import type { CustomerStats, CustomerFilters } from '@/lib/customer-service';

export interface UICustomer extends Customer {
  customerCode?: string;
  customerType: 'regular' | 'vip' | 'wholesale';
  totalSpent: number;
  totalOrders: number;
  lastPurchase?: string;
  birthDate?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  purchaseHistory?: Array<{
    orderNumber: string;
    date: string;
    total: number;
    items: number;
    status: 'completed' | 'pending' | 'cancelled';
    products?: Array<{
      id: string;
      name: string;
      quantity: number;
      price: number;
    }>;
  }>;
}

export interface CustomersPageState {
  customers: UICustomer[];
  loading: boolean;
  searchQuery: string;
  showModal: boolean;
  showFilters: boolean;
  showAnalytics: boolean;
  showAdvancedSegmentation: boolean;
  showTagManager: boolean;
  showCommunicationCenter: boolean;
  showAdvancedSearch: boolean;
  showLoyaltyProgram: boolean;
  showDetailsModal: boolean;
  selectedCustomer: UICustomer | null;
  editingCustomer: UICustomer | null;
  selectedCustomers: string[];
  viewMode: 'grid' | 'table' | 'cards';
  sortBy: 'name' | 'created_at' | 'totalSpent' | 'lastPurchase' | 'totalOrders';
  sortOrder: 'asc' | 'desc';
  currentPage: number;
  itemsPerPage: number;
  filters: CustomerFilters;
  formData: {
    name: string;
    customerCode: string;
    email: string;
    phone: string;
    address: string;
    notes: string;
    birthDate: string;
    customerType: 'regular' | 'vip' | 'wholesale';
    is_active: boolean;
  };
  formErrors: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    customerCode?: string;
    birthDate?: string;
    notes?: string;
  };
  submitting: boolean;
  stats: CustomerStats;
}
