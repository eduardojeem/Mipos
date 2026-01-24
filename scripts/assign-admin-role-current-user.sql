-- Script para asignar rol ADMIN al usuario actual
-- Ejecutar en Supabase SQL Editor

-- 1. Ver usuarios existentes y sus roles
SELECT id, email, full_name, role, created_at 
FROM users 
ORDER BY created_at DESC;

-- 2. Asignar rol ADMIN al primer usuario (cambiar email si es necesario)
UPDATE users 
SET role = 'ADMIN', updated_at = NOW()
WHERE email = (
  SELECT email 
  FROM users 
  ORDER BY created_at ASC 
  LIMIT 1
);

-- 3. Verificar que se asignó correctamente
SELECT id, email, full_name, role, updated_at 
FROM users 
WHERE role = 'ADMIN';

-- 4. Si necesitas asignar ADMIN a un email específico, usa esto:
-- UPDATE users 
-- SET role = 'ADMIN', updated_at = NOW()
-- WHERE email = 'tu@email.com';