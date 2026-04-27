-- Script para actualizar tu rol a SUPER_ADMIN
-- Fecha: 2026-02-15
-- Descripción: Permite ver los enlaces SaaS en el frontend

-- PASO 1: Ver todos los usuarios y sus roles actuales
SELECT 
  id,
  email,
  full_name,
  role,
  status,
  created_at
FROM users
ORDER BY created_at DESC;

-- PASO 2: Actualizar tu usuario a SUPER_ADMIN
-- ⚠️ REEMPLAZA 'tu_email@ejemplo.com' con tu email real
UPDATE users 
SET role = 'SUPER_ADMIN' 
WHERE email = 'tu_email@ejemplo.com';

-- PASO 3: Verificar el cambio
SELECT 
  email,
  role,
  status
FROM users 
WHERE email = 'tu_email@ejemplo.com';

-- RESULTADO ESPERADO:
-- email                  | role        | status
-- -----------------------|-------------|--------
-- tu_email@ejemplo.com   | SUPER_ADMIN | ACTIVE

-- NOTA: Después de ejecutar este script:
-- 1. Cierra sesión en el frontend
-- 2. Vuelve a iniciar sesión
-- 3. Los enlaces SaaS deberían aparecer en el sidebar
