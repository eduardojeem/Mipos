// Tipos actualizados para Supabase - Generado automáticamente
// Fecha: 2025-10-01T22:16:46.057Z

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
  organization_id?: string;
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

// Categoría privada de una organización (clasificación interna de productos)
export interface Category {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  organization_id?: string;
  parent_id?: string | null;
  created_at: string;
  updated_at: string;
  _count?: {
    products: number;
  };
}

// Categoría pública del marketplace (global, curada por admin SaaS)
// Equivalente a "rubros" en MercadoLibre / "categories" en Etsy
export interface MarketplaceCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;       // nombre de icono lucide-react
  color: string;              // hex color
  image_url?: string | null;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  parent_id?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  created_at: string;
  updated_at: string;
  // Conteos opcionales (retornados por la RPC get_marketplace_categories_with_counts)
  org_count?: number;
  product_count?: number;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  description?: string;
  cost_price: number;
  sale_price: number;
  offer_price?: number;
  wholesale_price?: number; // Precio mayorista
  min_wholesale_quantity?: number; // Cantidad mínima para precio mayorista
  stock_quantity: number;
  min_stock: number;
  max_stock?: number;
  category_id: string;
  supplier_id?: string;
  barcode?: string;
  image_url?: string;
  is_active: boolean;
  is_public?: boolean; // visible en el catálogo/tienda pública (independiente de is_active)
  // Campos adicionales usados en el frontend
  regular_price?: number;
  discount_percentage?: number;
  rating?: number;
  images?: Array<{ url: string }> | string[];
  iva_rate?: number;
  iva_included?: boolean;
  // Cosmetic-specific attributes
  brand?: string;
  shade?: string;
  skin_type?: string;
  ingredients?: string;
  volume?: string;
  spf?: number;
  finish?: string;
  coverage?: string;
  waterproof?: boolean;
  vegan?: boolean;
  cruelty_free?: boolean;
  expiration_date?: string;
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
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  tax_id?: string | null;
  is_active: boolean;
  organization_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  tax_id?: string | null;
  ruc?: string | null;
  customer_code?: string | null;
  customer_type: "RETAIL" | "WHOLESALE";
  status: string;
  is_active: boolean;
  birth_date?: string | null;
  notes?: string | null;
  total_purchases?: number;
  total_orders?: number;
  last_purchase?: string | null;
  wholesale_discount?: number; // Descuento mayorista por defecto
  organization_id?: string | null;
  min_wholesale_quantity?: number; // Cantidad mínima para precio mayorista
  created_at: string;
  updated_at: string;
}

// ============================================================================
// TIPOS DE VENTAS Y TRANSACCIONES
// ============================================================================

export interface Sale {
  id: string;
  order_number?: string | null;
  customer_id?: string | null;
  user_id?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  customer_address?: string | null;
  organization_id?: string | null;
  buyer_type?: "guest" | "customer" | "business";
  buyer_user_id?: string | null;
  buyer_organization_id?: string | null;
  buyer_organization_name?: string | null;
  subtotal?: number;
  total_amount: number;
  total?: number;
  tax_amount: number;
  tax?: number;
  discount_amount: number;
  discount?: number;
  discount_type?: "PERCENTAGE" | "FIXED_AMOUNT";
  coupon_code?: string;
  payment_method:
    | "CASH"
    | "CARD"
    | "TRANSFER"
    | "QR"
    | "OTHER"
    | "MIXED"
    | "DIGITAL_WALLET";
  payment_status?: string | null;
  payment_details?: {
    version?: number;
    primaryMethod?: string;
    payments?: Array<{
      method: string;
      amount: number;
      affectsCash?: boolean;
      reference?: string | null;
    }>;
    cashAmount?: number;
    cashReceived?: number | null;
    change?: number | null;
    transferReference?: string | null;
  };
  shipping_cost?: number;
  shipping_region?: string | null;
  fulfillment_type?: "DELIVERY" | "PICKUP" | null;
  branch_id?: string | null;
  pos_id?: string | null;
  status:
    | "PENDING"
    | "CONFIRMED"
    | "PREPARING"
    | "READY"
    | "SHIPPED"
    | "DELIVERED"
    | "COMPLETED"
    | "CANCELLED"
    | "REFUNDED";
  order_source?: string | null;
  sale_type: "RETAIL" | "WHOLESALE"; // Tipo de venta
  notes?: string | null;
  date?: string | null;
  estimated_delivery_date?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
  deleted_at?: string | null;
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
  organization_id?: string | null;
  branch_id?: string | null;
  movement_type: "IN" | "OUT" | "ADJUSTMENT" | "TRANSFER";
  quantity: number;
  reference_type?: "SALE" | "PURCHASE" | "ADJUSTMENT" | "RETURN";
  reference_id?: string;
  notes?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  product?: Product;
  user?: User;
}

// ============================================================================
// TIPOS DE CAJA (Sesiones y Movimientos)
// ============================================================================

export interface CashSession {
  id: string;
  opened_by: string;
  closed_by?: string | null;
  opening_amount: number;
  closing_amount?: number | null;
  expected_amount?: number | null;
  discrepancy_amount?: number | null;
  status: "OPEN" | "CLOSED" | "CANCELLED";
  notes?: string | null;
  branch_id?: string | null;
  pos_id?: string | null;
  opening_time: string;
  closing_time?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CashMovement {
  id: string;
  session_id: string;
  type: "IN" | "OUT" | "SALE" | "RETURN" | "ADJUSTMENT";
  amount: number;
  reason?: string | null;
  reference_type?: string | null; // e.g., SALE, RETURN, CREDIT_PAYMENT
  reference_id?: string | null;
  branch_id?: string | null;
  pos_id?: string | null;
  created_by: string;
  created_at: string;
}

export interface CashCount {
  id: string;
  session_id: string;
  denomination: number;
  quantity: number;
  total: number;
  created_at: string;
}

export interface CashDiscrepancy {
  id: string;
  session_id: string;
  type: "SHORTAGE" | "OVERAGE";
  amount: number;
  explained: boolean;
  explanation?: string | null;
  reported_by?: string | null;
  created_at: string;
}

// ============================================================================
// TIPOS DE GESTIÓN DE CAJA 2.0 (Bancos, Conciliaciones, Forecasts y Alertas)
// ============================================================================

export interface BankAccount {
  id: string;
  bank_name: string;
  account_number_masked: string;
  currency: string;
  current_balance: number;
  available_balance?: number;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  last_sync_at?: string;
  created_at: string;
  updated_at: string;
}

export interface BankTransaction {
  id: string;
  bank_account_id: string;
  txn_date: string; // ISO date
  amount: number;
  type: "CREDIT" | "DEBIT";
  description?: string | null;
  reference_id?: string | null;
  source: "BANK" | "ERP" | "MANUAL";
  status: "POSTED" | "PENDING" | "DISPUTED";
  created_at: string;
}

export interface CashReconciliation {
  id: string;
  bank_account_id: string;
  period_start: string; // ISO date
  period_end: string; // ISO date
  opening_balance: number;
  closing_balance: number;
  bank_statement_total: number;
  system_total: number;
  difference: number;
  status: "PENDING" | "MATCHED" | "DISPUTED";
  created_by: string;
  created_at: string;
  resolved_at?: string | null;
  notes?: string | null;
}

export interface CashForecastDaily {
  id: string;
  forecast_date: string; // ISO date
  opening_balance: number;
  expected_inflows: number;
  expected_outflows: number;
  expected_closing_balance: number;
  method?: "RULE_BASED" | "SEASONAL" | "ML";
  created_at: string;
}

export interface CashAlert {
  id: string;
  alert_type: "LOW_BALANCE" | "HIGH_OUTFLOW" | "UNUSUAL_ACTIVITY" | "THRESHOLD";
  entity_type?: "BANK_ACCOUNT" | "CASH_SESSION" | "GLOBAL";
  entity_id?: string | null;
  threshold_value?: number | null;
  current_value?: number | null;
  status: "ACTIVE" | "RESOLVED" | "SNOOZED";
  severity: "INFO" | "WARN" | "CRITICAL";
  message?: string | null;
  created_at: string;
  resolved_at?: string | null;
}

// ============================================================================
// TIPOS DE FORMULARIOS Y OPERACIONES
// ============================================================================

export interface CartItem {
  productId: string;
  product: Product;
  quantity: number;
}

export type Theme = "light" | "dark" | "system";

export interface CreateCategoryData {
  name: string;
  description?: string;
  is_active?: boolean;
  parent_id?: string | null;
}

export interface UpdateCategoryData {
  name?: string;
  description?: string;
  is_active?: boolean;
  parent_id?: string | null;
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
  // Cosmetic-specific attributes
  brand?: string;
  shade?: string;
  skin_type?: string;
  ingredients?: string;
  volume?: string;
  spf?: number;
  finish?: string;
  coverage?: string;
  waterproof?: boolean;
  vegan?: boolean;
  cruelty_free?: boolean;
  expiration_date?: string;
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
  // Cosmetic-specific attributes
  brand?: string;
  shade?: string;
  skin_type?: string;
  ingredients?: string;
  volume?: string;
  spf?: number;
  finish?: string;
  coverage?: string;
  waterproof?: boolean;
  vegan?: boolean;
  cruelty_free?: boolean;
  expiration_date?: string;
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
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
  // Cosmetic-specific filters
  brand?: string;
  shade?: string;
  skin_type?: string;
  finish?: string;
  coverage?: string;
  waterproof?: boolean;
  vegan?: boolean;
  cruelty_free?: boolean;
  min_spf?: number;
  max_spf?: number;
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
  SUPER_ADMIN = "SUPER_ADMIN",
  ADMIN = "ADMIN",
  MANAGER = "MANAGER",
  CASHIER = "CASHIER",
  VIEWER = "VIEWER",
}

export enum PaymentMethod {
  CASH = "CASH",
  CARD = "CARD",
  TRANSFER = "TRANSFER",
  QR = "QR",
  OTHER = "OTHER",
  MIXED = "MIXED",
}

export enum SaleStatus {
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  REFUNDED = "REFUNDED",
}

export enum MovementType {
  IN = "IN",
  OUT = "OUT",
  ADJUSTMENT = "ADJUSTMENT",
  TRANSFER = "TRANSFER",
}

export enum ReferenceType {
  SALE = "SALE",
  PURCHASE = "PURCHASE",
  ADJUSTMENT = "ADJUSTMENT",
  RETURN = "RETURN",
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

export interface StoreSettings {
  id?: string;
  store_name?: string;
  low_stock_threshold: number;
  critical_stock_threshold?: number;
  currency?: string;
  timezone?: string;
  updated_at?: string;
}

type SupabaseRow<T extends object = Record<string, any>> = T & {
  [key: string]: any;
};

type SupabaseWrite<T extends object = Record<string, any>> = Partial<
  SupabaseRow<T>
>;

type SupabaseTable<T extends object = Record<string, any>> = {
  Row: SupabaseRow<T>;
  Insert: SupabaseWrite<T>;
  Update: SupabaseWrite<T>;
  Relationships: [];
};

type SupabaseView<T extends object = Record<string, any>> = {
  Row: SupabaseRow<T>;
  Relationships: [];
};

type SupabaseFunction<
  Args extends Record<string, any> = Record<string, any>,
  Returns = any,
> = {
  Args: Args;
  Returns: Returns;
};

// ============================================================================
// TIPO DATABASE PARA SUPABASE
// ============================================================================

export type Database = {
  public: {
    Tables: {
      [key: string]: SupabaseTable;
      users: SupabaseTable<User>;
      roles: SupabaseTable<Role>;
      permissions: SupabaseTable<Permission>;
      user_roles: SupabaseTable<UserRole>;
      categories: SupabaseTable<Category>;
      cash_sessions: SupabaseTable<CashSession>;
      cash_movements: SupabaseTable<CashMovement>;
      cash_counts: SupabaseTable<CashCount>;
      cash_discrepancies: SupabaseTable<CashDiscrepancy>;
      products: SupabaseTable<Product>;
      suppliers: SupabaseTable<Supplier>;
      customers: SupabaseTable<Customer>;
      store_settings: SupabaseTable<StoreSettings>;
      sales: SupabaseTable<Sale>;
      sale_items: SupabaseTable<SaleItem>;
      inventory_movements: SupabaseTable<InventoryMovement>;
      bank_accounts: SupabaseTable<BankAccount>;
      bank_transactions: SupabaseTable<BankTransaction>;
      cash_reconciliations: SupabaseTable<CashReconciliation>;
      cash_forecast_daily: SupabaseTable<CashForecastDaily>;
      cash_alerts: SupabaseTable<CashAlert>;
    };
    Views: { [key: string]: SupabaseView };
    Functions: { [key: string]: SupabaseFunction };
    Enums: { [key: string]: string };
    CompositeTypes: { [key: string]: Record<string, any> };
  };
};

export const SupabaseEnums = {
  UserRoleEnum,
  PaymentMethod,
  SaleStatus,
  MovementType,
  ReferenceType,
};
