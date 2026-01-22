import { createClient } from '@/lib/supabase';
import type {
  Customer,
  CreateCustomerData,
  UpdateCustomerData
} from '@/types/supabase';
import {
  createCustomerSchema,
  updateCustomerSchema,
  validateCustomerData,
  validateEmail as validateEmailFormat,
  validatePhone as validatePhoneFormat,
  validationMessages
} from './validation-schemas';

// Interfaces para el servicio de clientes

const supabase = createClient();

// Interfaz para el historial de compras
export interface PurchaseHistoryItem {
  orderNumber: string;
  date: string;
  total: number;
  items: number;
  status: 'completed' | 'pending' | 'cancelled';
  products?: {
    id: string;
    name: string;
    quantity: number;
    price: number;
  }[];
}

// Interfaz para etiquetas personalizadas
export interface CustomerTag {
  id: string;
  name: string;
  color: string;
  description?: string;
  created_at: string;
}

// Interfaz extendida para la UI con estadísticas
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
  purchaseHistory?: PurchaseHistoryItem[];
  tags?: CustomerTag[];
  segment?: 'new' | 'regular' | 'frequent' | 'vip' | 'at_risk' | 'dormant';
  riskScore?: number;
  lifetimeValue?: number;
}

// Interfaz para estadísticas de clientes
export interface CustomerStats {
  total: number;
  active: number;
  inactive: number;
  vip: number;
  wholesale: number;
  regular: number;
}

// Interfaz para filtros de búsqueda
export interface CustomerFilters {
  status: 'active' | 'inactive' | 'all';
  type: 'regular' | 'vip' | 'wholesale' | 'all';
  search: string;
  customerType?: 'regular' | 'vip' | 'wholesale';
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
  minOrders?: string;
  maxOrders?: string;
  minSpent?: string;
  maxSpent?: string;
  segment?: 'new' | 'regular' | 'frequent' | 'vip' | 'at_risk' | 'dormant' | 'all';
  tags?: string[];
  riskLevel?: 'low' | 'medium' | 'high' | 'all';
  lifetimeValueRange?: { min?: number; max?: number };
}

class CustomerService {
  private baseUrl = 'http://localhost:3000/api/customers';
  private mockUrl = 'http://localhost:3000/api/customers/mock-list'; // Endpoint mock temporal
  private supabase = createClient();
  private useMockEndpoints = false; // Cambiar a false para usar conexión real

  // Get authentication token from Supabase session
  private async getAuthToken(): Promise<string | null> {
    const { data: { session } } = await this.supabase.auth.getSession();
    return session?.access_token || null;
  }

  // Validación unificada con el backend
  validateCustomerData(data: any, isUpdate = false) {
    return validateCustomerData(data, isUpdate);
  }

  // Validación de email con formato unificado
  validateEmail(email: string): boolean {
    if (!email) return true; // Opcional
    return validateEmailFormat(email);
  }

  // Validación de teléfono con formato unificado
  validatePhone(phone: string): boolean {
    if (!phone) return true; // Opcional
    return validatePhoneFormat(phone);
  }

  // Validar datos antes de enviar al servidor
  private validateBeforeSubmit(data: any, isUpdate = false): { isValid: boolean; errors: string[] } {
    const validation = this.validateCustomerData(data, isUpdate);

    if (!validation.success) {
      const errors = validation.error.errors.map(err => {
        const field = err.path.join('.');
        return `${field}: ${err.message}`;
      });
      return { isValid: false, errors };
    }

    return { isValid: true, errors: [] };
  }

  // Obtener todos los clientes con paginación y filtros
  async getAll(filters: CustomerFilters = { status: 'all', type: 'all', search: '' }): Promise<{ customers: UICustomer[]; stats: CustomerStats; error?: string }> {
    try {
      // Usar endpoints mock temporalmente
      if (this.useMockEndpoints) {
        return await this.getAllMock(filters);
      }

      // Fetch directly from Supabase instead of API
      let query = this.supabase
        .from('customers')
        .select('*');

      // Apply filters
      if (filters.status === 'active') {
        query = query.eq('is_active', true);
      } else if (filters.status === 'inactive') {
        query = query.eq('is_active', false);
      }

      if (filters.type && filters.type !== 'all') {
        query = query.eq('customer_type', filters.type.toUpperCase());
      }

      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,customer_code.ilike.%${filters.search}%`);
      }

      // Apply pagination
      const page = filters.page || 1;
      const limit = filters.limit || 30;
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      // Order by created_at descending
      query = query.order('created_at', { ascending: false });

      const { data: customers, error } = await query;

      if (error) {
        throw new Error(error.message);
      }

      if (!customers) {
        return {
          customers: [],
          stats: { total: 0, active: 0, inactive: 0, vip: 0, wholesale: 0, regular: 0 }
        };
      }

      // Fetch global statistics (not paginated) - always get the real total count
      const [
        { count: totalCount },
        { count: activeCount },
        { count: inactiveCount },
        { count: vipCount },
        { count: wholesaleCount },
        { count: regularCount }
      ] = await Promise.all([
        this.supabase.from('customers').select('*', { count: 'exact', head: true }),
        this.supabase.from('customers').select('*', { count: 'exact', head: true }).eq('is_active', true),
        this.supabase.from('customers').select('*', { count: 'exact', head: true }).eq('is_active', false),
        this.supabase.from('customers').select('*', { count: 'exact', head: true }).eq('customer_type', 'VIP'),
        this.supabase.from('customers').select('*', { count: 'exact', head: true }).eq('customer_type', 'WHOLESALE'),
        this.supabase.from('customers').select('*', { count: 'exact', head: true }).eq('customer_type', 'REGULAR')
      ]);

      // Transform Supabase data to UICustomer format
      const uiCustomers: UICustomer[] = customers.map((customer: any) => {
        const totalSpent = Number(customer.total_purchases) || 0;

        return {
          ...customer,
          customerCode: customer.customer_code || this.generateCustomerCode(customer.name),
          customerType: this.mapCustomerTypeToUI(customer.customer_type),
          totalSpent: totalSpent,
          totalOrders: Number(customer.total_orders) || 0,
          lastPurchase: customer.last_purchase || '',
          birthDate: customer.birth_date || '',
          notes: customer.notes || '',
          created_at: customer.created_at,
          updated_at: customer.updated_at,
        };
      });

      // Use real global statistics from Supabase counts
      const stats: CustomerStats = {
        total: totalCount ?? 0,
        active: activeCount ?? 0,
        inactive: inactiveCount ?? 0,
        vip: vipCount ?? 0,
        wholesale: wholesaleCount ?? 0,
        regular: regularCount ?? 0,
      };

      return { customers: uiCustomers, stats };
    } catch (error) {
      console.error('Error fetching customers from Supabase:', error);
      return {
        customers: [],
        stats: { total: 0, active: 0, inactive: 0, vip: 0, wholesale: 0, regular: 0 },
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  // Helper method to map customer_type from DB to UI format
  private mapCustomerTypeToUI(dbType: string): 'regular' | 'vip' | 'wholesale' {
    const normalized = dbType?.toUpperCase();
    if (normalized === 'WHOLESALE') return 'wholesale';
    if (normalized === 'VIP') return 'vip';
    return 'regular';
  }

  // Helper method to map customer_type from UI to DB format
  private mapCustomerTypeToDBencoding(uiType: string): 'REGULAR' | 'VIP' | 'WHOLESALE' {
    const normalized = uiType?.toLowerCase();
    if (normalized === 'wholesale') return 'WHOLESALE';
    if (normalized === 'vip') return 'VIP';
    // Map 'regular' or 'retail' to REGULAR
    return 'REGULAR';
  }

  // Obtener cliente por ID
  async getById(id: string): Promise<{ data?: UICustomer; error?: string }> {
    try {
      const { data: customer, error } = await this.supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      if (!customer) {
        return { error: 'Cliente no encontrado' };
      }

      const uiCustomer: UICustomer = {
        ...customer,
        customerCode: customer.customer_code || this.generateCustomerCode(customer.name),
        customerType: this.mapCustomerTypeToUI(customer.customer_type),
        totalSpent: customer.total_purchases || 0,
        totalOrders: 0,
        lastPurchase: customer.last_purchase || '',
        birthDate: customer.birth_date || '',
        notes: customer.notes || '',
        created_at: customer.created_at,
        updated_at: customer.updated_at,
      };

      return { data: uiCustomer };
    } catch (error) {
      console.error('Error fetching customer from Supabase:', error);
      return { error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  // Obtener historial de compras del cliente
  async getPurchaseHistory(customerId: string, limit: number = 10): Promise<{ data?: PurchaseHistoryItem[]; error?: string }> {
    try {
      // First, get the sales
      const { data: sales, error: salesError } = await this.supabase
        .from('sales')
        .select('id, total, payment_method, created_at, status')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (salesError) {
        throw new Error(salesError.message);
      }

      if (!sales || sales.length === 0) {
        return { data: [] };
      }

      // Then, get the sale items for these sales (without products nested)
      const saleIds = sales.map((s: any) => s.id);
      const { data: saleItems, error: itemsError } = await this.supabase
        .from('sale_items')
        .select('sale_id, quantity, unit_price, product_id')
        .in('sale_id', saleIds);

      if (itemsError) {
        console.error('Error fetching sale items:', itemsError);
        // Continue without items
      }

      // Get unique product IDs
      const productIds = saleItems?.map((item: any) => item.product_id).filter(Boolean) || [];
      const uniqueProductIds = [...new Set(productIds)];

      // Fetch product names separately
      let productNames: Record<string, string> = {};
      if (uniqueProductIds.length > 0) {
        const { data: products, error: productsError } = await this.supabase
          .from('products')
          .select('id, name')
          .in('id', uniqueProductIds);

        if (!productsError && products) {
          productNames = products.reduce((acc: Record<string, string>, p: any) => {
            acc[p.id] = p.name;
            return acc;
          }, {});
        }
      }

      // Transform to PurchaseHistoryItem format
      const history: PurchaseHistoryItem[] = sales.map((sale: any) => {
        // Filter items for this sale
        const items = saleItems?.filter((item: any) => item.sale_id === sale.id) || [];
        const itemCount = items.length;

        const products = items.map((item: any) => ({
          id: item.product_id || '',
          name: productNames[item.product_id] || 'Producto',
          quantity: item.quantity,
          price: item.unit_price
        }));

        return {
          orderNumber: `#${sale.id.slice(0, 8).toUpperCase()}`,
          date: sale.created_at,
          total: sale.total,
          items: itemCount,
          status: (sale.status || 'completed') as 'completed' | 'pending' | 'cancelled',
          products: products
        };
      });

      return { data: history };
    } catch (error) {
      console.error('Error fetching purchase history from Supabase:', error);
      return { error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  // Crear nuevo cliente
  async create(customerData: Partial<UICustomer>): Promise<{ data?: UICustomer; error?: string; validationErrors?: string[] }> {
    try {
      // Get the customer_type value  from either customerType (UI) or customer_type (DB)
      const customerType = (customerData as any).customerType ?? customerData.customer_type ?? 'regular';

      // Transform UI data to database format
      const dbData = {
        name: customerData.name,
        email: customerData.email,
        phone: customerData.phone,
        address: customerData.address,
        tax_id: customerData.tax_id,
        customer_code: (customerData as any).customerCode ?? customerData.customer_code ?? this.generateCustomerCode(customerData.name || ''),
        customer_type: this.mapCustomerTypeToDBencoding(customerType),
        status: customerData.status || 'active',
        birth_date: (customerData as any).birthDate ?? customerData.birth_date,
        notes: customerData.notes,
        is_active: customerData.is_active ?? true,
      };

      // Validate data before submitting
      const validation = this.validateBeforeSubmit(dbData, false);
      if (!validation.isValid) {
        return {
          error: 'Datos de cliente inválidos',
          validationErrors: validation.errors
        };
      }

      // Insert into Supabase
      const { data: customer, error } = await this.supabase
        .from('customers')
        .insert([dbData])
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      if (!customer) {
        return { error: 'No se pudo crear el cliente' };
      }

      const uiCustomer: UICustomer = {
        ...customer,
        customerCode: customer.customer_code || this.generateCustomerCode(customer.name),
        customerType: this.mapCustomerTypeToUI(customer.customer_type),
        totalSpent: 0,
        totalOrders: 0,
        lastPurchase: '',
        birthDate: customer.birth_date || '',
        notes: customer.notes || '',
        created_at: customer.created_at,
        updated_at: customer.updated_at,
      };

      return { data: uiCustomer };
    } catch (error) {
      console.error('Error creating customer in Supabase:', error);
      return { error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  // Actualizar cliente
  async update(id: string, customerData: Partial<UICustomer>): Promise<{ data?: UICustomer; error?: string; validationErrors?: string[] }> {
    try {
      // Transform UI data to database format
      const updateData: any = {};
      if (customerData.name !== undefined) updateData.name = customerData.name;
      if (customerData.email !== undefined) updateData.email = customerData.email;
      if (customerData.phone !== undefined) updateData.phone = customerData.phone;
      if (customerData.address !== undefined) updateData.address = customerData.address;
      if (customerData.tax_id !== undefined) updateData.tax_id = customerData.tax_id;
      if ((customerData as any).customerCode !== undefined || customerData.customer_code !== undefined) {
        updateData.customer_code = (customerData as any).customerCode ?? customerData.customer_code;
      }
      if ((customerData as any).customerType !== undefined || customerData.customer_type !== undefined) {
        const type = (customerData as any).customerType ?? customerData.customer_type;
        updateData.customer_type = this.mapCustomerTypeToDBencoding(type);
      }
      if (customerData.status !== undefined) updateData.status = customerData.status;
      if ((customerData as any).birthDate !== undefined || customerData.birth_date !== undefined) {
        updateData.birth_date = (customerData as any).birthDate ?? customerData.birth_date;
      }
      if (customerData.notes !== undefined) updateData.notes = customerData.notes;
      if (customerData.is_active !== undefined) updateData.is_active = customerData.is_active;

      console.log('🔍 Update data antes de validación:', updateData);

      // Validate data before submitting
      const validation = this.validateBeforeSubmit(updateData, true);
      console.log('🔍 Resultado de validación:', validation);

      if (!validation.isValid) {
        console.error('❌ Validación fallida:', validation.errors);
        return {
          error: 'Datos de cliente inválidos',
          validationErrors: validation.errors
        };
      }

      // Update in Supabase
      const { data: customer, error } = await this.supabase
        .from('customers')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      if (!customer) {
        return { error: 'No se pudo actualizar el cliente' };
      }

      const uiCustomer: UICustomer = {
        ...customer,
        customerCode: customer.customer_code || this.generateCustomerCode(customer.name),
        customerType: this.mapCustomerTypeToUI(customer.customer_type),
        totalSpent: customer.total_purchases || 0,
        totalOrders: 0,
        lastPurchase: customer.last_purchase || '',
        birthDate: customer.birth_date || '',
        notes: customer.notes || '',
        created_at: customer.created_at,
        updated_at: customer.updated_at,
      };

      return { data: uiCustomer };
    } catch (error) {
      console.error('Error updating customer in Supabase:', error);
      return { error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  // Eliminar cliente (soft delete)
  async delete(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Soft delete: just mark as inactive
      const { error } = await this.supabase
        .from('customers')
        .update({ is_active: false })
        .eq('id', id);

      if (error) {
        throw new Error(error.message);
      }

      console.log('Customer deactivated successfully (soft delete)');
      return { success: true };
    } catch (error) {
      console.error('Error deactivating customer in Supabase:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  // Eliminar múltiples clientes
  async deleteMultiple(ids: string[]): Promise<{ success: boolean; error?: string }> {
    try {
      const results = await Promise.all(ids.map(id => this.delete(id)));
      const hasErrors = results.some(result => !result.success);

      if (hasErrors) {
        const errors = results.filter(result => !result.success).map(result => result.error);
        throw new Error(`Algunos clientes no pudieron ser eliminados: ${errors.join(', ')}`);
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting multiple customers:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  // Validar duplicados por email
  async validateEmailDuplicate(email: string, excludeId?: string): Promise<{ isValid: boolean; error?: string }> {
    try {
      // Primero validar formato localmente
      if (!this.validateEmail(email)) {
        return { isValid: false, error: 'Formato de email inválido' };
      }

      const token = await this.getAuthToken();
      const response = await fetch(`${this.baseUrl}/validate-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({ email, excludeId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return { isValid: result.isValid };
    } catch (error) {
      console.error('Error validating email:', error);
      return {
        isValid: true, // Asumir válido si hay error de conexión
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  // Validar duplicados por teléfono
  async validatePhoneDuplicate(phone: string, excludeId?: string): Promise<{ isValid: boolean; error?: string }> {
    try {
      // Primero validar formato localmente
      if (!this.validatePhone(phone)) {
        return { isValid: false, error: 'Formato de teléfono inválido' };
      }

      const token = await this.getAuthToken();
      const response = await fetch(`${this.baseUrl}/validate-phone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({ phone, excludeId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return { isValid: result.isValid };
    } catch (error) {
      console.error('Error validating phone:', error);
      return {
        isValid: true, // Asumir válido si hay error de conexión
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  // Generar código de cliente único
  private generateCustomerCode(name: string): string {
    const prefix = 'CL';
    const nameCode = name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
    const timestamp = Date.now().toString().slice(-6);
    return `${prefix}${nameCode}${timestamp}`;
  }

  // Exportar datos a CSV
  async exportToCSV(customers: UICustomer[]): Promise<{ success: boolean; data?: string; error?: string }> {
    try {
      const headers = [
        'ID',
        'Código',
        'Nombre',
        'Email',
        'Teléfono',
        'Dirección',
        'Tipo',
        'Estado',
        'Total Gastado',
        'Total Órdenes',
        'Última Compra',
        'Fecha Nacimiento',
        'Notas',
        'Fecha Creación'
      ];

      const csvContent = [
        headers.join(','),
        ...customers.map(customer => [
          customer.id,
          customer.customerCode || '',
          `"${customer.name}"`,
          customer.email || '',
          customer.phone || '',
          `"${customer.address || ''}"`,
          customer.customerType,
          customer.is_active ? 'Activo' : 'Inactivo',
          customer.totalSpent.toFixed(2),
          customer.totalOrders,
          customer.lastPurchase,
          customer.birthDate || '',
          `"${customer.notes || ''}"`,
          customer.created_at
        ].join(','))
      ].join('\n');

      return { success: true, data: csvContent };
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  // Importar desde CSV
  async importFromCSV(csvData: string): Promise<{ success: boolean; imported: number; errors: string[] }> {
    try {
      const lines = csvData.split('\n');
      const headers = lines[0].split(',');
      const dataLines = lines.slice(1).filter(line => line.trim());

      const results = [];
      const errors: string[] = [];

      for (let i = 0; i < dataLines.length; i++) {
        try {
          const values = dataLines[i].split(',');
          const customerData: Partial<UICustomer> = {
            name: values[1]?.replace(/"/g, ''),
            email: values[2] || undefined,
            phone: values[3] || undefined,
            address: values[4]?.replace(/"/g, '') || undefined,
            customerType: (values[5] as 'regular' | 'vip' | 'wholesale') || 'regular',
            birthDate: values[6] || '',
            notes: values[7]?.replace(/"/g, '') || '',
          };

          if (!customerData.name) {
            errors.push(`Línea ${i + 2}: Nombre es requerido`);
            continue;
          }

          const result = await this.create(customerData);
          if (result.error) {
            errors.push(`Línea ${i + 2}: ${result.error}`);
          } else {
            results.push(result.data);
          }
        } catch (error) {
          errors.push(`Línea ${i + 2}: Error procesando datos`);
        }
      }

      return {
        success: true,
        imported: results.length,
        errors
      };
    } catch (error) {
      console.error('Error importing from CSV:', error);
      return {
        success: false,
        imported: 0,
        errors: [error instanceof Error ? error.message : 'Error desconocido']
      };
    }
  }

  // Método mock temporal para obtener clientes
  private async getAllMock(filters: CustomerFilters = { status: 'all', type: 'all', search: '' }): Promise<{ customers: UICustomer[]; stats: CustomerStats; error?: string }> {
    try {
      // Simular delay de red
      await new Promise(resolve => setTimeout(resolve, 500));

      // Datos mock locales
      const mockCustomers = [
        {
          id: '1',
          name: 'Juan Pérez',
          email: 'juan.perez@email.com',
          phone: '+1234567890',
          address: 'Calle Principal 123',
          tax_id: '12345678',
          customerCode: 'CUST001',
          customerType: 'regular',
          status: 'active',
          birthDate: '1985-05-15',
          notes: 'Cliente frecuente',
          isActive: true,
          totalSpent: 1250.50,
          totalOrders: 8,
          lastPurchaseDate: '2024-01-15',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2024-01-15T00:00:00Z'
        },
        {
          id: '2',
          name: 'María García',
          email: 'maria.garcia@email.com',
          phone: '+1234567891',
          address: 'Avenida Central 456',
          tax_id: '87654321',
          customerCode: 'CUST002',
          customerType: 'vip',
          status: 'active',
          birthDate: '1990-08-22',
          notes: 'Cliente VIP',
          isActive: true,
          totalSpent: 3500.75,
          totalOrders: 15,
          lastPurchaseDate: '2024-01-20',
          createdAt: '2023-02-01T00:00:00Z',
          updatedAt: '2024-01-20T00:00:00Z'
        },
        {
          id: '3',
          name: 'Carlos López',
          email: 'carlos.lopez@email.com',
          phone: '+1234567892',
          address: 'Plaza Mayor 789',
          tax_id: '11223344',
          customerCode: 'CUST003',
          customerType: 'wholesale',
          status: 'active',
          birthDate: '1978-12-10',
          notes: 'Cliente mayorista',
          isActive: true,
          totalSpent: 8900.25,
          totalOrders: 25,
          lastPurchaseDate: '2024-01-18',
          createdAt: '2023-03-01T00:00:00Z',
          updatedAt: '2024-01-18T00:00:00Z'
        },
        {
          id: '4',
          name: 'Ana Martínez',
          email: 'ana.martinez@email.com',
          phone: '+1234567893',
          address: 'Calle Secundaria 321',
          tax_id: '55667788',
          customerCode: 'CUST004',
          customerType: 'regular',
          status: 'inactive',
          birthDate: '1992-03-25',
          notes: 'Cliente inactivo',
          isActive: false,
          totalSpent: 450.00,
          totalOrders: 3,
          lastPurchaseDate: '2023-11-10',
          createdAt: '2023-04-01T00:00:00Z',
          updatedAt: '2023-11-10T00:00:00Z'
        }
      ];

      // Aplicar filtros
      let filteredCustomers = mockCustomers;

      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredCustomers = filteredCustomers.filter(customer =>
          customer.name.toLowerCase().includes(searchLower) ||
          customer.email.toLowerCase().includes(searchLower) ||
          customer.customerCode.toLowerCase().includes(searchLower)
        );
      }

      if (filters.status !== 'all') {
        filteredCustomers = filteredCustomers.filter(customer =>
          filters.status === 'active' ? customer.isActive : !customer.isActive
        );
      }

      if (filters.type !== 'all') {
        filteredCustomers = filteredCustomers.filter(customer =>
          customer.customerType === filters.type
        );
      }

      // Transformar datos mock al formato UI
      const uiCustomers: UICustomer[] = filteredCustomers.map((customer: any) => ({
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        tax_id: customer.tax_id || '',
        customer_code: customer.customerCode || this.generateCustomerCode(customer.name),
        customer_type: customer.customerType?.toLowerCase() || 'regular',
        status: customer.status?.toLowerCase() || 'active',
        birth_date: customer.birthDate || '',
        notes: customer.notes || '',
        is_active: customer.isActive !== false,
        customerCode: customer.customerCode || this.generateCustomerCode(customer.name),
        customerType: this.determineCustomerSegment(customer.totalOrders || 0, customer.totalSpent || 0),
        totalSpent: customer.totalSpent || 0,
        totalOrders: customer.totalOrders || 0,
        lastPurchase: customer.lastPurchaseDate || '',
        birthDate: customer.birthDate || '',
        created_at: customer.createdAt || new Date().toISOString(),
        updated_at: customer.updatedAt || new Date().toISOString(),
        purchaseHistory: this.generateMockPurchaseHistory(customer.id, customer.totalOrders || 0, customer.totalSpent || 0),
      }));

      // Calcular estadísticas
      const stats: CustomerStats = {
        total: uiCustomers.length,
        active: uiCustomers.filter(c => c.is_active).length,
        inactive: uiCustomers.filter(c => !c.is_active).length,
        vip: uiCustomers.filter(c => c.customerType === 'vip').length,
        wholesale: uiCustomers.filter(c => c.customerType === 'wholesale').length,
        regular: uiCustomers.filter(c => c.customerType === 'regular').length,
      };

      return { customers: uiCustomers, stats };
    } catch (error) {
      console.error('Error fetching mock customers:', error);
      return {
        customers: [],
        stats: { total: 0, active: 0, inactive: 0, vip: 0, wholesale: 0, regular: 0 },
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  // Generar historial de compras mock
  private generateMockPurchaseHistory(customerId: string, totalOrders: number, totalSpent: number): PurchaseHistoryItem[] {
    if (totalOrders === 0) return [];

    const history: PurchaseHistoryItem[] = [];
    const avgSpentPerOrder = totalSpent / totalOrders;

    // Productos de ejemplo
    const sampleProducts = [
      { name: 'Laptop HP', basePrice: 800 },
      { name: 'Mouse Logitech', basePrice: 25 },
      { name: 'Teclado Mecánico', basePrice: 120 },
      { name: 'Monitor 24"', basePrice: 300 },
      { name: 'Auriculares', basePrice: 80 },
      { name: 'Webcam HD', basePrice: 60 },
      { name: 'Impresora', basePrice: 150 },
      { name: 'Disco SSD', basePrice: 100 },
      { name: 'Memoria RAM', basePrice: 75 },
      { name: 'Cable USB-C', basePrice: 15 },
    ];

    for (let i = 0; i < Math.min(totalOrders, 10); i++) {
      const daysAgo = Math.floor(Math.random() * 365) + 1;
      const orderDate = new Date();
      orderDate.setDate(orderDate.getDate() - daysAgo);

      // Generar productos para esta orden
      const numProducts = Math.floor(Math.random() * 4) + 1;
      const orderProducts = [];
      let orderTotal = 0;

      for (let j = 0; j < numProducts; j++) {
        const product = sampleProducts[Math.floor(Math.random() * sampleProducts.length)];
        const quantity = Math.floor(Math.random() * 3) + 1;
        const price = product.basePrice * (0.8 + Math.random() * 0.4); // Variación de precio ±20%

        orderProducts.push({
          id: `prod-${i}-${j}`,
          name: product.name,
          quantity,
          price: Math.round(price * 100) / 100,
        });

        orderTotal += price * quantity;
      }

      // Ajustar el total para que coincida aproximadamente con el promedio
      const adjustment = (avgSpentPerOrder / orderTotal) * (0.7 + Math.random() * 0.6);
      orderTotal *= adjustment;

      history.push({
        orderNumber: `ORD-${customerId.slice(-4)}-${String(1000 + i).slice(-3)}`,
        date: orderDate.toISOString(),
        total: Math.round(orderTotal * 100) / 100,
        items: orderProducts.reduce((sum, p) => sum + p.quantity, 0),
        status: Math.random() > 0.1 ? 'completed' : (Math.random() > 0.5 ? 'pending' : 'cancelled'),
        products: orderProducts,
      });
    }

    // Ordenar por fecha descendente (más reciente primero)
    return history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  // Determinar segmento de cliente automáticamente basado en comportamiento de compra
  private determineCustomerSegment(totalOrders: number, totalSpent: number): 'regular' | 'vip' | 'wholesale' {
    // Criterios de segmentación automática:
    // VIP: 25+ compras O gasto total > $50,000
    // Wholesale: 15+ compras Y gasto promedio > $5,000 por compra
    // Regular: Todos los demás

    const avgSpentPerOrder = totalOrders > 0 ? totalSpent / totalOrders : 0;

    // Segmento VIP: Clientes de alto valor
    if (totalOrders >= 25 || totalSpent > 50000) {
      return 'vip';
    }

    // Segmento Wholesale: Clientes mayoristas (muchas compras de alto valor)
    if (totalOrders >= 15 && avgSpentPerOrder > 5000) {
      return 'wholesale';
    }

    // Segmento Regular: Clientes estándar
    return 'regular';
  }

  // Obtener estadísticas de segmentación
  getSegmentationStats(customers: UICustomer[]): {
    new: number;
    regular: number;
    frequent: number;
    vip: number;
  } {
    return {
      new: customers.filter(c => c.totalOrders <= 2).length,
      regular: customers.filter(c => c.totalOrders >= 3 && c.totalOrders <= 10).length,
      frequent: customers.filter(c => c.totalOrders >= 11 && c.totalOrders <= 24).length,
      vip: customers.filter(c => c.totalOrders >= 25 || c.totalSpent > 50000).length,
    };
  }

  // Segmentación avanzada con análisis de riesgo
  determineAdvancedSegment(customer: UICustomer): 'new' | 'regular' | 'frequent' | 'vip' | 'at_risk' | 'dormant' {
    const daysSinceLastPurchase = customer.lastPurchase
      ? Math.floor((Date.now() - new Date(customer.lastPurchase).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    // Cliente inactivo (más de 180 días sin comprar)
    if (daysSinceLastPurchase > 180) {
      return 'dormant';
    }

    // Cliente en riesgo (más de 90 días sin comprar pero menos de 180)
    if (daysSinceLastPurchase > 90 && customer.totalOrders > 5) {
      return 'at_risk';
    }

    // Segmentación por actividad
    if (customer.totalOrders <= 2) return 'new';
    if (customer.totalOrders >= 25 || customer.totalSpent > 50000) return 'vip';
    if (customer.totalOrders >= 11) return 'frequent';
    return 'regular';
  }

  // Calcular puntuación de riesgo (0-100)
  calculateRiskScore(customer: UICustomer): number {
    let riskScore = 0;

    const daysSinceLastPurchase = customer.lastPurchase
      ? Math.floor((Date.now() - new Date(customer.lastPurchase).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    // Riesgo por inactividad
    if (daysSinceLastPurchase > 180) riskScore += 50;
    else if (daysSinceLastPurchase > 90) riskScore += 30;
    else if (daysSinceLastPurchase > 30) riskScore += 15;

    // Riesgo por baja frecuencia de compra
    if (customer.totalOrders < 3) riskScore += 20;
    else if (customer.totalOrders < 10) riskScore += 10;

    // Riesgo por bajo valor de compra
    const avgOrderValue = customer.totalOrders > 0 ? customer.totalSpent / customer.totalOrders : 0;
    if (avgOrderValue < 500) riskScore += 15;
    else if (avgOrderValue < 1000) riskScore += 10;

    return Math.min(riskScore, 100);
  }

  // Calcular valor de vida del cliente (CLV)
  calculateLifetimeValue(customer: UICustomer): number {
    if (customer.totalOrders === 0) return 0;

    const avgOrderValue = customer.totalSpent / customer.totalOrders;
    const daysSinceFirstPurchase = Math.floor((Date.now() - new Date(customer.created_at).getTime()) / (1000 * 60 * 60 * 24));
    const purchaseFrequency = daysSinceFirstPurchase > 0 ? customer.totalOrders / (daysSinceFirstPurchase / 30) : 0;

    // CLV = Valor promedio de orden × Frecuencia de compra × Margen de ganancia × Tiempo de vida esperado
    const profitMargin = 0.3; // 30% margen estimado
    const expectedLifetime = 24; // 24 meses esperados

    return avgOrderValue * purchaseFrequency * profitMargin * expectedLifetime;
  }

  // Gestión de etiquetas
  private availableTags: CustomerTag[] = [
    { id: '1', name: 'Cliente Premium', color: '#FFD700', description: 'Cliente de alto valor', created_at: new Date().toISOString() },
    { id: '2', name: 'Mayorista', color: '#4CAF50', description: 'Cliente mayorista', created_at: new Date().toISOString() },
    { id: '3', name: 'Nuevo', color: '#2196F3', description: 'Cliente nuevo', created_at: new Date().toISOString() },
    { id: '4', name: 'Fidelizado', color: '#9C27B0', description: 'Cliente fiel', created_at: new Date().toISOString() },
    { id: '5', name: 'En Riesgo', color: '#FF5722', description: 'Cliente en riesgo de abandono', created_at: new Date().toISOString() },
    { id: '6', name: 'Reactivado', color: '#00BCD4', description: 'Cliente reactivado', created_at: new Date().toISOString() },
  ];

  // Obtener todas las etiquetas disponibles
  getAvailableTags(): CustomerTag[] {
    return this.availableTags;
  }

  // Crear nueva etiqueta
  createTag(tag: Omit<CustomerTag, 'id' | 'created_at'>): CustomerTag {
    const newTag: CustomerTag = {
      ...tag,
      id: Date.now().toString(),
      created_at: new Date().toISOString()
    };
    this.availableTags.push(newTag);
    return newTag;
  }

  // Asignar etiquetas automáticamente basado en segmentación
  assignAutomaticTags(customer: UICustomer): CustomerTag[] {
    const tags: CustomerTag[] = [];

    const segment = this.determineAdvancedSegment(customer);
    const riskScore = this.calculateRiskScore(customer);

    // Etiquetas por segmento
    switch (segment) {
      case 'new':
        tags.push(this.availableTags.find(t => t.name === 'Nuevo')!);
        break;
      case 'vip':
        tags.push(this.availableTags.find(t => t.name === 'Cliente Premium')!);
        break;
      case 'at_risk':
        tags.push(this.availableTags.find(t => t.name === 'En Riesgo')!);
        break;
      case 'frequent':
        tags.push(this.availableTags.find(t => t.name === 'Fidelizado')!);
        break;
    }

    // Etiquetas por tipo de cliente
    if (customer.customerType === 'wholesale') {
      tags.push(this.availableTags.find(t => t.name === 'Mayorista')!);
    }

    return tags.filter(Boolean);
  }

  // Filtrar clientes con filtros avanzados
  filterCustomersAdvanced(customers: UICustomer[], filters: CustomerFilters): UICustomer[] {
    return customers.filter(customer => {
      // Filtros básicos existentes
      if (filters.status !== 'all' &&
        ((filters.status === 'active' && !customer.is_active) ||
          (filters.status === 'inactive' && customer.is_active))) {
        return false;
      }

      if (filters.type !== 'all' && customer.customerType !== filters.type) {
        return false;
      }

      // Búsqueda avanzada por múltiples campos
      if (filters.search && filters.search.trim()) {
        const searchTerm = filters.search.toLowerCase().trim();
        const searchableFields = [
          customer.name?.toLowerCase() || '',
          customer.email?.toLowerCase() || '',
          customer.phone?.toLowerCase() || '',
          customer.address?.toLowerCase() || '',
          customer.tax_id?.toLowerCase() || '',
          customer.customer_code?.toLowerCase() || '',
          customer.notes?.toLowerCase() || '',
          ...(customer.tags?.map(tag => tag.name.toLowerCase()) || [])
        ];

        // Búsqueda exacta o parcial
        const hasExactMatch = searchableFields.some(field => field.includes(searchTerm));

        // Búsqueda por palabras individuales
        const searchWords = searchTerm.split(/\s+/).filter(word => word.length > 0);
        const hasWordMatch = searchWords.every(word =>
          searchableFields.some(field => field.includes(word))
        );

        if (!hasExactMatch && !hasWordMatch) return false;
      }

      // Filtros por fechas
      if (filters.dateFrom) {
        const customerDate = new Date(customer.created_at);
        const fromDate = new Date(filters.dateFrom);
        if (customerDate < fromDate) return false;
      }

      if (filters.dateTo) {
        const customerDate = new Date(customer.created_at);
        const toDate = new Date(filters.dateTo);
        if (customerDate > toDate) return false;
      }

      // Filtros por número de órdenes
      if (filters.minOrders && customer.totalOrders < parseInt(filters.minOrders)) return false;
      if (filters.maxOrders && customer.totalOrders > parseInt(filters.maxOrders)) return false;

      // Filtros por gasto total
      if (filters.minSpent && customer.totalSpent < parseFloat(filters.minSpent)) return false;
      if (filters.maxSpent && customer.totalSpent > parseFloat(filters.maxSpent)) return false;

      // Filtros por segmento
      if (filters.segment && filters.segment !== 'all') {
        const customerSegment = this.determineAdvancedSegment(customer);
        if (customerSegment !== filters.segment) return false;
      }

      // Filtros por etiquetas
      if (filters.tags && filters.tags.length > 0) {
        const customerTagIds = customer.tags?.map(t => t.id) || [];
        const hasMatchingTag = filters.tags.some(tagId => customerTagIds.includes(tagId));
        if (!hasMatchingTag) return false;
      }

      // Filtros por nivel de riesgo
      if (filters.riskLevel && filters.riskLevel !== 'all') {
        const riskScore = this.calculateRiskScore(customer);
        const riskLevel = riskScore > 70 ? 'high' : riskScore > 40 ? 'medium' : 'low';
        if (riskLevel !== filters.riskLevel) return false;
      }

      // Filtros por valor de vida
      if (filters.lifetimeValueRange) {
        const clv = this.calculateLifetimeValue(customer);
        if (filters.lifetimeValueRange.min && clv < filters.lifetimeValueRange.min) return false;
        if (filters.lifetimeValueRange.max && clv > filters.lifetimeValueRange.max) return false;
      }

      return true;
    });
  }

  // Búsqueda inteligente con sugerencias
  searchCustomersWithSuggestions(customers: UICustomer[], query: string): {
    results: UICustomer[];
    suggestions: string[];
    searchStats: {
      totalResults: number;
      searchTime: number;
      searchFields: string[];
    };
  } {
    const startTime = performance.now();

    if (!query || query.trim().length === 0) {
      return {
        results: customers,
        suggestions: [],
        searchStats: {
          totalResults: customers.length,
          searchTime: 0,
          searchFields: []
        }
      };
    }

    const searchTerm = query.toLowerCase().trim();
    const searchWords = searchTerm.split(/\s+/).filter(word => word.length > 0);

    // Campos de búsqueda disponibles
    const searchFields = ['name', 'email', 'phone', 'address', 'tax_id', 'customer_code', 'notes', 'tags'];

    // Resultados con puntuación de relevancia
    const scoredResults = customers.map(customer => {
      let score = 0;
      const matchedFields: string[] = [];

      // Búsqueda en nombre (mayor peso)
      if (customer.name?.toLowerCase().includes(searchTerm)) {
        score += 10;
        matchedFields.push('name');
      }

      // Búsqueda en email
      if (customer.email?.toLowerCase().includes(searchTerm)) {
        score += 8;
        matchedFields.push('email');
      }

      // Búsqueda en teléfono
      if (customer.phone?.toLowerCase().includes(searchTerm)) {
        score += 7;
        matchedFields.push('phone');
      }

      // Búsqueda en código de cliente
      if (customer.customer_code?.toLowerCase().includes(searchTerm)) {
        score += 9;
        matchedFields.push('customer_code');
      }

      // Búsqueda en dirección
      if (customer.address?.toLowerCase().includes(searchTerm)) {
        score += 5;
        matchedFields.push('address');
      }

      // Búsqueda en tax_id
      if (customer.tax_id?.toLowerCase().includes(searchTerm)) {
        score += 6;
        matchedFields.push('tax_id');
      }

      // Búsqueda en notas
      if (customer.notes?.toLowerCase().includes(searchTerm)) {
        score += 3;
        matchedFields.push('notes');
      }

      // Búsqueda en etiquetas
      if (customer.tags?.some(tag => tag.name.toLowerCase().includes(searchTerm))) {
        score += 4;
        matchedFields.push('tags');
      }

      // Búsqueda por palabras individuales (menor peso)
      searchWords.forEach(word => {
        if (customer.name?.toLowerCase().includes(word)) score += 2;
        if (customer.email?.toLowerCase().includes(word)) score += 1;
        if (customer.address?.toLowerCase().includes(word)) score += 1;
      });

      return { customer, score, matchedFields };
    }).filter(item => item.score > 0);

    // Ordenar por relevancia
    scoredResults.sort((a, b) => b.score - a.score);

    const results = scoredResults.map(item => item.customer);

    // Generar sugerencias basadas en datos existentes
    const suggestions = this.generateSearchSuggestions(customers, searchTerm);

    const endTime = performance.now();

    return {
      results,
      suggestions,
      searchStats: {
        totalResults: results.length,
        searchTime: Math.round(endTime - startTime),
        searchFields: [...new Set(scoredResults.flatMap(item => item.matchedFields))]
      }
    };
  }

  // Generar sugerencias de búsqueda
  private generateSearchSuggestions(customers: UICustomer[], query: string): string[] {
    const suggestions: Set<string> = new Set();
    const queryLower = query.toLowerCase();

    customers.forEach(customer => {
      // Sugerencias de nombres
      if (customer.name && customer.name.toLowerCase().startsWith(queryLower)) {
        suggestions.add(customer.name);
      }

      // Sugerencias de emails
      if (customer.email && customer.email.toLowerCase().startsWith(queryLower)) {
        suggestions.add(customer.email);
      }

      // Sugerencias de códigos de cliente
      if (customer.customer_code && customer.customer_code.toLowerCase().startsWith(queryLower)) {
        suggestions.add(customer.customer_code);
      }

      // Sugerencias de etiquetas
      customer.tags?.forEach(tag => {
        if (tag.name.toLowerCase().startsWith(queryLower)) {
          suggestions.add(tag.name);
        }
      });
    });

    return Array.from(suggestions).slice(0, 5); // Limitar a 5 sugerencias
  }

  // Búsqueda por filtros complejos con operadores
  searchWithComplexFilters(customers: UICustomer[], filterExpression: string): UICustomer[] {
    // Ejemplo de expresión: "type:vip AND spent:>1000 OR tags:premium"
    try {
      const tokens = this.parseFilterExpression(filterExpression);
      return this.applyComplexFilters(customers, tokens);
    } catch (error) {
      console.error('Error parsing filter expression:', error);
      return customers;
    }
  }

  private parseFilterExpression(expression: string): any[] {
    // Implementación básica de parser para filtros complejos
    const tokens = expression.split(/\s+(AND|OR)\s+/i);
    return tokens.map(token => {
      const [field, operator, value] = token.split(/[:><=]/);
      return { field: field?.trim(), operator: operator?.trim() || ':', value: value?.trim() };
    });
  }

  private applyComplexFilters(customers: UICustomer[], tokens: any[]): UICustomer[] {
    return customers.filter(customer => {
      return tokens.every(token => {
        switch (token.field) {
          case 'type':
            return customer.customerType === token.value;
          case 'spent':
            const spent = customer.totalSpent;
            switch (token.operator) {
              case '>': return spent > parseFloat(token.value);
              case '<': return spent < parseFloat(token.value);
              case '>=': return spent >= parseFloat(token.value);
              case '<=': return spent <= parseFloat(token.value);
              default: return spent === parseFloat(token.value);
            }
          case 'orders':
            const orders = customer.totalOrders;
            switch (token.operator) {
              case '>': return orders > parseInt(token.value);
              case '<': return orders < parseInt(token.value);
              case '>=': return orders >= parseInt(token.value);
              case '<=': return orders <= parseInt(token.value);
              default: return orders === parseInt(token.value);
            }
          case 'tags':
            return customer.tags?.some(tag =>
              tag.name.toLowerCase().includes(token.value.toLowerCase())
            ) || false;
          default:
            return true;
        }
      });
    });
  }
}

// Exportar instancia singleton
export const customerService = new CustomerService();
export default customerService;