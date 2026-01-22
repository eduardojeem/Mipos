-- =====================================================
-- SCRIPT PARA CREAR USUARIOS INICIALES CON ROLES
-- PostgreSQL - Sistema POS
-- =====================================================

-- Este script crea los usuarios iniciales del sistema con sus roles asignados
-- IMPORTANTE: Ejecutar después del script complete-roles-system-postgresql.sql

-- =====================================================
-- 1. CREAR USUARIOS INICIALES
-- =====================================================

-- Usuario Administrador: jeem101595@gmail.com
SELECT * FROM create_user(
    'jeem101595',                    -- username
    'jeem101595@gmail.com',          -- email
    '$2b$10$defaultHashForDemo123',  -- password_hash (cambiar por hash real)
    'Jeem',                          -- first_name
    'Admin',                         -- last_name
    NULL                             -- phone (opcional)
);

-- Usuario Vendedor: johneduardoespinoza95@gmail.com
SELECT * FROM create_user(
    'johneduardo95',                 -- username
    'johneduardoespinoza95@gmail.com', -- email
    '$2b$10$defaultHashForDemo456',  -- password_hash (cambiar por hash real)
    'John Eduardo',                  -- first_name
    'Espinoza',                      -- last_name
    NULL                             -- phone (opcional)
);

-- Usuario Cliente: fbjeem@gmail.com
SELECT * FROM create_user(
    'fbjeem',                        -- username
    'fbjeem@gmail.com',              -- email
    '$2b$10$defaultHashForDemo789',  -- password_hash (cambiar por hash real)
    'FB',                            -- first_name
    'Jeem',                          -- last_name
    NULL                             -- phone (opcional)
);

-- =====================================================
-- 2. ASIGNAR ROLES A USUARIOS
-- =====================================================

-- Asignar rol ADMINISTRADOR a jeem101595@gmail.com (user_id: 1)
SELECT assign_role_to_user(
    1,    -- user_id (jeem101595)
    1,    -- role_id (ADMINISTRADOR)
    1,    -- assigned_by (auto-asignado por admin)
    NULL  -- expires_at (sin expiración)
);

-- Asignar rol VENDEDOR a johneduardoespinoza95@gmail.com (user_id: 2)
SELECT assign_role_to_user(
    2,    -- user_id (johneduardo95)
    3,    -- role_id (VENDEDOR)
    1,    -- assigned_by (asignado por admin)
    NULL  -- expires_at (sin expiración)
);

-- Asignar rol CLIENTE a fbjeem@gmail.com (user_id: 3)
SELECT assign_role_to_user(
    3,    -- user_id (fbjeem)
    2,    -- role_id (CLIENTE)
    1,    -- assigned_by (asignado por admin)
    NULL  -- expires_at (sin expiración)
);

-- =====================================================
-- 3. VERIFICAR USUARIOS CREADOS
-- =====================================================

-- Mostrar todos los usuarios con sus roles
SELECT 
    u.id,
    u.username,
    u.email,
    u.first_name,
    u.last_name,
    r.name as role_name,
    ur.assigned_at
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
WHERE u.is_active = TRUE
ORDER BY u.id;

-- =====================================================
-- 4. VERIFICAR PERMISOS DE CADA USUARIO
-- =====================================================

-- Verificar permisos del administrador
SELECT 'ADMINISTRADOR - jeem101595' as usuario;
SELECT * FROM validate_user_permission(1, 'users', 'create');
SELECT * FROM validate_user_permission(1, 'products', 'delete');
SELECT * FROM validate_user_permission(1, 'system', 'configure');

-- Verificar permisos del vendedor
SELECT 'VENDEDOR - johneduardo95' as usuario;
SELECT * FROM validate_user_permission(2, 'sales', 'create');
SELECT * FROM validate_user_permission(2, 'products', 'read');
SELECT * FROM validate_user_permission(2, 'users', 'delete'); -- Debería ser FALSE

-- Verificar permisos del cliente
SELECT 'CLIENTE - fbjeem' as usuario;
SELECT * FROM validate_user_permission(3, 'products', 'read');
SELECT * FROM validate_user_permission(3, 'profile', 'update');
SELECT * FROM validate_user_permission(3, 'sales', 'create'); -- Debería ser FALSE

-- =====================================================
-- 5. OBTENER ROLES DE CADA USUARIO
-- =====================================================

-- Roles del administrador
SELECT 'Roles de jeem101595:' as info;
SELECT get_user_roles(1);

-- Roles del vendedor
SELECT 'Roles de johneduardo95:' as info;
SELECT get_user_roles(2);

-- Roles del cliente
SELECT 'Roles de fbjeem:' as info;
SELECT get_user_roles(3);

-- =====================================================
-- 6. PRUEBAS DE AUTENTICACIÓN
-- =====================================================

-- NOTA: Estas son pruebas con hashes de ejemplo
-- En producción, usar hashes reales generados con bcrypt

-- Probar autenticación del administrador
SELECT 'Prueba login admin:' as test;
SELECT * FROM authenticate_user('jeem101595', '$2b$10$defaultHashForDemo123');

-- Probar autenticación del vendedor
SELECT 'Prueba login vendedor:' as test;
SELECT * FROM authenticate_user('johneduardo95', '$2b$10$defaultHashForDemo456');

-- Probar autenticación del cliente
SELECT 'Prueba login cliente:' as test;
SELECT * FROM authenticate_user('fbjeem', '$2b$10$defaultHashForDemo789');

-- =====================================================
-- 7. INFORMACIÓN IMPORTANTE
-- =====================================================

/*
USUARIOS CREADOS:

1. ADMINISTRADOR
   - Email: jeem101595@gmail.com
   - Username: jeem101595
   - Permisos: Acceso total al sistema

2. VENDEDOR
   - Email: johneduardoespinoza95@gmail.com
   - Username: johneduardo95
   - Permisos: Ventas, productos (lectura), clientes, reportes

3. CLIENTE
   - Email: fbjeem@gmail.com
   - Username: fbjeem
   - Permisos: Ver productos, gestionar perfil

CONTRASEÑAS:
- Los hashes de contraseña son de ejemplo
- En producción, generar hashes reales con bcrypt
- Contraseñas temporales deben ser cambiadas en el primer login

PRÓXIMOS PASOS:
1. Cambiar los hashes de contraseña por valores reales
2. Implementar cambio de contraseña obligatorio en primer login
3. Configurar notificaciones por email para nuevos usuarios
4. Establecer políticas de contraseñas seguras
*/

-- =====================================================
-- 8. SCRIPT DE LIMPIEZA (OPCIONAL)
-- =====================================================

/*
-- Para eliminar los usuarios de prueba si es necesario:

-- Eliminar asignaciones de roles
DELETE FROM user_roles WHERE user_id IN (1, 2, 3);

-- Eliminar usuarios
DELETE FROM users WHERE email IN (
    'jeem101595@gmail.com',
    'johneduardoespinoza95@gmail.com', 
    'fbjeem@gmail.com'
);
*/