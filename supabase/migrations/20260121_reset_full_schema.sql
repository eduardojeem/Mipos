BEGIN;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', r.tablename);
  END LOOP;
END $$;

DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS payment_method CASCADE;
DROP TYPE IF EXISTS discount_type CASCADE;
DROP TYPE IF EXISTS return_status CASCADE;
DROP TYPE IF EXISTS movement_type CASCADE;

DROP FUNCTION IF EXISTS is_admin() CASCADE;
DROP FUNCTION IF EXISTS has_permission(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS current_user_id() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE user_role AS ENUM ('ADMIN', 'CASHIER');
CREATE TYPE payment_method AS ENUM ('CASH', 'CARD', 'TRANSFER', 'OTHER');
CREATE TYPE discount_type AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');
CREATE TYPE return_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED');
CREATE TYPE movement_type AS ENUM ('IN', 'OUT', 'ADJUSTMENT', 'RETURN', 'TRANSFER');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role user_role DEFAULT 'CASHIER' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT users_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'),
    CONSTRAINT users_full_name_length CHECK (LENGTH(full_name) >= 2)
);

CREATE TABLE roles (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT FALSE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT roles_name_format CHECK (name ~* '^[A-Z_]+$'),
    CONSTRAINT roles_display_name_length CHECK (LENGTH(display_name) >= 2)
);

CREATE TABLE permissions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    resource TEXT NOT NULL,
    action TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT permissions_resource_action_unique UNIQUE (resource, action),
    CONSTRAINT permissions_name_format CHECK (name ~* '^[a-z_:]+$'),
    CONSTRAINT permissions_resource_format CHECK (resource ~* '^[a-z_]+$'),
    CONSTRAINT permissions_action_format CHECK (action ~* '^[a-z_]+$')
);

CREATE TABLE role_permissions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    role_id TEXT NOT NULL,
    permission_id TEXT NOT NULL,
    granted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    granted_by UUID,
    CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    CONSTRAINT fk_role_permissions_granted_by FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT role_permissions_unique UNIQUE (role_id, permission_id)
);

CREATE TABLE user_roles (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id UUID NOT NULL,
    role_id TEXT NOT NULL,
    assigned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    assigned_by UUID,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_assigned_by FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT user_roles_unique UNIQUE (user_id, role_id),
    CONSTRAINT user_roles_expiry_check CHECK (expires_at IS NULL OR expires_at > assigned_at)
);

CREATE TABLE user_sessions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id UUID NOT NULL,
    supabase_session_id TEXT UNIQUE,
    ip_address INET,
    user_agent TEXT,
    last_activity TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT fk_user_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT user_sessions_expiry_check CHECK (expires_at IS NULL OR expires_at > created_at)
);

CREATE TABLE role_audit_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id UUID NOT NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    performed_by UUID,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_audit_logs_performed_by FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT audit_logs_action_check CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'ASSIGN', 'REVOKE'))
);

CREATE TABLE categories (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT categories_name_length CHECK (LENGTH(name) >= 2)
);

CREATE TABLE products (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    name TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    category_id TEXT NOT NULL,
    description TEXT,
    cost_price DECIMAL(10,2) NOT NULL,
    sale_price DECIMAL(10,2) NOT NULL,
    stock_quantity INTEGER DEFAULT 0 NOT NULL,
    min_stock INTEGER DEFAULT 0 NOT NULL,
    images TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    CONSTRAINT products_name_length CHECK (LENGTH(name) >= 2),
    CONSTRAINT products_sku_format CHECK (sku ~* '^[A-Z0-9-_]+$'),
    CONSTRAINT products_cost_price_positive CHECK (cost_price >= 0),
    CONSTRAINT products_sale_price_positive CHECK (sale_price >= 0),
    CONSTRAINT products_stock_quantity_non_negative CHECK (stock_quantity >= 0),
    CONSTRAINT products_min_stock_non_negative CHECK (min_stock >= 0)
);

CREATE TABLE suppliers (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    name TEXT NOT NULL,
    contact_info JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT suppliers_name_length CHECK (LENGTH(name) >= 2)
);

CREATE TABLE purchases (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    supplier_id TEXT NOT NULL,
    user_id UUID NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT fk_purchases_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
    CONSTRAINT fk_purchases_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT purchases_total_positive CHECK (total >= 0)
);

CREATE TABLE purchase_items (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    purchase_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_cost DECIMAL(10,2) NOT NULL,
    CONSTRAINT fk_purchase_items_purchase FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
    CONSTRAINT fk_purchase_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT purchase_items_quantity_positive CHECK (quantity > 0),
    CONSTRAINT purchase_items_unit_cost_positive CHECK (unit_cost >= 0)
);

CREATE TABLE inventory_movements (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    product_id TEXT NOT NULL,
    movement_type movement_type NOT NULL,
    quantity INTEGER NOT NULL,
    reference_type TEXT CHECK (reference_type IN ('SALE','PURCHASE','ADJUSTMENT','RETURN')),
    reference_id TEXT,
    notes TEXT,
    user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT fk_inventory_movements_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT inventory_movements_quantity_not_zero CHECK (quantity <> 0)
);

CREATE TABLE customers (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT customers_name_length CHECK (LENGTH(name) >= 2),
    CONSTRAINT customers_email_format CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'),
    CONSTRAINT customers_phone_format CHECK (phone IS NULL OR phone ~* '^[\\+]?[0-9\\-\\s\\(\\)]+$')
);

CREATE TABLE sales (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id UUID NOT NULL,
    customer_id TEXT,
    subtotal DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) DEFAULT 0 NOT NULL,
    discount_type discount_type DEFAULT 'PERCENTAGE' NOT NULL,
    tax DECIMAL(10,2) DEFAULT 0 NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    payment_method payment_method DEFAULT 'CASH' NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT fk_sales_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_sales_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    CONSTRAINT sales_subtotal_positive CHECK (subtotal >= 0),
    CONSTRAINT sales_discount_non_negative CHECK (discount >= 0),
    CONSTRAINT sales_tax_non_negative CHECK (tax >= 0),
    CONSTRAINT sales_total_positive CHECK (total >= 0)
);

CREATE TABLE sale_items (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    sale_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    CONSTRAINT fk_sale_items_sale FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    CONSTRAINT fk_sale_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT sale_items_quantity_positive CHECK (quantity > 0),
    CONSTRAINT sale_items_unit_price_positive CHECK (unit_price >= 0)
);

CREATE TABLE returns (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    original_sale_id TEXT NOT NULL,
    user_id UUID NOT NULL,
    customer_id TEXT,
    status return_status DEFAULT 'PENDING' NOT NULL,
    reason TEXT NOT NULL,
    refund_method payment_method NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT fk_returns_original_sale FOREIGN KEY (original_sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    CONSTRAINT fk_returns_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_returns_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
    CONSTRAINT returns_reason_length CHECK (LENGTH(reason) >= 5),
    CONSTRAINT returns_total_amount_positive CHECK (total_amount >= 0)
);

CREATE TABLE return_items (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    return_id TEXT NOT NULL,
    original_sale_item_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT fk_return_items_return FOREIGN KEY (return_id) REFERENCES returns(id) ON DELETE CASCADE,
    CONSTRAINT fk_return_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_return_items_original_sale_item FOREIGN KEY (original_sale_item_id) REFERENCES sale_items(id) ON DELETE CASCADE,
    CONSTRAINT return_items_quantity_positive CHECK (quantity > 0),
    CONSTRAINT return_items_unit_price_positive CHECK (unit_price >= 0)
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_roles_name ON roles(name);
CREATE INDEX idx_roles_is_active ON roles(is_active);
CREATE INDEX idx_permissions_resource ON permissions(resource);
CREATE INDEX idx_permissions_action ON permissions(action);
CREATE INDEX idx_permissions_resource_action ON permissions(resource, action);
CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX idx_user_roles_is_active ON user_roles(is_active);
CREATE INDEX idx_user_roles_expires_at ON user_roles(expires_at);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_is_active ON user_sessions(is_active);
CREATE INDEX idx_user_sessions_last_activity ON user_sessions(last_activity);
CREATE INDEX idx_audit_logs_user_id ON role_audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON role_audit_logs(action);
CREATE INDEX idx_audit_logs_resource_type ON role_audit_logs(resource_type);
CREATE INDEX idx_audit_logs_created_at ON role_audit_logs(created_at);
CREATE INDEX idx_categories_name ON categories(name);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_stock_quantity ON products(stock_quantity);
CREATE INDEX idx_suppliers_name ON suppliers(name);
CREATE INDEX idx_purchases_supplier_id ON purchases(supplier_id);
CREATE INDEX idx_purchases_user_id ON purchases(user_id);
CREATE INDEX idx_purchases_date ON purchases(date);
CREATE INDEX idx_purchase_items_purchase_id ON purchase_items(purchase_id);
CREATE INDEX idx_purchase_items_product_id ON purchase_items(product_id);
CREATE INDEX idx_inventory_movements_product_id ON inventory_movements(product_id);
CREATE INDEX idx_inventory_movements_type ON inventory_movements(movement_type);
CREATE INDEX idx_inventory_movements_created_at ON inventory_movements(created_at);
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_sales_user_id ON sales(user_id);
CREATE INDEX idx_sales_customer_id ON sales(customer_id);
CREATE INDEX idx_sales_date ON sales(date);
CREATE INDEX idx_sales_payment_method ON sales(payment_method);
CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product_id ON sale_items(product_id);
CREATE INDEX idx_returns_original_sale_id ON returns(original_sale_id);
CREATE INDEX idx_returns_user_id ON returns(user_id);
CREATE INDEX idx_returns_customer_id ON returns(customer_id);
CREATE INDEX idx_returns_status ON returns(status);
CREATE INDEX idx_returns_created_at ON returns(created_at);
CREATE INDEX idx_return_items_return_id ON return_items(return_id);
CREATE INDEX idx_return_items_product_id ON return_items(product_id);
CREATE INDEX idx_return_items_original_sale_item_id ON return_items(original_sale_item_id);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_permissions_updated_at BEFORE UPDATE ON permissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchases_updated_at BEFORE UPDATE ON purchases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON sales FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_returns_updated_at BEFORE UPDATE ON returns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'
    ) THEN
        RETURN TRUE;
    END IF;
    IF EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.name = 'ADMIN'
        AND ur.is_active = TRUE
        AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
    ) THEN
        RETURN TRUE;
    END IF;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION has_permission(resource_name TEXT, action_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    IF is_admin() THEN
        RETURN TRUE;
    END IF;
    RETURN EXISTS (
        SELECT 1 
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        JOIN role_permissions rp ON r.id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = auth.uid()
        AND ur.is_active = TRUE
        AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
        AND r.is_active = TRUE
        AND p.is_active = TRUE
        AND p.resource = resource_name
        AND p.action = action_name
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

INSERT INTO roles (name, display_name, description, is_system_role) VALUES
('ADMIN', 'Administrador', 'Acceso completo al sistema', TRUE),
('CASHIER', 'Cajero', 'Acceso a ventas y consultas básicas', TRUE),
('MANAGER', 'Gerente', 'Acceso a reportes y gestión de inventario', TRUE),
('VIEWER', 'Visualizador', 'Solo lectura de información básica', TRUE)
ON CONFLICT (name) DO NOTHING;

INSERT INTO permissions (name, display_name, description, resource, action) VALUES
('users:create', 'Crear Usuarios', 'Crear nuevos usuarios en el sistema', 'users', 'create'),
('users:read', 'Ver Usuarios', 'Ver información de usuarios', 'users', 'read'),
('users:update', 'Actualizar Usuarios', 'Modificar información de usuarios', 'users', 'update'),
('users:delete', 'Eliminar Usuarios', 'Eliminar usuarios del sistema', 'users', 'delete'),
('products:create', 'Crear Productos', 'Agregar nuevos productos al inventario', 'products', 'create'),
('products:read', 'Ver Productos', 'Ver información de productos', 'products', 'read'),
('products:update', 'Actualizar Productos', 'Modificar información de productos', 'products', 'update'),
('products:delete', 'Eliminar Productos', 'Eliminar productos del inventario', 'products', 'delete'),
('sales:create', 'Crear Ventas', 'Registrar nuevas ventas', 'sales', 'create'),
('sales:read', 'Ver Ventas', 'Ver información de ventas', 'sales', 'read'),
('sales:update', 'Actualizar Ventas', 'Modificar información de ventas', 'sales', 'update'),
('reports:read', 'Ver Reportes', 'Acceso a reportes del sistema', 'reports', 'read'),
('settings:update', 'Configurar Sistema', 'Modificar configuraciones del sistema', 'settings', 'update'),
('roles:create', 'Crear Roles', 'Crear nuevos roles', 'roles', 'create'),
('roles:read', 'Ver Roles', 'Ver información de roles', 'roles', 'read'),
('roles:update', 'Actualizar Roles', 'Modificar roles existentes', 'roles', 'update'),
('roles:delete', 'Eliminar Roles', 'Eliminar roles del sistema', 'roles', 'delete'),
('roles:assign', 'Asignar Roles', 'Asignar roles a usuarios', 'roles', 'assign')
ON CONFLICT (name) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'ADMIN'
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'CASHIER' AND p.name IN ('products:read', 'sales:create', 'sales:read')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'MANAGER' AND p.name IN ('products:read', 'products:create', 'products:update', 'sales:read', 'reports:read')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'VIEWER' AND p.name IN ('products:read', 'sales:read')
ON CONFLICT (role_id, permission_id) DO NOTHING;

COMMIT;
-- =====================================================
-- RLS BASELINE
-- =====================================================

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read roles" ON public.roles;
DROP POLICY IF EXISTS "Service role can manage roles" ON public.roles;
CREATE POLICY "Authenticated can read roles" ON public.roles
  FOR SELECT
  TO authenticated
  USING (true);
CREATE POLICY "Service role can manage roles" ON public.roles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can read permissions" ON public.permissions;
DROP POLICY IF EXISTS "Service role can manage permissions" ON public.permissions;
CREATE POLICY "Authenticated can read permissions" ON public.permissions
  FOR SELECT
  TO authenticated
  USING (true);
CREATE POLICY "Service role can manage permissions" ON public.permissions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Service role can manage user_roles" ON public.user_roles;
CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage user_roles" ON public.user_roles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view role permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Service role can manage role_permissions" ON public.role_permissions;
CREATE POLICY "Users can view role permissions" ON public.role_permissions
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Service role can manage role_permissions" ON public.role_permissions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can read own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Service role can manage user_sessions" ON public.user_sessions;
CREATE POLICY "Users can read own sessions" ON public.user_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage user_sessions" ON public.user_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
