-- ============================================================================
-- Script de Datos de Prueba SIMPLIFICADO - Solo Productos y Categorías
-- ============================================================================

DO $$
DECLARE
  -- IDs de organizaciones configuradas
  org_1_id uuid := '2fac6ec5-53d4-493e-84df-24bf8a8a6666';
  org_2_id uuid := '25a6adfc-5f2b-4486-af36-7f132658dd8d';
  
  -- Variables para almacenar IDs generados
  cat_1_org_1 uuid;
  cat_2_org_1 uuid;
  cat_1_org_2 uuid;
  cat_2_org_2 uuid;
  
BEGIN
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Creando datos de prueba multitenancy';
  RAISE NOTICE '========================================';
  
  -- ============================================================================
  -- ORGANIZACIÓN 1 - Maquillaje
  -- ============================================================================
  
  RAISE NOTICE 'Organización 1: Productos de Maquillaje';
  
  -- Categorías Org 1
  INSERT INTO categories (name, description, organization_id, created_at, updated_at)
  VALUES ('Maquillaje Premium', 'Productos de maquillaje de alta gama', org_1_id, NOW(), NOW())
  RETURNING id INTO cat_1_org_1;
  
  INSERT INTO categories (name, description, organization_id, created_at, updated_at)
  VALUES ('Cuidado Facial', 'Tratamientos y cremas para el rostro', org_1_id, NOW(), NOW())
  RETURNING id INTO cat_2_org_1;
  
  -- Productos Org 1
  INSERT INTO products (
    name, sku, description, sale_price, cost_price, 
    stock_quantity, min_stock, category_id, is_active, 
    organization_id, created_at, updated_at
  )
  VALUES 
    ('Labial Mate Rojo Intenso', 'ORG1-LAB-001', 'Labial mate de larga duración', 
     25.99, 12.00, 50, 10, cat_1_org_1, true, org_1_id, NOW(), NOW()),
    
    ('Base de Maquillaje HD', 'ORG1-BASE-001', 'Base líquida de alta definición', 
     45.50, 22.00, 30, 8, cat_1_org_1, true, org_1_id, NOW(), NOW()),
    
    ('Crema Hidratante Día', 'ORG1-CREMA-001', 'Crema hidratante con SPF 30', 
     35.00, 18.00, 25, 5, cat_2_org_1, true, org_1_id, NOW(), NOW());
  
  RAISE NOTICE '✅ Org 1: 2 categorías, 3 productos creados';
  
  -- ============================================================================
  -- ORGANIZACIÓN 2 - Electrónica
  -- ============================================================================
  
  RAISE NOTICE 'Organización 2: Productos de Electrónica';
  
  -- Categorías Org 2
  INSERT INTO categories (name, description, organization_id, created_at, updated_at)
  VALUES ('Electrónica', 'Productos electrónicos y accesorios', org_2_id, NOW(), NOW())
  RETURNING id INTO cat_1_org_2;
  
  INSERT INTO categories (name, description, organization_id, created_at, updated_at)
  VALUES ('Accesorios Tech', 'Accesorios para dispositivos', org_2_id, NOW(), NOW())
  RETURNING id INTO cat_2_org_2;
  
  -- Productos Org 2
  INSERT INTO products (
    name, sku, description, sale_price, cost_price, 
    stock_quantity, min_stock, category_id, is_active, 
    organization_id, created_at, updated_at
  )
  VALUES 
    ('Auriculares Bluetooth Pro', 'ORG2-AUR-001', 'Auriculares inalámbricos con cancelación de ruido', 
     89.99, 45.00, 40, 10, cat_1_org_2, true, org_2_id, NOW(), NOW()),
    
    ('Cargador Inalámbrico', 'ORG2-CARG-001', 'Cargador inalámbrico 15W carga rápida', 
     29.99, 15.00, 60, 15, cat_2_org_2, true, org_2_id, NOW(), NOW()),
    
    ('Funda Protectora Premium', 'ORG2-FUNDA-001', 'Funda protectora antigolpes', 
     19.99, 8.00, 100, 20, cat_2_org_2, true, org_2_id, NOW(), NOW());
  
  RAISE NOTICE '✅ Org 2: 2 categorías, 3 productos creados';
  
  -- ============================================================================
  -- RESUMEN
  -- ============================================================================
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ ¡Datos de prueba creados exitosamente!';
  RAISE NOTICE 'Total: 4 categorías, 6 productos';
  RAISE NOTICE '========================================';
  
END $$;

-- Verificar los datos creados
SELECT 
  o.name as organizacion,
  COUNT(DISTINCT c.id) as categorias,
  COUNT(DISTINCT p.id) as productos
FROM organizations o
LEFT JOIN categories c ON c.organization_id = o.id
LEFT JOIN products p ON p.organization_id = o.id
WHERE o.id IN ('2fac6ec5-53d4-493e-84df-24bf8a8a6666', '25a6adfc-5f2b-4486-af36-7f132658dd8d')
GROUP BY o.id, o.name
ORDER BY o.name;
