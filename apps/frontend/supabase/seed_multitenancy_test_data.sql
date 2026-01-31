-- ============================================================================
-- Script de Datos de Prueba - Multitenancy Testing
-- ============================================================================
-- Descripción: Crea datos de ejemplo en organizaciones existentes para
--              verificar el aislamiento de datos multitenancy
-- Uso: Ejecutar en Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- PASO 1: Verificar organizaciones existentes
-- ============================================================================

-- Ver organizaciones disponibles
SELECT 
  id,
  name,
  slug,
  subscription_plan,
  subscription_status,
  created_at
FROM organizations
ORDER BY created_at DESC
LIMIT 10;

-- IMPORTANTE: Copia los IDs de al menos 2 organizaciones para usar en PASO 2


-- ============================================================================
-- PASO 2: Configurar IDs de organizaciones
-- ============================================================================

-- Reemplaza estos valores con IDs reales de tu base de datos
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
  
  customer_1_org_1 uuid;
  customer_1_org_2 uuid;
  
BEGIN
  
  -- ============================================================================
  -- ORGANIZACIÓN 1 - Datos de Ejemplo
  -- ============================================================================
  
  RAISE NOTICE '=== Creando datos para Organización 1 ===';
  
  -- Categorías para Org 1
  INSERT INTO categories (name, description, organization_id, created_at, updated_at)
  VALUES ('Maquillaje Premium', 'Productos de maquillaje de alta gama', org_1_id, NOW(), NOW())
  RETURNING id INTO cat_1_org_1;
  
  INSERT INTO categories (name, description, organization_id, created_at, updated_at)
  VALUES ('Cuidado Facial', 'Tratamientos y cremas para el rostro', org_1_id, NOW(), NOW())
  RETURNING id INTO cat_2_org_1;
  
  RAISE NOTICE 'Categorías creadas para Org 1: %, %', cat_1_org_1, cat_2_org_1;
  
  -- Productos para Org 1
  INSERT INTO products (
    name, 
    sku, 
    description, 
    sale_price, 
    cost_price, 
    stock_quantity, 
    min_stock,
    category_id, 
    is_active, 
    organization_id,
    created_at,
    updated_at
  )
  VALUES 
    (
      'Labial Mate Rojo Intenso', 
      'ORG1-LAB-001', 
      'Labial mate de larga duración color rojo intenso', 
      25.99, 
      12.00, 
      50, 
      10,
      cat_1_org_1, 
      true, 
      org_1_id,
      NOW(),
      NOW()
    ),
    (
      'Base de Maquillaje HD', 
      'ORG1-BASE-001', 
      'Base líquida de alta definición tono medio', 
      45.50, 
      22.00, 
      30, 
      8,
      cat_1_org_1, 
      true, 
      org_1_id,
      NOW(),
      NOW()
    ),
    (
      'Crema Hidratante Día', 
      'ORG1-CREMA-001', 
      'Crema hidratante con SPF 30 para rostro', 
      35.00, 
      18.00, 
      25, 
      5,
      cat_2_org_1, 
      true, 
      org_1_id,
      NOW(),
      NOW()
    );
  
  RAISE NOTICE 'Productos creados para Org 1: 3 productos';
  
  -- Cliente para Org 1
  INSERT INTO customers (
    name,
    phone,
    email,
    organization_id,
    created_at,
    updated_at
  )
  VALUES 
    (
      'María González',
      '+1234567890',
      'maria@test.com',
      org_1_id,
      NOW(),
      NOW()
    )
  RETURNING id INTO customer_1_org_1;
  
  INSERT INTO customers (
    name,
    phone,
    email,
    organization_id,
    created_at,
    updated_at
  )
  VALUES 
    (
      'Ana Rodríguez',
      '+1234567891',
      'ana@test.com',
      org_1_id,
      NOW(),
      NOW()
    );
  
  RAISE NOTICE 'Clientes creados para Org 1: 2 clientes';
  
  -- Venta de ejemplo para Org 1
  INSERT INTO sales (
    customer_id,
    total,
    payment_method,
    status,
    organization_id,
    created_at,
    updated_at
  )
  VALUES 
    (
      customer_1_org_1,
      71.49,  -- 25.99 + 45.50
      'CASH',
      'COMPLETED',
      org_1_id,
      NOW(),
      NOW()
    );
  
  RAISE NOTICE 'Venta creada para Org 1';
  
  -- ============================================================================
  -- ORGANIZACIÓN 2 - Datos de Ejemplo (DIFERENTES)
  -- ============================================================================
  
  RAISE NOTICE '=== Creando datos para Organización 2 ===';
  
  -- Categorías para Org 2
  INSERT INTO categories (name, description, organization_id, created_at, updated_at)
  VALUES ('Electrónica', 'Productos electrónicos y accesorios', org_2_id, NOW(), NOW())
  RETURNING id INTO cat_1_org_2;
  
  INSERT INTO categories (name, description, organization_id, created_at, updated_at)
  VALUES ('Accesorios Tech', 'Accesorios para dispositivos', org_2_id, NOW(), NOW())
  RETURNING id INTO cat_2_org_2;
  
  RAISE NOTICE 'Categorías creadas para Org 2: %, %', cat_1_org_2, cat_2_org_2;
  
  -- Productos para Org 2 (completamente diferentes)
  INSERT INTO products (
    name, 
    sku, 
    description, 
    sale_price, 
    cost_price, 
    stock_quantity, 
    min_stock,
    category_id, 
    is_active, 
    organization_id,
    created_at,
    updated_at
  )
  VALUES 
    (
      'Auriculares Bluetooth Pro', 
      'ORG2-AUR-001', 
      'Auriculares inalámbricos con cancelación de ruido', 
      89.99, 
      45.00, 
      40, 
      10,
      cat_1_org_2, 
      true, 
      org_2_id,
      NOW(),
      NOW()
    ),
    (
      'Cargador Inalámbrico', 
      'ORG2-CARG-001', 
      'Cargador inalámbrico 15W carga rápida', 
      29.99, 
      15.00, 
      60, 
      15,
      cat_2_org_2, 
      true, 
      org_2_id,
      NOW(),
      NOW()
    ),
    (
      'Funda Protectora Premium', 
      'ORG2-FUNDA-001', 
      'Funda protectora antigolpes para smartphone', 
      19.99, 
      8.00, 
      100, 
      20,
      cat_2_org_2, 
      true, 
      org_2_id,
      NOW(),
      NOW()
    );
  
  RAISE NOTICE 'Productos creados para Org 2: 3 productos';
  
  -- Cliente para Org 2
  INSERT INTO customers (
    name,
    phone,
    email,
    organization_id,
    created_at,
    updated_at
  )
  VALUES 
    (
      'Carlos Martínez',
      '+9876543210',
      'carlos@test.com',
      org_2_id,
      NOW(),
      NOW()
    )
  RETURNING id INTO customer_1_org_2;
  
  INSERT INTO customers (
    name,
    phone,
    email,
    organization_id,
    created_at,
    updated_at
  )
  VALUES 
    (
      'Laura Fernández',
      '+9876543211',
      'laura@test.com',
      org_2_id,
      NOW(),
      NOW()
    );
  
  RAISE NOTICE 'Clientes creados para Org 2: 2 clientes';
  
  -- Venta de ejemplo para Org 2
  INSERT INTO sales (
    customer_id,
    total,
    payment_method,
    status,
    organization_id,
    created_at,
    updated_at
  )
  VALUES 
    (
      customer_1_org_2,
      119.98,  -- 89.99 + 29.99
      'CREDIT_CARD',
      'COMPLETED',
      org_2_id,
      NOW(),
      NOW()
    );
  
  RAISE NOTICE 'Venta creada para Org 2';
  
  -- ============================================================================
  -- RESUMEN
  -- ============================================================================
  
  RAISE NOTICE '✅ Datos de prueba creados exitosamente!';
  RAISE NOTICE 'Organización 1: 2 categorías, 3 productos, 2 clientes, 1 venta';
  RAISE NOTICE 'Organización 2: 2 categorías, 3 productos, 2 clientes, 1 venta';
  
END $$;


-- ============================================================================
-- PASO 3: Verificar los datos creados
-- ============================================================================

-- Ver resumen por organización
SELECT 
  o.name as organization,
  o.id as org_id,
  (SELECT COUNT(*) FROM categories WHERE organization_id = o.id) as categories,
  (SELECT COUNT(*) FROM products WHERE organization_id = o.id) as products,
  (SELECT COUNT(*) FROM customers WHERE organization_id = o.id) as customers,
  (SELECT COUNT(*) FROM sales WHERE organization_id = o.id) as sales
FROM organizations o
ORDER BY o.created_at DESC;


-- Ver productos por organización
SELECT 
  o.name as organization,
  p.name as product_name,
  p.sku,
  p.sale_price,
  p.stock_quantity,
  c.name as category
FROM products p
JOIN organizations o ON p.organization_id = o.id
LEFT JOIN categories c ON p.category_id = c.id
ORDER BY o.name, p.name;


-- Ver ventas por organización
SELECT 
  o.name as organization,
  s.id as sale_id,
  CONCAT(cu.first_name, ' ', cu.last_name) as customer,
  s.total,
  s.payment_method,
  s.status,
  s.created_at
FROM sales s
JOIN organizations o ON s.organization_id = o.id
JOIN customers cu ON s.customer_id = cu.id
ORDER BY o.name, s.created_at DESC;


-- ============================================================================
-- PASO 4: Queries de prueba para verificar aislamiento
-- ============================================================================

-- TEST 1: Productos filtrados por organización (simula lo que hace la API)
-- Reemplaza 'TU-ORG-ID-AQUI' con el ID de una organización
SELECT 
  id,
  name,
  sku,
  sale_price,
  stock_quantity
FROM products
WHERE organization_id = 'TU-ORG-ID-AQUI'  -- ⚠️ REEMPLAZAR
ORDER BY name;


-- TEST 2: Resumen de productos por organización (simula /api/products/summary)
-- Reemplaza 'TU-ORG-ID-AQUI' con el ID de una organización
SELECT 
  COUNT(*) as total_products,
  SUM(stock_quantity * COALESCE(cost_price, sale_price)) as total_value,
  COUNT(*) FILTER (WHERE stock_quantity = 0) as out_of_stock,
  COUNT(*) FILTER (WHERE stock_quantity <= min_stock AND stock_quantity > 0) as low_stock
FROM products
WHERE organization_id = 'TU-ORG-ID-AQUI';  -- ⚠️ REEMPLAZAR


-- TEST 3: Categorías por organización (simula /api/products/categories)
SELECT 
  c.id,
  c.name,
  c.description,
  COUNT(p.id) as product_count
FROM categories c
LEFT JOIN products p ON c.id = p.category_id
WHERE c.organization_id = 'TU-ORG-ID-AQUI'  -- ⚠️ REEMPLAZAR
GROUP BY c.id, c.name, c.description
ORDER BY c.name;


-- ============================================================================
-- LIMPIEZA (OPCIONAL)
-- ============================================================================

-- ⚠️ USAR CON CUIDADO - Esto eliminará todos los datos de prueba
-- Descomenta solo si necesitas limpiar los datos de prueba

/*
DO $$
DECLARE
  org_1_id uuid := 'REEMPLAZA-CON-ID-ORG-1';
  org_2_id uuid := 'REEMPLAZA-CON-ID-ORG-2';
BEGIN
  -- Eliminar en orden de dependencias
  DELETE FROM sales WHERE organization_id IN (org_1_id, org_2_id);
  DELETE FROM products WHERE organization_id IN (org_1_id, org_2_id);
  DELETE FROM customers WHERE organization_id IN (org_1_id, org_2_id);
  DELETE FROM categories WHERE organization_id IN (org_1_id, org_2_id);
  
  RAISE NOTICE 'Datos de prueba eliminados';
END $$;
*/


-- ============================================================================
-- NOTAS IMPORTANTES
-- ============================================================================

-- 1. Este script crea datos de ejemplo en organizaciones EXISTENTES
-- 2. Debes reemplazar los UUIDs de org_1_id y org_2_id con IDs reales
-- 3. Los datos son diferentes para cada organización para probar aislamiento
-- 4. Usa las queries de verificación para confirmar que el filtrado funciona
-- 5. Los SKUs son únicos por organización (ORG1-*, ORG2-*)

-- Para probar en el frontend:
-- 1. Login con un usuario de la Organización 1
-- 2. Verifica que solo ves productos de maquillaje (ORG1-*)
-- 3. Cambia a Organización 2 (si el usuario pertenece a ambas)
-- 4. Verifica que ahora solo ves productos de electrónica (ORG2-*)
