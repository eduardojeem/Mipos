-- =====================================================
-- SCRIPT COMPLETO DE BASE DE DATOS - SISTEMA POS
-- =====================================================
-- 
-- Este script crea todas las tablas necesarias para el sistema POS
-- incluyendo usuarios, roles, permisos, inventario, ventas y devoluciones.
-- 
-- Autor: Sistema POS
-- Fecha: 2025
-- Base de datos: PostgreSQL (Supabase)
-- 
-- INSTRUCCIONES:
-- 1. Ejecutar este script en Supabase SQL Editor
-- 2. Verificar que todas las tablas se hayan creado correctamente
-- 3. Ejecutar los scripts de datos iniciales si es necesario
-- 
-- =====================================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- ENUMS (TIPOS ENUMERADOS)
-- =====================================================

-- Enum para roles de usuario (compatibilidad hacia atrás)
CREATE TYPE user_role AS ENUM ('ADMIN', 'CASHIER');

-- Enum para métodos de pago
CREATE TYPE payment_method AS ENUM ('CASH', 'CARD', 'TRANSFER', 'OTHER');

-- Enum para tipos de descuento
CREATE TYPE discount_type AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- Enum para estados de devolución
CREATE TYPE return_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED');

-- Enum para tipos de movimiento de inventario
CREATE TYPE movement_type AS ENUM ('IN', 'OUT', 'ADJUSTMENT', 'RETURN', 'TRANSFER');

-- =====================================================
-- TABLAS PRINCIPALES DEL SISTEMA
-- =====================================================

-- -----------------------------------------------------
-- Tabla: users
-- Descripción: Almacena información de usuarios del sistema
-- -----------------------------------------------------
CREATE TABLE users (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role user_role DEFAULT 'CASHIER' NOT NULL, -- Rol legacy para compatibilidad
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Restricciones
    CONSTRAINT users_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT users_full_name_length CHECK (LENGTH(full_name) >= 2)
);

-- Comentarios para la tabla users
COMMENT ON TABLE users IS 'Tabla principal de usuarios del sistema POS';
COMMENT ON COLUMN users.id IS 'Identificador único del usuario (UUID)';
COMMENT ON COLUMN users.email IS 'Correo electrónico único del usuario';
COMMENT ON COLUMN users.full_name IS 'Nombre completo del usuario';
COMMENT ON COLUMN users.role IS 'Rol legacy del usuario (mantenido para compatibilidad)';
COMMENT ON COLUMN users.created_at IS 'Fecha y hora de creación del registro';
COMMENT ON COLUMN users.updated_at IS 'Fecha y hora de última actualización';

-- -----------------------------------------------------
-- Tabla: roles
-- Descripción: Define los roles disponibles en el sistema
-- -----------------------------------------------------
CREATE TABLE roles (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT FALSE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Restricciones
    CONSTRAINT roles_name_format CHECK (name ~* '^[A-Z_]+$'),
    CONSTRAINT roles_display_name_length CHECK (LENGTH(display_name) >= 2)
);

-- Comentarios para la tabla roles
COMMENT ON TABLE roles IS 'Definición de roles del sistema con permisos granulares';
COMMENT ON COLUMN roles.id IS 'Identificador único del rol';
COMMENT ON COLUMN roles.name IS 'Nombre técnico del rol (mayúsculas y guiones bajos)';
COMMENT ON COLUMN roles.display_name IS 'Nombre amigable del rol para mostrar en UI';
COMMENT ON COLUMN roles.description IS 'Descripción detallada del rol y sus responsabilidades';
COMMENT ON COLUMN roles.is_system_role IS 'Indica si es un rol del sistema (no editable)';
COMMENT ON COLUMN roles.is_active IS 'Indica si el rol está activo y disponible';

-- -----------------------------------------------------
-- Tabla: permissions
-- Descripción: Define los permisos granulares del sistema
-- -----------------------------------------------------
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
    
    -- Restricciones
    CONSTRAINT permissions_resource_action_unique UNIQUE (resource, action),
    CONSTRAINT permissions_name_format CHECK (name ~* '^[a-z_:]+$'),
    CONSTRAINT permissions_resource_format CHECK (resource ~* '^[a-z_]+$'),
    CONSTRAINT permissions_action_format CHECK (action ~* '^[a-z_]+$')
);

-- Comentarios para la tabla permissions
COMMENT ON TABLE permissions IS 'Permisos granulares del sistema organizados por recurso y acción';
COMMENT ON COLUMN permissions.id IS 'Identificador único del permiso';
COMMENT ON COLUMN permissions.name IS 'Nombre técnico del permiso (formato: recurso:accion)';
COMMENT ON COLUMN permissions.display_name IS 'Nombre amigable del permiso para UI';
COMMENT ON COLUMN permissions.description IS 'Descripción detallada del permiso';
COMMENT ON COLUMN permissions.resource IS 'Recurso al que aplica el permiso (ej: users, products)';
COMMENT ON COLUMN permissions.action IS 'Acción permitida (ej: create, read, update, delete)';
COMMENT ON COLUMN permissions.is_active IS 'Indica si el permiso está activo';

-- -----------------------------------------------------
-- Tabla: role_permissions
-- Descripción: Relación muchos a muchos entre roles y permisos
-- -----------------------------------------------------
CREATE TABLE role_permissions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    role_id TEXT NOT NULL,
    permission_id TEXT NOT NULL,
    granted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    granted_by TEXT,
    
    -- Claves foráneas
    CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) 
        REFERENCES roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) 
        REFERENCES permissions(id) ON DELETE CASCADE,
    CONSTRAINT fk_role_permissions_granted_by FOREIGN KEY (granted_by) 
        REFERENCES users(id) ON DELETE SET NULL,
    
    -- Restricciones únicas
    CONSTRAINT role_permissions_unique UNIQUE (role_id, permission_id)
);

-- Comentarios para la tabla role_permissions
COMMENT ON TABLE role_permissions IS 'Asignación de permisos a roles del sistema';
COMMENT ON COLUMN role_permissions.role_id IS 'Referencia al rol que recibe el permiso';
COMMENT ON COLUMN role_permissions.permission_id IS 'Referencia al permiso otorgado';
COMMENT ON COLUMN role_permissions.granted_at IS 'Fecha y hora cuando se otorgó el permiso';
COMMENT ON COLUMN role_permissions.granted_by IS 'Usuario que otorgó el permiso';

-- -----------------------------------------------------
-- Tabla: user_roles
-- Descripción: Asignación de roles a usuarios
-- -----------------------------------------------------
CREATE TABLE user_roles (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id TEXT NOT NULL,
    role_id TEXT NOT NULL,
    assigned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    assigned_by TEXT,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    
    -- Claves foráneas
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) 
        REFERENCES roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_assigned_by FOREIGN KEY (assigned_by) 
        REFERENCES users(id) ON DELETE SET NULL,
    
    -- Restricciones únicas
    CONSTRAINT user_roles_unique UNIQUE (user_id, role_id),
    
    -- Restricciones de validación
    CONSTRAINT user_roles_expiry_check CHECK (expires_at IS NULL OR expires_at > assigned_at)
);

-- Comentarios para la tabla user_roles
COMMENT ON TABLE user_roles IS 'Asignación de roles a usuarios con control temporal';
COMMENT ON COLUMN user_roles.user_id IS 'Referencia al usuario que recibe el rol';
COMMENT ON COLUMN user_roles.role_id IS 'Referencia al rol asignado';
COMMENT ON COLUMN user_roles.assigned_at IS 'Fecha y hora de asignación del rol';
COMMENT ON COLUMN user_roles.assigned_by IS 'Usuario que realizó la asignación';
COMMENT ON COLUMN user_roles.expires_at IS 'Fecha de expiración del rol (opcional)';
COMMENT ON COLUMN user_roles.is_active IS 'Indica si la asignación está activa';

-- -----------------------------------------------------
-- Tabla: user_sessions
-- Descripción: Gestión de sesiones de usuario
-- -----------------------------------------------------
CREATE TABLE user_sessions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id TEXT NOT NULL,
    supabase_session_id TEXT UNIQUE,
    ip_address INET,
    user_agent TEXT,
    last_activity TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Claves foráneas
    CONSTRAINT fk_user_sessions_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE,
    
    -- Restricciones de validación
    CONSTRAINT user_sessions_expiry_check CHECK (expires_at IS NULL OR expires_at > created_at)
);

-- Comentarios para la tabla user_sessions
COMMENT ON TABLE user_sessions IS 'Registro y control de sesiones activas de usuarios';
COMMENT ON COLUMN user_sessions.user_id IS 'Referencia al usuario propietario de la sesión';
COMMENT ON COLUMN user_sessions.supabase_session_id IS 'ID de sesión de Supabase (si aplica)';
COMMENT ON COLUMN user_sessions.ip_address IS 'Dirección IP desde donde se inició la sesión';
COMMENT ON COLUMN user_sessions.user_agent IS 'Información del navegador/cliente';
COMMENT ON COLUMN user_sessions.last_activity IS 'Última actividad registrada en la sesión';
COMMENT ON COLUMN user_sessions.expires_at IS 'Fecha de expiración de la sesión';

-- -----------------------------------------------------
-- Tabla: role_audit_logs
-- Descripción: Auditoría de cambios en roles y permisos
-- -----------------------------------------------------
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
    
    -- Claves foráneas
    CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_audit_logs_performed_by FOREIGN KEY (performed_by) 
        REFERENCES users(id) ON DELETE SET NULL,
    
    -- Restricciones de validación
    CONSTRAINT audit_logs_action_check CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'ASSIGN', 'REVOKE'))
);

-- Comentarios para la tabla role_audit_logs
COMMENT ON TABLE role_audit_logs IS 'Registro de auditoría para cambios en roles y permisos';
COMMENT ON COLUMN role_audit_logs.user_id IS 'Usuario afectado por la acción';
COMMENT ON COLUMN role_audit_logs.action IS 'Tipo de acción realizada';
COMMENT ON COLUMN role_audit_logs.resource_type IS 'Tipo de recurso modificado (role, permission, user_role)';
COMMENT ON COLUMN role_audit_logs.resource_id IS 'ID del recurso específico modificado';
COMMENT ON COLUMN role_audit_logs.old_values IS 'Valores anteriores (formato JSON)';
COMMENT ON COLUMN role_audit_logs.new_values IS 'Valores nuevos (formato JSON)';
COMMENT ON COLUMN role_audit_logs.performed_by IS 'Usuario que realizó la acción';

-- =====================================================
-- TABLAS DE INVENTARIO Y PRODUCTOS
-- =====================================================

-- -----------------------------------------------------
-- Tabla: categories
-- Descripción: Categorías de productos
-- -----------------------------------------------------
CREATE TABLE categories (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Restricciones
    CONSTRAINT categories_name_length CHECK (LENGTH(name) >= 2)
);

-- Comentarios para la tabla categories
COMMENT ON TABLE categories IS 'Categorías para organizar productos del inventario';
COMMENT ON COLUMN categories.id IS 'Identificador único de la categoría';
COMMENT ON COLUMN categories.name IS 'Nombre único de la categoría';
COMMENT ON COLUMN categories.description IS 'Descripción opcional de la categoría';

-- -----------------------------------------------------
-- Tabla: products
-- Descripción: Productos del inventario
-- -----------------------------------------------------
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
    
    -- Claves foráneas
    CONSTRAINT fk_products_category FOREIGN KEY (category_id) 
        REFERENCES categories(id) ON DELETE CASCADE,
    
    -- Restricciones de validación
    CONSTRAINT products_name_length CHECK (LENGTH(name) >= 2),
    CONSTRAINT products_sku_format CHECK (sku ~* '^[A-Z0-9-_]+$'),
    CONSTRAINT products_cost_price_positive CHECK (cost_price >= 0),
    CONSTRAINT products_sale_price_positive CHECK (sale_price >= 0),
    CONSTRAINT products_stock_quantity_non_negative CHECK (stock_quantity >= 0),
    CONSTRAINT products_min_stock_non_negative CHECK (min_stock >= 0)
);

-- Comentarios para la tabla products
COMMENT ON TABLE products IS 'Catálogo de productos del sistema de inventario';
COMMENT ON COLUMN products.id IS 'Identificador único del producto';
COMMENT ON COLUMN products.name IS 'Nombre del producto';
COMMENT ON COLUMN products.sku IS 'Código único del producto (Stock Keeping Unit)';
COMMENT ON COLUMN products.category_id IS 'Referencia a la categoría del producto';
COMMENT ON COLUMN products.description IS 'Descripción detallada del producto';
COMMENT ON COLUMN products.cost_price IS 'Precio de costo del producto';
COMMENT ON COLUMN products.sale_price IS 'Precio de venta del producto';
COMMENT ON COLUMN products.stock_quantity IS 'Cantidad actual en inventario';
COMMENT ON COLUMN products.min_stock IS 'Stock mínimo antes de alerta';
COMMENT ON COLUMN products.images IS 'Array de URLs de imágenes del producto';

-- -----------------------------------------------------
-- Tabla: suppliers
-- Descripción: Proveedores de productos
-- -----------------------------------------------------
CREATE TABLE suppliers (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    name TEXT NOT NULL,
    contact_info JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Restricciones
    CONSTRAINT suppliers_name_length CHECK (LENGTH(name) >= 2)
);

-- Comentarios para la tabla suppliers
COMMENT ON TABLE suppliers IS 'Proveedores de productos para el inventario';
COMMENT ON COLUMN suppliers.id IS 'Identificador único del proveedor';
COMMENT ON COLUMN suppliers.name IS 'Nombre o razón social del proveedor';
COMMENT ON COLUMN suppliers.contact_info IS 'Información de contacto (JSON: teléfono, email, dirección, etc.)';

-- -----------------------------------------------------
-- Tabla: purchases
-- Descripción: Compras realizadas a proveedores
-- -----------------------------------------------------
CREATE TABLE purchases (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    supplier_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Claves foráneas
    CONSTRAINT fk_purchases_supplier FOREIGN KEY (supplier_id) 
        REFERENCES suppliers(id) ON DELETE CASCADE,
    CONSTRAINT fk_purchases_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE,
    
    -- Restricciones de validación
    CONSTRAINT purchases_total_positive CHECK (total >= 0)
);

-- Comentarios para la tabla purchases
COMMENT ON TABLE purchases IS 'Registro de compras realizadas a proveedores';
COMMENT ON COLUMN purchases.id IS 'Identificador único de la compra';
COMMENT ON COLUMN purchases.supplier_id IS 'Referencia al proveedor';
COMMENT ON COLUMN purchases.user_id IS 'Usuario que registró la compra';
COMMENT ON COLUMN purchases.total IS 'Monto total de la compra';
COMMENT ON COLUMN purchases.date IS 'Fecha de la compra';

-- -----------------------------------------------------
-- Tabla: purchase_items
-- Descripción: Detalle de productos en cada compra
-- -----------------------------------------------------
CREATE TABLE purchase_items (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    purchase_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_cost DECIMAL(10,2) NOT NULL,
    
    -- Claves foráneas
    CONSTRAINT fk_purchase_items_purchase FOREIGN KEY (purchase_id) 
        REFERENCES purchases(id) ON DELETE CASCADE,
    CONSTRAINT fk_purchase_items_product FOREIGN KEY (product_id) 
        REFERENCES products(id) ON DELETE CASCADE,
    
    -- Restricciones de validación
    CONSTRAINT purchase_items_quantity_positive CHECK (quantity > 0),
    CONSTRAINT purchase_items_unit_cost_positive CHECK (unit_cost >= 0)
);

-- Comentarios para la tabla purchase_items
COMMENT ON TABLE purchase_items IS 'Detalle de productos incluidos en cada compra';
COMMENT ON COLUMN purchase_items.purchase_id IS 'Referencia a la compra';
COMMENT ON COLUMN purchase_items.product_id IS 'Referencia al producto comprado';
COMMENT ON COLUMN purchase_items.quantity IS 'Cantidad de productos comprados';
COMMENT ON COLUMN purchase_items.unit_cost IS 'Costo unitario del producto en esta compra';

-- -----------------------------------------------------
-- Tabla: inventory_movements
-- Descripción: Movimientos de inventario (entradas, salidas, ajustes)
-- -----------------------------------------------------
CREATE TABLE inventory_movements (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    product_id TEXT NOT NULL,
    movement_type movement_type NOT NULL,
    quantity INTEGER NOT NULL,
    reference_type TEXT CHECK (reference_type IN ('SALE','PURCHASE','ADJUSTMENT','RETURN')),
    reference_id TEXT,
    notes TEXT,
    user_id TEXT REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Claves foráneas
    CONSTRAINT fk_inventory_movements_product FOREIGN KEY (product_id) 
        REFERENCES products(id) ON DELETE CASCADE,
    
    -- Restricciones de validación
    CONSTRAINT inventory_movements_quantity_not_zero CHECK (quantity <> 0)
);

-- Comentarios para la tabla inventory_movements
COMMENT ON TABLE inventory_movements IS 'Registro de todos los movimientos de inventario';
COMMENT ON COLUMN inventory_movements.product_id IS 'Referencia al producto afectado';
COMMENT ON COLUMN inventory_movements.movement_type IS 'Tipo de movimiento (IN, OUT, ADJUSTMENT, RETURN, TRANSFER)';
COMMENT ON COLUMN inventory_movements.quantity IS 'Cantidad del movimiento (positiva o negativa)';
COMMENT ON COLUMN inventory_movements.reference_type IS 'Tipo de referencia (SALE, PURCHASE, ADJUSTMENT, RETURN)';
COMMENT ON COLUMN inventory_movements.reference_id IS 'ID de referencia (venta, compra, etc.)';
COMMENT ON COLUMN inventory_movements.notes IS 'Notas opcionales sobre el movimiento';
COMMENT ON COLUMN inventory_movements.user_id IS 'Usuario responsable del movimiento';

-- =====================================================
-- TABLAS DE VENTAS Y CLIENTES
-- =====================================================

-- -----------------------------------------------------
-- Tabla: customers
-- Descripción: Clientes del sistema
-- -----------------------------------------------------
CREATE TABLE customers (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Restricciones
    CONSTRAINT customers_name_length CHECK (LENGTH(name) >= 2),
    CONSTRAINT customers_email_format CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT customers_phone_format CHECK (phone IS NULL OR phone ~* '^[\+]?[0-9\-\s\(\)]+$')
);

-- Comentarios para la tabla customers
COMMENT ON TABLE customers IS 'Registro de clientes del sistema POS';
COMMENT ON COLUMN customers.id IS 'Identificador único del cliente';
COMMENT ON COLUMN customers.name IS 'Nombre completo del cliente';
COMMENT ON COLUMN customers.phone IS 'Número de teléfono del cliente (opcional)';
COMMENT ON COLUMN customers.email IS 'Correo electrónico del cliente (opcional)';

-- -----------------------------------------------------
-- Tabla: sales
-- Descripción: Ventas realizadas
-- -----------------------------------------------------
CREATE TABLE sales (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id TEXT NOT NULL,
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
    
    -- Claves foráneas
    CONSTRAINT fk_sales_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_sales_customer FOREIGN KEY (customer_id) 
        REFERENCES customers(id) ON DELETE SET NULL,
    
    -- Restricciones de validación
    CONSTRAINT sales_subtotal_positive CHECK (subtotal >= 0),
    CONSTRAINT sales_discount_non_negative CHECK (discount >= 0),
    CONSTRAINT sales_tax_non_negative CHECK (tax >= 0),
    CONSTRAINT sales_total_positive CHECK (total >= 0)
);

-- Comentarios para la tabla sales
COMMENT ON TABLE sales IS 'Registro de ventas realizadas en el sistema POS';
COMMENT ON COLUMN sales.id IS 'Identificador único de la venta';
COMMENT ON COLUMN sales.user_id IS 'Usuario que realizó la venta';
COMMENT ON COLUMN sales.customer_id IS 'Cliente asociado a la venta (opcional)';
COMMENT ON COLUMN sales.subtotal IS 'Subtotal antes de descuentos e impuestos';
COMMENT ON COLUMN sales.discount IS 'Monto o porcentaje de descuento aplicado';
COMMENT ON COLUMN sales.discount_type IS 'Tipo de descuento (PERCENTAGE o FIXED_AMOUNT)';
COMMENT ON COLUMN sales.tax IS 'Monto de impuestos aplicados';
COMMENT ON COLUMN sales.total IS 'Total final de la venta';
COMMENT ON COLUMN sales.payment_method IS 'Método de pago utilizado';
COMMENT ON COLUMN sales.notes IS 'Notas adicionales sobre la venta';

-- -----------------------------------------------------
-- Tabla: sale_items
-- Descripción: Detalle de productos en cada venta
-- -----------------------------------------------------
CREATE TABLE sale_items (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    sale_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    
    -- Claves foráneas
    CONSTRAINT fk_sale_items_sale FOREIGN KEY (sale_id) 
        REFERENCES sales(id) ON DELETE CASCADE,
    CONSTRAINT fk_sale_items_product FOREIGN KEY (product_id) 
        REFERENCES products(id) ON DELETE CASCADE,
    
    -- Restricciones de validación
    CONSTRAINT sale_items_quantity_positive CHECK (quantity > 0),
    CONSTRAINT sale_items_unit_price_positive CHECK (unit_price >= 0)
);

-- Comentarios para la tabla sale_items
COMMENT ON TABLE sale_items IS 'Detalle de productos incluidos en cada venta';
COMMENT ON COLUMN sale_items.sale_id IS 'Referencia a la venta';
COMMENT ON COLUMN sale_items.product_id IS 'Referencia al producto vendido';
COMMENT ON COLUMN sale_items.quantity IS 'Cantidad de productos vendidos';
COMMENT ON COLUMN sale_items.unit_price IS 'Precio unitario del producto en esta venta';

-- =====================================================
-- TABLAS DE DEVOLUCIONES
-- =====================================================

-- -----------------------------------------------------
-- Tabla: returns
-- Descripción: Devoluciones de productos
-- -----------------------------------------------------
CREATE TABLE returns (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    original_sale_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    customer_id TEXT,
    status return_status DEFAULT 'PENDING' NOT NULL,
    reason TEXT NOT NULL,
    refund_method payment_method NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Claves foráneas
    CONSTRAINT fk_returns_original_sale FOREIGN KEY (original_sale_id) 
        REFERENCES sales(id) ON DELETE CASCADE,
    CONSTRAINT fk_returns_user FOREIGN KEY (user_id) 
        REFERENCES users(id),
    CONSTRAINT fk_returns_customer FOREIGN KEY (customer_id) 
        REFERENCES customers(id),
    
    -- Restricciones de validación
    CONSTRAINT returns_reason_length CHECK (LENGTH(reason) >= 5),
    CONSTRAINT returns_total_amount_positive CHECK (total_amount >= 0)
);

-- Comentarios para la tabla returns
COMMENT ON TABLE returns IS 'Registro de devoluciones de productos';
COMMENT ON COLUMN returns.original_sale_id IS 'Referencia a la venta original';
COMMENT ON COLUMN returns.user_id IS 'Usuario que procesó la devolución';
COMMENT ON COLUMN returns.customer_id IS 'Cliente que realizó la devolución';
COMMENT ON COLUMN returns.status IS 'Estado actual de la devolución';
COMMENT ON COLUMN returns.reason IS 'Motivo de la devolución';
COMMENT ON COLUMN returns.refund_method IS 'Método de reembolso';
COMMENT ON COLUMN returns.total_amount IS 'Monto total a reembolsar';

-- -----------------------------------------------------
-- Tabla: return_items
-- Descripción: Detalle de productos en cada devolución
-- -----------------------------------------------------
CREATE TABLE return_items (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    return_id TEXT NOT NULL,
    original_sale_item_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Claves foráneas
    CONSTRAINT fk_return_items_return FOREIGN KEY (return_id) 
        REFERENCES returns(id) ON DELETE CASCADE,
    CONSTRAINT fk_return_items_product FOREIGN KEY (product_id) 
        REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_return_items_original_sale_item FOREIGN KEY (original_sale_item_id) 
        REFERENCES sale_items(id) ON DELETE CASCADE,
    
    -- Restricciones de validación
    CONSTRAINT return_items_quantity_positive CHECK (quantity > 0),
    CONSTRAINT return_items_unit_price_positive CHECK (unit_price >= 0)
);

-- Comentarios para la tabla return_items
COMMENT ON TABLE return_items IS 'Detalle de productos incluidos en cada devolución';
COMMENT ON COLUMN return_items.return_id IS 'Referencia a la devolución';
COMMENT ON COLUMN return_items.original_sale_item_id IS 'Referencia al item de venta original';
COMMENT ON COLUMN return_items.product_id IS 'Referencia al producto devuelto';
COMMENT ON COLUMN return_items.quantity IS 'Cantidad de productos devueltos';
COMMENT ON COLUMN return_items.unit_price IS 'Precio unitario del producto devuelto';
COMMENT ON COLUMN return_items.reason IS 'Motivo específico de devolución del producto';

-- =====================================================
-- ÍNDICES PARA OPTIMIZACIÓN DE CONSULTAS
-- =====================================================

-- Índices para tabla users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Índices para tabla roles
CREATE INDEX idx_roles_name ON roles(name);
CREATE INDEX idx_roles_is_active ON roles(is_active);

-- Índices para tabla permissions
CREATE INDEX idx_permissions_resource ON permissions(resource);
CREATE INDEX idx_permissions_action ON permissions(action);
CREATE INDEX idx_permissions_resource_action ON permissions(resource, action);

-- Índices para tabla role_permissions
CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);

-- Índices para tabla user_roles
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX idx_user_roles_is_active ON user_roles(is_active);
CREATE INDEX idx_user_roles_expires_at ON user_roles(expires_at);

-- Índices para tabla user_sessions
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_is_active ON user_sessions(is_active);
CREATE INDEX idx_user_sessions_last_activity ON user_sessions(last_activity);

-- Índices para tabla role_audit_logs
CREATE INDEX idx_audit_logs_user_id ON role_audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON role_audit_logs(action);
CREATE INDEX idx_audit_logs_resource_type ON role_audit_logs(resource_type);
CREATE INDEX idx_audit_logs_created_at ON role_audit_logs(created_at);

-- Índices para tabla categories
CREATE INDEX idx_categories_name ON categories(name);

-- Índices para tabla products
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_stock_quantity ON products(stock_quantity);

-- Índices para tabla suppliers
CREATE INDEX idx_suppliers_name ON suppliers(name);

-- Índices para tabla purchases
CREATE INDEX idx_purchases_supplier_id ON purchases(supplier_id);
CREATE INDEX idx_purchases_user_id ON purchases(user_id);
CREATE INDEX idx_purchases_date ON purchases(date);

-- Índices para tabla purchase_items
CREATE INDEX idx_purchase_items_purchase_id ON purchase_items(purchase_id);
CREATE INDEX idx_purchase_items_product_id ON purchase_items(product_id);

-- Índices para tabla inventory_movements
CREATE INDEX idx_inventory_movements_product_id ON inventory_movements(product_id);
CREATE INDEX idx_inventory_movements_type ON inventory_movements(movement_type);
CREATE INDEX idx_inventory_movements_created_at ON inventory_movements(created_at);

-- Índices para tabla customers
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_phone ON customers(phone);

-- Índices para tabla sales
CREATE INDEX idx_sales_user_id ON sales(user_id);
CREATE INDEX idx_sales_customer_id ON sales(customer_id);
CREATE INDEX idx_sales_date ON sales(date);
CREATE INDEX idx_sales_payment_method ON sales(payment_method);

-- Índices para tabla sale_items
CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product_id ON sale_items(product_id);

-- Índices para tabla returns
CREATE INDEX idx_returns_original_sale_id ON returns(original_sale_id);
CREATE INDEX idx_returns_user_id ON returns(user_id);
CREATE INDEX idx_returns_customer_id ON returns(customer_id);
CREATE INDEX idx_returns_status ON returns(status);
CREATE INDEX idx_returns_created_at ON returns(created_at);

-- Índices para tabla return_items
CREATE INDEX idx_return_items_return_id ON return_items(return_id);
CREATE INDEX idx_return_items_product_id ON return_items(product_id);
CREATE INDEX idx_return_items_original_sale_item_id ON return_items(original_sale_item_id);

-- =====================================================
-- TRIGGERS PARA ACTUALIZACIÓN AUTOMÁTICA
-- =====================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger a todas las tablas con updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_permissions_updated_at BEFORE UPDATE ON permissions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchases_updated_at BEFORE UPDATE ON purchases 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON sales 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_returns_updated_at BEFORE UPDATE ON returns 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FUNCIONES AUXILIARES PARA RLS Y PERMISOS
-- =====================================================

-- Función para verificar si el usuario actual es administrador
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    -- Verificar en el rol legacy
    IF EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid()::TEXT 
        AND role = 'ADMIN'
    ) THEN
        RETURN TRUE;
    END IF;
    
    -- Verificar en el sistema de roles nuevo
    IF EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()::TEXT
        AND r.name = 'ADMIN'
        AND ur.is_active = TRUE
        AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
    ) THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si el usuario tiene un permiso específico
CREATE OR REPLACE FUNCTION has_permission(resource_name TEXT, action_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Los administradores tienen todos los permisos
    IF is_admin() THEN
        RETURN TRUE;
    END IF;
    
    -- Verificar permiso específico
    RETURN EXISTS (
        SELECT 1 
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        JOIN role_permissions rp ON r.id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = auth.uid()::TEXT
        AND ur.is_active = TRUE
        AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
        AND r.is_active = TRUE
        AND p.is_active = TRUE
        AND p.resource = resource_name
        AND p.action = action_name
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener el ID del usuario actual
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS TEXT AS $$
BEGIN
    RETURN auth.uid()::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- DATOS INICIALES DEL SISTEMA
-- =====================================================

-- Insertar roles básicos del sistema
INSERT INTO roles (name, display_name, description, is_system_role) VALUES
('ADMIN', 'Administrador', 'Acceso completo al sistema', TRUE),
('CASHIER', 'Cajero', 'Acceso a ventas y consultas básicas', TRUE),
('MANAGER', 'Gerente', 'Acceso a reportes y gestión de inventario', TRUE),
('VIEWER', 'Visualizador', 'Solo lectura de información básica', TRUE)
ON CONFLICT (name) DO NOTHING;

-- Insertar permisos básicos del sistema
INSERT INTO permissions (name, display_name, description, resource, action) VALUES
-- Permisos de usuarios
('users:create', 'Crear Usuarios', 'Crear nuevos usuarios en el sistema', 'users', 'create'),
('users:read', 'Ver Usuarios', 'Ver información de usuarios', 'users', 'read'),
('users:update', 'Actualizar Usuarios', 'Modificar información de usuarios', 'users', 'update'),
('users:delete', 'Eliminar Usuarios', 'Eliminar usuarios del sistema', 'users', 'delete'),

-- Permisos de productos
('products:create', 'Crear Productos', 'Agregar nuevos productos al inventario', 'products', 'create'),
('products:read', 'Ver Productos', 'Ver información de productos', 'products', 'read'),
('products:update', 'Actualizar Productos', 'Modificar información de productos', 'products', 'update'),
('products:delete', 'Eliminar Productos', 'Eliminar productos del inventario', 'products', 'delete'),

-- Permisos de ventas
('sales:create', 'Crear Ventas', 'Registrar nuevas ventas', 'sales', 'create'),
('sales:read', 'Ver Ventas', 'Ver información de ventas', 'sales', 'read'),
('sales:update', 'Actualizar Ventas', 'Modificar información de ventas', 'sales', 'update'),

-- Permisos de reportes
('reports:read', 'Ver Reportes', 'Acceso a reportes del sistema', 'reports', 'read'),

-- Permisos de configuración
('settings:update', 'Configurar Sistema', 'Modificar configuraciones del sistema', 'settings', 'update'),

-- Permisos de roles
('roles:create', 'Crear Roles', 'Crear nuevos roles', 'roles', 'create'),
('roles:read', 'Ver Roles', 'Ver información de roles', 'roles', 'read'),
('roles:update', 'Actualizar Roles', 'Modificar roles existentes', 'roles', 'update'),
('roles:delete', 'Eliminar Roles', 'Eliminar roles del sistema', 'roles', 'delete'),
('roles:assign', 'Asignar Roles', 'Asignar roles a usuarios', 'roles', 'assign')
ON CONFLICT (name) DO NOTHING;

-- Asignar todos los permisos al rol ADMIN
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'ADMIN'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Asignar permisos básicos al rol CASHIER
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'CASHIER'
AND p.name IN ('products:read', 'sales:create', 'sales:read')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Asignar permisos de gestión al rol MANAGER
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'MANAGER'
AND p.name IN ('products:read', 'products:create', 'products:update', 'sales:read', 'reports:read')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Asignar permisos de solo lectura al rol VIEWER
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'VIEWER'
AND p.name IN ('products:read', 'sales:read')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- =====================================================
-- MENSAJE DE FINALIZACIÓN
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Script de base de datos ejecutado exitosamente';
    RAISE NOTICE '📊 Tablas creadas: %', (
        SELECT COUNT(*) 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name IN (
            'users', 'roles', 'permissions', 'role_permissions', 'user_roles',
            'user_sessions', 'role_audit_logs', 'categories', 'products',
            'suppliers', 'purchases', 'purchase_items', 'inventory_movements',
            'customers', 'sales', 'sale_items', 'returns', 'return_items'
        )
    );
    RAISE NOTICE '🔑 Roles del sistema: ADMIN, CASHIER, MANAGER, VIEWER';
    RAISE NOTICE '⚡ Índices y triggers configurados';
    RAISE NOTICE '🛡️  Funciones RLS disponibles: is_admin(), has_permission(), current_user_id()';
    RAISE NOTICE '';
    RAISE NOTICE '📝 Próximos pasos:';
    RAISE NOTICE '   1. Ejecutar políticas RLS: npm run rls-policies apply';
    RAISE NOTICE '   2. Crear usuario administrador: npm run create-admin';
    RAISE NOTICE '   3. Verificar configuración: npm run test-admin';
END $$;