-- =====================================================
-- SISTEMA COMPLETO DE ROLES Y USUARIOS - POSTGRESQL
-- Versión específica para PostgreSQL
-- =====================================================

-- =====================================================
-- 1. CREACIÓN DE TABLAS PRINCIPALES
-- =====================================================

-- Tabla de Roles
-- Define los diferentes tipos de roles en el sistema
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    permissions JSONB, -- PostgreSQL usa JSONB para mejor rendimiento
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Usuarios
-- Almacena información de autenticación y perfil de usuarios
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL, -- Para almacenar hash de contraseña (bcrypt, etc.)
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP NULL,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla intermedia para relación Usuarios-Roles (Many-to-Many)
-- Permite asignar múltiples roles a un usuario
CREATE TABLE user_roles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    role_id INTEGER NOT NULL,
    assigned_by INTEGER, -- ID del usuario que asignó el rol
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL, -- Para roles temporales
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE (user_id, role_id)
);

-- Tabla de Permisos (opcional, para granularidad fina)
CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    resource VARCHAR(50), -- Ej: 'products', 'users', 'sales'
    action VARCHAR(50), -- Ej: 'create', 'read', 'update', 'delete'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Sesiones de Usuario (para control de sesiones activas)
CREATE TABLE user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    ip_address INET, -- PostgreSQL tiene tipo específico para IPs
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =====================================================
-- 2. INSERCIÓN DE DATOS INICIALES
-- =====================================================

-- Insertar roles predefinidos
INSERT INTO roles (name, description, permissions) VALUES 
('ADMINISTRADOR', 'Acceso total al sistema', '{"all": true, "users": ["create", "read", "update", "delete"], "products": ["create", "read", "update", "delete"], "sales": ["create", "read", "update", "delete"], "reports": ["read"], "system": ["configure"]}'),
('CLIENTE', 'Permisos limitados para clientes', '{"products": ["read"], "profile": ["read", "update"]}'),
('VENDEDOR', 'Permisos comerciales para ventas', '{"products": ["read"], "sales": ["create", "read", "update"], "customers": ["create", "read", "update"], "reports": ["read"]}');

-- Insertar permisos básicos
INSERT INTO permissions (name, description, resource, action) VALUES
('users.create', 'Crear usuarios', 'users', 'create'),
('users.read', 'Ver usuarios', 'users', 'read'),
('users.update', 'Actualizar usuarios', 'users', 'update'),
('users.delete', 'Eliminar usuarios', 'users', 'delete'),
('products.create', 'Crear productos', 'products', 'create'),
('products.read', 'Ver productos', 'products', 'read'),
('products.update', 'Actualizar productos', 'products', 'update'),
('products.delete', 'Eliminar productos', 'products', 'delete'),
('sales.create', 'Crear ventas', 'sales', 'create'),
('sales.read', 'Ver ventas', 'sales', 'read'),
('sales.update', 'Actualizar ventas', 'sales', 'update'),
('sales.delete', 'Eliminar ventas', 'sales', 'delete'),
('reports.read', 'Ver reportes', 'reports', 'read'),
('system.configure', 'Configurar sistema', 'system', 'configure');

-- =====================================================
-- 3. FUNCIONES Y PROCEDIMIENTOS (PostgreSQL)
-- =====================================================

-- Función para crear un nuevo usuario
CREATE OR REPLACE FUNCTION create_user(
    p_username VARCHAR(50),
    p_email VARCHAR(100),
    p_password_hash VARCHAR(255),
    p_first_name VARCHAR(50) DEFAULT NULL,
    p_last_name VARCHAR(50) DEFAULT NULL,
    p_phone VARCHAR(20) DEFAULT NULL
) RETURNS TABLE(user_id INTEGER, message TEXT) AS $$
DECLARE
    v_user_id INTEGER;
BEGIN
    -- Validar que el usuario no exista
    IF EXISTS (SELECT 1 FROM users WHERE username = p_username OR email = p_email) THEN
        RAISE EXCEPTION 'Usuario o email ya existe';
    END IF;
    
    -- Insertar nuevo usuario
    INSERT INTO users (username, email, password_hash, first_name, last_name, phone)
    VALUES (p_username, p_email, p_password_hash, p_first_name, p_last_name, p_phone)
    RETURNING id INTO v_user_id;
    
    RETURN QUERY SELECT v_user_id, 'Usuario creado exitosamente'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Función para asignar rol a usuario
CREATE OR REPLACE FUNCTION assign_role_to_user(
    p_user_id INTEGER,
    p_role_id INTEGER,
    p_assigned_by INTEGER DEFAULT NULL,
    p_expires_at TIMESTAMP DEFAULT NULL
) RETURNS TEXT AS $$
BEGIN
    -- Validar que el usuario y rol existan
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id AND is_active = TRUE) THEN
        RAISE EXCEPTION 'Usuario no encontrado o inactivo';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM roles WHERE id = p_role_id AND is_active = TRUE) THEN
        RAISE EXCEPTION 'Rol no encontrado o inactivo';
    END IF;
    
    -- Insertar o actualizar asignación de rol
    INSERT INTO user_roles (user_id, role_id, assigned_by, expires_at)
    VALUES (p_user_id, p_role_id, p_assigned_by, p_expires_at)
    ON CONFLICT (user_id, role_id) 
    DO UPDATE SET 
        assigned_by = p_assigned_by,
        assigned_at = CURRENT_TIMESTAMP,
        expires_at = p_expires_at,
        is_active = TRUE;
    
    RETURN 'Rol asignado exitosamente';
END;
$$ LANGUAGE plpgsql;

-- Función para validar permisos de usuario
CREATE OR REPLACE FUNCTION validate_user_permission(
    p_user_id INTEGER,
    p_resource VARCHAR(50),
    p_action VARCHAR(50)
) RETURNS TABLE(has_permission BOOLEAN, message TEXT) AS $$
DECLARE
    v_has_permission BOOLEAN DEFAULT FALSE;
    v_role_permissions JSONB;
    role_record RECORD;
BEGIN
    -- Verificar si el usuario existe y está activo
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id AND is_active = TRUE) THEN
        RETURN QUERY SELECT FALSE, 'Usuario no encontrado o inactivo'::TEXT;
        RETURN;
    END IF;
    
    -- Revisar permisos en cada rol del usuario
    FOR role_record IN 
        SELECT r.permissions
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = p_user_id 
        AND ur.is_active = TRUE 
        AND r.is_active = TRUE
        AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
    LOOP
        v_role_permissions := role_record.permissions;
        
        -- Verificar si tiene permiso total (all: true)
        IF (v_role_permissions->>'all')::BOOLEAN = TRUE THEN
            v_has_permission := TRUE;
            EXIT;
        END IF;
        
        -- Verificar permiso específico para el recurso y acción
        IF v_role_permissions->p_resource ? p_action THEN
            v_has_permission := TRUE;
            EXIT;
        END IF;
    END LOOP;
    
    RETURN QUERY SELECT v_has_permission, 
           CASE WHEN v_has_permission THEN 'Permiso concedido'::TEXT ELSE 'Permiso denegado'::TEXT END;
END;
$$ LANGUAGE plpgsql;

-- Función para autenticar usuario
CREATE OR REPLACE FUNCTION authenticate_user(
    p_username VARCHAR(50),
    p_password_hash VARCHAR(255)
) RETURNS TABLE(authenticated BOOLEAN, message TEXT, user_id INTEGER) AS $$
DECLARE
    v_user_id INTEGER;
    v_is_locked BOOLEAN DEFAULT FALSE;
    v_failed_attempts INTEGER DEFAULT 0;
    user_record RECORD;
BEGIN
    -- Verificar si la cuenta está bloqueada
    SELECT id, failed_login_attempts, (locked_until > NOW()) as is_locked
    INTO user_record
    FROM users 
    WHERE (username = p_username OR email = p_username) 
    AND is_active = TRUE;
    
    IF user_record.id IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Usuario no encontrado'::TEXT, NULL::INTEGER;
        RETURN;
    END IF;
    
    v_user_id := user_record.id;
    v_failed_attempts := user_record.failed_login_attempts;
    v_is_locked := user_record.is_locked;
    
    IF v_is_locked THEN
        RETURN QUERY SELECT FALSE, 'Cuenta bloqueada temporalmente'::TEXT, NULL::INTEGER;
        RETURN;
    END IF;
    
    -- Verificar contraseña
    IF EXISTS (SELECT 1 FROM users WHERE id = v_user_id AND password_hash = p_password_hash) THEN
        -- Login exitoso
        UPDATE users SET 
            last_login = NOW(),
            failed_login_attempts = 0,
            locked_until = NULL
        WHERE id = v_user_id;
        
        RETURN QUERY SELECT TRUE, 'Login exitoso'::TEXT, v_user_id;
    ELSE
        -- Login fallido
        v_failed_attempts := v_failed_attempts + 1;
        
        UPDATE users SET 
            failed_login_attempts = v_failed_attempts,
            locked_until = CASE WHEN v_failed_attempts >= 5 THEN NOW() + INTERVAL '30 minutes' ELSE NULL END
        WHERE id = v_user_id;
        
        RETURN QUERY SELECT FALSE, 
               CASE WHEN v_failed_attempts >= 5 THEN 'Cuenta bloqueada por múltiples intentos fallidos'::TEXT
                    ELSE CONCAT('Contraseña incorrecta. Intentos restantes: ', 5 - v_failed_attempts)::TEXT END,
               NULL::INTEGER;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. FUNCIONES DE UTILIDAD
-- =====================================================

-- Función para obtener roles de un usuario
CREATE OR REPLACE FUNCTION get_user_roles(p_user_id INTEGER) 
RETURNS JSONB AS $$
DECLARE
    v_roles JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', r.id,
            'name', r.name,
            'description', r.description,
            'assigned_at', ur.assigned_at,
            'expires_at', ur.expires_at
        )
    ), '[]'::jsonb) INTO v_roles
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = p_user_id 
    AND ur.is_active = TRUE 
    AND r.is_active = TRUE
    AND (ur.expires_at IS NULL OR ur.expires_at > NOW());
    
    RETURN v_roles;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. VISTAS PARA CONSULTAS COMUNES
-- =====================================================

-- Vista de usuarios con sus roles
CREATE VIEW user_roles_view AS
SELECT 
    u.id as user_id,
    u.username,
    u.email,
    u.first_name,
    u.last_name,
    u.is_active as user_active,
    r.id as role_id,
    r.name as role_name,
    r.description as role_description,
    ur.assigned_at,
    ur.expires_at,
    ur.is_active as assignment_active
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
WHERE u.is_active = TRUE;

-- Vista de permisos efectivos por usuario
CREATE VIEW user_permissions_view AS
SELECT DISTINCT
    u.id as user_id,
    u.username,
    p.name as permission_name,
    p.resource,
    p.action
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
JOIN permissions p ON r.permissions->p.resource ? p.action
WHERE u.is_active = TRUE 
AND ur.is_active = TRUE 
AND r.is_active = TRUE
AND (ur.expires_at IS NULL OR ur.expires_at > NOW());

-- =====================================================
-- 6. TRIGGERS PARA AUDITORÍA Y SEGURIDAD
-- =====================================================

-- Función para actualizar timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar timestamp en roles
CREATE TRIGGER roles_updated_at
    BEFORE UPDATE ON roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para actualizar timestamp en usuarios
CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Función para limpiar sesiones expiradas
CREATE OR REPLACE FUNCTION clean_expired_sessions_trigger()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM user_sessions WHERE expires_at < NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para limpiar sesiones expiradas
CREATE TRIGGER clean_expired_sessions
    AFTER INSERT ON user_sessions
    FOR EACH ROW
    EXECUTE FUNCTION clean_expired_sessions_trigger();

-- =====================================================
-- 7. ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================

-- Índices en tabla users
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active);
CREATE INDEX idx_users_last_login ON users(last_login);

-- Índices en tabla user_roles
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX idx_user_roles_active ON user_roles(is_active);
CREATE INDEX idx_user_roles_expires ON user_roles(expires_at);

-- Índices en tabla roles
CREATE INDEX idx_roles_name ON roles(name);
CREATE INDEX idx_roles_active ON roles(is_active);

-- Índices en tabla user_sessions
CREATE INDEX idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at);

-- Índices JSONB para permisos (PostgreSQL específico)
CREATE INDEX idx_roles_permissions ON roles USING GIN (permissions);

-- =====================================================
-- 8. FUNCIONES DE MANTENIMIENTO
-- =====================================================

-- Función para limpiar sesiones expiradas
CREATE OR REPLACE FUNCTION clean_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    cleaned_count INTEGER;
BEGIN
    DELETE FROM user_sessions WHERE expires_at < NOW();
    GET DIAGNOSTICS cleaned_count = ROW_COUNT;
    RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql;

-- Función para desbloquear cuentas
CREATE OR REPLACE FUNCTION unlock_user_account(p_user_id INTEGER)
RETURNS TEXT AS $$
BEGIN
    UPDATE users SET 
        failed_login_attempts = 0,
        locked_until = NULL
    WHERE id = p_user_id;
    
    RETURN 'Cuenta desbloqueada exitosamente';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. EJEMPLOS DE USO
-- =====================================================

/*
-- Crear un usuario administrador
SELECT * FROM create_user('admin', 'admin@sistema.com', 'hash_de_contraseña', 'Admin', 'Sistema', '123456789');

-- Asignar rol de administrador al usuario
SELECT assign_role_to_user(1, 1, 1, NULL);

-- Validar permiso de usuario
SELECT * FROM validate_user_permission(1, 'users', 'create');

-- Autenticar usuario
SELECT * FROM authenticate_user('admin', 'hash_de_contraseña');

-- Obtener roles de usuario
SELECT get_user_roles(1);

-- Ver usuarios con roles
SELECT * FROM user_roles_view WHERE user_id = 1;

-- Ver permisos efectivos
SELECT * FROM user_permissions_view WHERE user_id = 1;

-- Limpiar sesiones expiradas
SELECT clean_expired_sessions();

-- Desbloquear cuenta de usuario
SELECT unlock_user_account(1);
*/

-- =====================================================
-- CONFIGURACIÓN ADICIONAL PARA POSTGRESQL
-- =====================================================

-- Habilitar extensión para UUIDs si se necesita
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Configurar timezone si es necesario
-- SET timezone = 'America/Mexico_City';

-- =====================================================
-- NOTAS ESPECÍFICAS PARA POSTGRESQL
-- =====================================================

/*
CARACTERÍSTICAS ESPECÍFICAS DE POSTGRESQL:
- SERIAL en lugar de AUTO_INCREMENT
- JSONB para mejor rendimiento que JSON
- Funciones con $$ delimiters
- INET tipo específico para direcciones IP
- Soporte nativo para arrays y JSON
- Triggers con EXECUTE FUNCTION
- ON CONFLICT para UPSERT operations
- Mejor soporte para transacciones complejas
*/