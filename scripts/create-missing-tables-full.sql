-- =====================================================
-- Supabase: Crear tablas faltantes (core del POS)
-- Idempotente: usa CREATE TABLE IF NOT EXISTS y índices
-- Compatible con tipos en apps/frontend/src/types/supabase.ts
-- =====================================================

-- Extensión para gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================
-- USERS
-- =====================
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- =====================
-- ROLES
-- =====================
CREATE TABLE IF NOT EXISTS public.roles (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_roles_name ON public.roles(name);

-- =====================
-- PERMISSIONS
-- =====================
CREATE TABLE IF NOT EXISTS public.permissions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_permissions_resource_action ON public.permissions(resource, action);

-- =====================
-- USER_ROLES
-- =====================
CREATE TABLE IF NOT EXISTS public.user_roles (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by TEXT REFERENCES public.users(id),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_role UNIQUE (user_id, role_id)
);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON public.user_roles(role_id);

-- =====================
-- CATEGORIES
-- =====================
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON public.categories(is_active);

-- =====================
-- SUPPLIERS
-- =====================
CREATE TABLE IF NOT EXISTS public.suppliers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  tax_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON public.suppliers(name);

-- =====================
-- CUSTOMERS
-- =====================
CREATE TABLE IF NOT EXISTS public.customers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  tax_id TEXT,
  customer_code TEXT UNIQUE,
  customer_type TEXT NOT NULL DEFAULT 'RETAIL' CHECK (customer_type IN ('RETAIL','WHOLESALE')),
  status TEXT NOT NULL DEFAULT 'active',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  birth_date DATE,
  notes TEXT,
  wholesale_discount NUMERIC(5,2),
  min_wholesale_quantity INTEGER,
  total_purchases NUMERIC(12,2) DEFAULT 0,
  last_purchase TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_code ON public.customers(customer_code);

-- =====================
-- PRODUCTS (alineado con atributos cosméticos)
-- =====================
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  description TEXT,
  cost_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  sale_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  wholesale_price NUMERIC(10,2),
  min_wholesale_quantity INTEGER,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 0,
  max_stock INTEGER,
  category_id TEXT NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  supplier_id TEXT REFERENCES public.suppliers(id) ON DELETE SET NULL,
  barcode TEXT,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  brand TEXT,
  shade TEXT,
  skin_type TEXT,
  ingredients TEXT,
  volume TEXT,
  spf INTEGER,
  finish TEXT,
  coverage TEXT,
  waterproof BOOLEAN,
  vegan BOOLEAN,
  cruelty_free BOOLEAN,
  expiration_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products(name);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_stock_quantity ON public.products(stock_quantity);

-- =====================
-- SALES
-- =====================
CREATE TABLE IF NOT EXISTS public.sales (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  customer_id TEXT REFERENCES public.customers(id) ON DELETE SET NULL,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('CASH','CARD','TRANSFER','OTHER')),
  status TEXT NOT NULL CHECK (status IN ('PENDING','COMPLETED','CANCELLED','REFUNDED')),
  sale_type TEXT NOT NULL CHECK (sale_type IN ('RETAIL','WHOLESALE')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS user_id TEXT;
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_status ON public.sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON public.sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_user ON public.sales(user_id);

-- =====================
-- SALE_ITEMS
-- =====================
CREATE TABLE IF NOT EXISTS public.sale_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  sale_id TEXT NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL,
  total_price NUMERIC(12,2) NOT NULL,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON public.sale_items(product_id);

-- =====================
-- INVENTORY_MOVEMENTS
-- =====================
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('IN','OUT','ADJUSTMENT','TRANSFER')),
  quantity INTEGER NOT NULL,
  reference_type TEXT CHECK (reference_type IN ('SALE','PURCHASE','ADJUSTMENT','RETURN')),
  reference_id TEXT,
  notes TEXT,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT inventory_movements_quantity_not_zero CHECK (quantity <> 0)
);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_id ON public.inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON public.inventory_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at ON public.inventory_movements(created_at);

-- =====================
-- NOTAS
-- =====================
-- 1) Este script no modifica tablas existentes; solo crea las faltantes.
-- 2) Los constraints y tipos están alineados con el frontend.
-- 3) Si ya ejecutaste scripts avanzados (roles/RLS/completo), este script es seguro.
-- 4) Para políticas RLS avanzadas, usa scripts/supabase-rls-fix.sql.

-- =====================
-- VERIFICACIÓN RÁPIDA
-- =====================
DO $$
BEGIN
  RAISE NOTICE '✅ create-missing-tables-full.sql ejecutado';
END $$;