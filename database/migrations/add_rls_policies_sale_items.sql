-- ============================================================================
-- Script: Agregar políticas RLS para sale_items
-- ============================================================================
-- Este script crea las políticas de Row Level Security necesarias para que
-- los usuarios autenticados puedan insertar, leer y actualizar items de venta
-- ============================================================================

-- Habilitar RLS en sale_items (si no está habilitado)
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- POLÍTICA 1: Permitir SELECT a usuarios autenticados
-- ============================================================================
-- Los usuarios autenticados pueden ver todos los items de venta
DROP POLICY IF EXISTS "Users can view sale items" ON sale_items;

CREATE POLICY "Users can view sale items"
ON sale_items
FOR SELECT
TO authenticated
USING (true);

-- ============================================================================
-- POLÍTICA 2: Permitir INSERT a usuarios autenticados
-- ============================================================================
-- Los usuarios autenticados pueden crear items de venta
DROP POLICY IF EXISTS "Users can create sale items" ON sale_items;

CREATE POLICY "Users can create sale items"
ON sale_items
FOR INSERT
TO authenticated
WITH CHECK (true);

-- ============================================================================
-- POLÍTICA 3: Permitir UPDATE a usuarios autenticados
-- ============================================================================
-- Los usuarios autenticados pueden actualizar items de venta
DROP POLICY IF EXISTS "Users can update sale items" ON sale_items;

CREATE POLICY "Users can update sale items"
ON sale_items
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- ============================================================================
-- POLÍTICA 4: Permitir DELETE a usuarios autenticados (opcional)
-- ============================================================================
-- Los usuarios autenticados pueden eliminar items de venta (soft delete)
DROP POLICY IF EXISTS "Users can delete sale items" ON sale_items;

CREATE POLICY "Users can delete sale items"
ON sale_items
FOR DELETE
TO authenticated
USING (true);

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
-- Verificar que las políticas se crearon correctamente
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM 
    pg_policies
WHERE 
    tablename = 'sale_items'
ORDER BY 
    policyname;

-- ============================================================================
-- NOTAS
-- ============================================================================
-- Si necesitas políticas más restrictivas (por ejemplo, que los usuarios solo
-- puedan ver/modificar sus propios items), puedes modificar las políticas
-- para incluir condiciones como:
-- USING (EXISTS (SELECT 1 FROM sales WHERE sales.id = sale_items.sale_id AND sales.user_id = auth.uid()))
-- ============================================================================
