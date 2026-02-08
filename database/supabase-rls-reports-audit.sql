-- ⚠️ Scripts SQL para auditar y habilitar RLS en Supabase
-- IMPORTANTE: Ejecutar manualmente en la consola de Supabase
-- Fecha: 2026-02-08

-- =====================================================
-- 1. AUDITORÍA DE POLÍTICAS RLS EXISTENTES
-- =====================================================

-- Verificar qué tablas tienen RLS habilitado
SELECT 
  schemaname,
  tablename,
  rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'sales', 
    'sale_items', 
    'products', 
    'customers', 
    'categories',
    'inventory_movements',
    'bank_transactions'
  )
ORDER BY tablename;

-- Listar todas las políticas RLS existentes
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =====================================================
-- 2. HABILITAR RLS EN TABLAS FALTANTES
-- =====================================================

-- Habilitar RLS en sale_items (CRÍTICO)
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS en inventory_movements
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS en bank_transactions
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 3. POLÍTICAS RLS PARA sale_items
-- =====================================================

-- Política SELECT: solo items de ventas de la organización del usuario
CREATE POLICY "Users can view their organization's sale items"
  ON sale_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sales
      WHERE sales.id = sale_items.sale_id
        AND sales.organization_id IN (
          SELECT organization_id FROM organization_members
          WHERE user_id = auth.uid()
        )
    )
  );

-- Política INSERT: solo crear items para ventas de su organización
CREATE POLICY "Users can insert sale items for their organization"
  ON sale_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sales
      WHERE sales.id = sale_items.sale_id
        AND sales.organization_id IN (
          SELECT organization_id FROM organization_members
          WHERE user_id = auth.uid()
        )
    )
  );

-- Política UPDATE: solo actualizar items de su organización
CREATE POLICY "Users can update their organization's sale items"
  ON sale_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM sales
      WHERE sales.id = sale_items.sale_id
        AND sales.organization_id IN (
          SELECT organization_id FROM organization_members
          WHERE user_id = auth.uid()
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sales
      WHERE sales.id = sale_items.sale_id
        AND sales.organization_id IN (
          SELECT organization_id FROM organization_members
          WHERE user_id = auth.uid()
        )
    )
  );

-- Política DELETE: solo eliminar items de su organización
CREATE POLICY "Users can delete their organization's sale items"
  ON sale_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM sales
      WHERE sales.id = sale_items.sale_id
        AND sales.organization_id IN (
          SELECT organization_id FROM organization_members
          WHERE user_id = auth.uid()
        )
    )
  );

-- =====================================================
-- 4. POLÍTICAS RLS PARA inventory_movements
-- =====================================================

-- Política SELECT
CREATE POLICY "Users can view their organization's inventory movements"
  ON inventory_movements
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Política INSERT
CREATE POLICY "Users can insert inventory movements for their organization"
  ON inventory_movements
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Política UPDATE
CREATE POLICY "Users can update their organization's inventory movements"
  ON inventory_movements
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Política DELETE
CREATE POLICY "Users can delete their organization's inventory movements"
  ON inventory_movements
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- 5. POLÍTICAS RLS PARA bank_transactions
-- =====================================================

-- Política SELECT
CREATE POLICY "Users can view their organization's bank transactions"
  ON bank_transactions
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Política INSERT
CREATE POLICY "Users can insert bank transactions for their organization"
  ON bank_transactions
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Política UPDATE
CREATE POLICY "Users can update their organization's bank transactions"
  ON bank_transactions
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Política DELETE
CREATE POLICY "Users can delete their organization's bank transactions"
  ON bank_transactions
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- 6. VERIFICACIÓN POST-IMPLEMENTACIÓN
-- =====================================================

-- Verificar que todas las tablas ahora tienen RLS habilitado
SELECT 
  tablename,
  rowsecurity,
  COUNT(policyname) as num_policies
FROM pg_tables
LEFT JOIN pg_policies USING (schemaname, tablename)
WHERE schemaname = 'public' 
  AND tablename IN (
    'sales', 
    'sale_items', 
    'products', 
    'customers', 
    'categories',
    'inventory_movements',
    'bank_transactions'
  )
GROUP BY tablename, rowsecurity
ORDER BY tablename;

-- =====================================================
-- 7. NOTAS IMPORTANTES
-- =====================================================

/*
⚠️ ATENCIÓN:
1. Estos scripts deben ejecutarse con permisos de administrador en Supabase
2. Realizar BACKUP antes de aplicar cambios
3. Probar en entorno de desarrollo primero
4. Verificar que la tabla organization_members existe y tiene los datos correctos
5. Si hay un esquema diferente de membresías, ajustar las queries en consecuencia

✅ DESPUÉS DE EJECUTAR:
- Probar queries de reportes para asegurar que funcionan
- Verificar que usuarios solo pueden ver datos de su organización
- Monitorear logs de Supabase para detectar violaciones RLS
*/
