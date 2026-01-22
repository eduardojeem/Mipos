-- =====================================================
-- SISTEMA COMPLETO DE ROLES Y USUARIOS
-- Compatible con MySQL, PostgreSQL y SQL Server
-- =====================================================

-- Configuración inicial para compatibilidad
-- Para MySQL: Usar ENGINE=InnoDB
-- Para PostgreSQL: Usar tipos SERIAL y TEXT
-- Para SQL Server: Usar IDENTITY y NVARCHAR

-- =====================================================
-- 1. CREACIÓN DE TABLAS PRINCIPALES
-- =====================================================

-- Tabla de Roles
-- Define los diferentes tipos de roles en el sistema
CREATE TABLE roles (
    id INT PRIMARY KEY AUTO_INCREMENT, -- MySQL/SQL Server: AUTO_INCREMENT/IDENTITY, PostgreSQL: SERIAL
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    permissions JSON, -- MySQL 5.7+/PostgreSQL: JSON, SQL Server: NVARCHAR(MAX)
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla de Usuarios
-- Almacena información de autenticación y perfil de usuarios
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL, -- Para almacenar hash de contraseña (bcrypt, etc.)
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP NULL,
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla intermedia para relación Usuarios-Roles (Many-to-Many)
-- Permite asignar múltiples roles a un usuario
CREATE TABLE user_roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    assigned_by INT, -- ID del usuario que asignó el rol
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL, -- Para roles temporales
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_user_role (user_id, role_id)
);

-- Tabla de Permisos (opcional, para granularidad fina)
CREATE TABLE permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    resource VARCHAR(50), -- Ej: 'products', 'users', 'sales'
    action VARCHAR(50), -- Ej: 'create', 'read', 'update', 'delete'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Sesiones de Usuario (para control de sesiones activas)
CREATE TABLE user_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    ip_address VARCHAR(45),
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
-- 3. PROCEDIMIENTOS ALMACENADOS
-- =====================================================

-- Procedimiento para crear un nuevo usuario
DELIMITER //
CREATE PROCEDURE CreateUser(
    IN p_username VARCHAR(50),
    IN p_email VARCHAR(100),
    IN p_password_hash VARCHAR(255),
    IN p_first_name VARCHAR(50),
    IN p_last_name VARCHAR(50),
    IN p_phone VARCHAR(20)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- Validar que el usuario no exista
    IF EXISTS (SELECT 1 FROM users WHERE username = p_username OR email = p_email) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Usuario o email ya existe';
    END IF;
    
    -- Insertar nuevo usuario
    INSERT INTO users (username, email, password_hash, first_name, last_name, phone)
    VALUES (p_username, p_email, p_password_hash, p_first_name, p_last_name, p_phone);
    
    COMMIT;
    
    SELECT LAST_INSERT_ID() as user_id, 'Usuario creado exitosamente' as message;
END //
DELIMITER ;

-- Procedimiento para asignar rol a usuario
DELIMITER //
CREATE PROCEDURE AssignRoleToUser(
    IN p_user_id INT,
    IN p_role_id INT,
    IN p_assigned_by INT,
    IN p_expires_at TIMESTAMP
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- Validar que el usuario y rol existan
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id AND is_active = TRUE) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Usuario no encontrado o inactivo';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM roles WHERE id = p_role_id AND is_active = TRUE) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Rol no encontrado o inactivo';
    END IF;
    
    -- Insertar o actualizar asignación de rol
    INSERT INTO user_roles (user_id, role_id, assigned_by, expires_at)
    VALUES (p_user_id, p_role_id, p_assigned_by, p_expires_at)
    ON DUPLICATE KEY UPDATE 
        assigned_by = p_assigned_by,
        assigned_at = CURRENT_TIMESTAMP,
        expires_at = p_expires_at,
        is_active = TRUE;
    
    COMMIT;
    
    SELECT 'Rol asignado exitosamente' as message;
END //
DELIMITER ;

-- Procedimiento para validar permisos de usuario
DELIMITER //
CREATE PROCEDURE ValidateUserPermission(
    IN p_user_id INT,
    IN p_resource VARCHAR(50),
    IN p_action VARCHAR(50)
)
BEGIN
    DECLARE v_has_permission BOOLEAN DEFAULT FALSE;
    DECLARE v_role_permissions JSON;
    DECLARE done INT DEFAULT FALSE;
    
    -- Cursor para obtener permisos de todos los roles del usuario
    DECLARE role_cursor CURSOR FOR
        SELECT r.permissions
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = p_user_id 
        AND ur.is_active = TRUE 
        AND r.is_active = TRUE
        AND (ur.expires_at IS NULL OR ur.expires_at > NOW());
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    -- Verificar si el usuario existe y está activo
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id AND is_active = TRUE) THEN
        SELECT FALSE as has_permission, 'Usuario no encontrado o inactivo' as message;
        LEAVE ValidateUserPermission;
    END IF;
    
    -- Revisar permisos en cada rol del usuario
    OPEN role_cursor;
    read_loop: LOOP
        FETCH role_cursor INTO v_role_permissions;
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        -- Verificar si tiene permiso total (all: true)
        IF JSON_EXTRACT(v_role_permissions, '$.all') = TRUE THEN
            SET v_has_permission = TRUE;
            LEAVE read_loop;
        END IF;
        
        -- Verificar permiso específico para el recurso y acción
        IF JSON_CONTAINS(JSON_EXTRACT(v_role_permissions, CONCAT('$.', p_resource)), CONCAT('"', p_action, '"')) THEN
            SET v_has_permission = TRUE;
            LEAVE read_loop;
        END IF;
    END LOOP;
    
    CLOSE role_cursor;
    
    SELECT v_has_permission as has_permission, 
           CASE WHEN v_has_permission THEN 'Permiso concedido' ELSE 'Permiso denegado' END as message;
END //
DELIMITER ;

-- Procedimiento para autenticar usuario
DELIMITER //
CREATE PROCEDURE AuthenticateUser(
    IN p_username VARCHAR(50),
    IN p_password_hash VARCHAR(255)
)
BEGIN
    DECLARE v_user_id INT;
    DECLARE v_is_locked BOOLEAN DEFAULT FALSE;
    DECLARE v_failed_attempts INT DEFAULT 0;
    
    -- Verificar si la cuenta está bloqueada
    SELECT id, failed_login_attempts, (locked_until > NOW()) as is_locked
    INTO v_user_id, v_failed_attempts, v_is_locked
    FROM users 
    WHERE (username = p_username OR email = p_username) 
    AND is_active = TRUE;
    
    IF v_user_id IS NULL THEN
        SELECT FALSE as authenticated, 'Usuario no encontrado' as message, NULL as user_id;
        LEAVE AuthenticateUser;
    END IF;
    
    IF v_is_locked THEN
        SELECT FALSE as authenticated, 'Cuenta bloqueada temporalmente' as message, NULL as user_id;
        LEAVE AuthenticateUser;
    END IF;
    
    -- Verificar contraseña
    IF EXISTS (SELECT 1 FROM users WHERE id = v_user_id AND password_hash = p_password_hash) THEN
        -- Login exitoso
        UPDATE users SET 
            last_login = NOW(),
            failed_login_attempts = 0,
            locked_until = NULL
        WHERE id = v_user_id;
        
        SELECT TRUE as authenticated, 'Login exitoso' as message, v_user_id as user_id;
    ELSE
        -- Login fallido
        SET v_failed_attempts = v_failed_attempts + 1;
        
        UPDATE users SET 
            failed_login_attempts = v_failed_attempts,
            locked_until = CASE WHEN v_failed_attempts >= 5 THEN DATE_ADD(NOW(), INTERVAL 30 MINUTE) ELSE NULL END
        WHERE id = v_user_id;
        
        SELECT FALSE as authenticated, 
               CASE WHEN v_failed_attempts >= 5 THEN 'Cuenta bloqueada por múltiples intentos fallidos' 
                    ELSE CONCAT('Contraseña incorrecta. Intentos restantes: ', 5 - v_failed_attempts) END as message,
               NULL as user_id;
    END IF;
END //
DELIMITER ;

-- =====================================================
-- 4. FUNCIONES DE UTILIDAD
-- =====================================================

-- Función para obtener roles de un usuario
DELIMITER //
CREATE FUNCTION GetUserRoles(p_user_id INT) 
RETURNS JSON
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE v_roles JSON;
    
    SELECT JSON_ARRAYAGG(
        JSON_OBJECT(
            'id', r.id,
            'name', r.name,
            'description', r.description,
            'assigned_at', ur.assigned_at,
            'expires_at', ur.expires_at
        )
    ) INTO v_roles
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = p_user_id 
    AND ur.is_active = TRUE 
    AND r.is_active = TRUE
    AND (ur.expires_at IS NULL OR ur.expires_at > NOW());
    
    RETURN COALESCE(v_roles, JSON_ARRAY());
END //
DELIMITER ;

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
JOIN permissions p ON JSON_CONTAINS(r.permissions, CONCAT('["', p.action, '"]'), CONCAT('$.', p.resource))
WHERE u.is_active = TRUE 
AND ur.is_active = TRUE 
AND r.is_active = TRUE
AND (ur.expires_at IS NULL OR ur.expires_at > NOW());

-- =====================================================
-- 6. TRIGGERS PARA AUDITORÍA Y SEGURIDAD
-- =====================================================

-- Trigger para actualizar timestamp en roles
DELIMITER //
CREATE TRIGGER roles_updated_at
    BEFORE UPDATE ON roles
    FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END //
DELIMITER ;

-- Trigger para actualizar timestamp en usuarios
DELIMITER //
CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END //
DELIMITER ;

-- Trigger para limpiar sesiones expiradas
DELIMITER //
CREATE TRIGGER clean_expired_sessions
    AFTER INSERT ON user_sessions
    FOR EACH ROW
BEGIN
    DELETE FROM user_sessions WHERE expires_at < NOW();
END //
DELIMITER ;

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

-- =====================================================
-- 8. PROCEDIMIENTOS DE MANTENIMIENTO
-- =====================================================

-- Procedimiento para limpiar sesiones expiradas
DELIMITER //
CREATE PROCEDURE CleanExpiredSessions()
BEGIN
    DELETE FROM user_sessions WHERE expires_at < NOW();
    SELECT ROW_COUNT() as cleaned_sessions;
END //
DELIMITER ;

-- Procedimiento para desbloquear cuentas
DELIMITER //
CREATE PROCEDURE UnlockUserAccount(IN p_user_id INT)
BEGIN
    UPDATE users SET 
        failed_login_attempts = 0,
        locked_until = NULL
    WHERE id = p_user_id;
    
    SELECT 'Cuenta desbloqueada exitosamente' as message;
END //
DELIMITER ;

-- =====================================================
-- 9. EJEMPLOS DE USO
-- =====================================================

/*
-- Crear un usuario administrador
CALL CreateUser('admin', 'admin@sistema.com', 'hash_de_contraseña', 'Admin', 'Sistema', '123456789');

-- Asignar rol de administrador al usuario
CALL AssignRoleToUser(1, 1, 1, NULL);

-- Validar permiso de usuario
CALL ValidateUserPermission(1, 'users', 'create');

-- Autenticar usuario
CALL AuthenticateUser('admin', 'hash_de_contraseña');

-- Obtener roles de usuario
SELECT GetUserRoles(1);

-- Ver usuarios con roles
SELECT * FROM user_roles_view WHERE user_id = 1;

-- Ver permisos efectivos
SELECT * FROM user_permissions_view WHERE user_id = 1;
*/

-- =====================================================
-- NOTAS DE COMPATIBILIDAD
-- =====================================================

/*
MYSQL:
- Usar AUTO_INCREMENT para IDs
- JSON nativo disponible en 5.7+
- ENGINE=InnoDB recomendado

POSTGRESQL:
- Cambiar AUTO_INCREMENT por SERIAL
- Cambiar VARCHAR por TEXT donde sea apropiado
- JSON nativo disponible
- Usar $$ en lugar de DELIMITER para procedimientos

SQL SERVER:
- Cambiar AUTO_INCREMENT por IDENTITY(1,1)
- Cambiar JSON por NVARCHAR(MAX)
- Usar NVARCHAR en lugar de VARCHAR para Unicode
- Sintaxis diferente para procedimientos almacenados
*/