-- Habilitar RLS en tablas (por si no está)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes para evitar duplicados/conflictos
DROP POLICY IF EXISTS "Permitir lectura a autenticados" ON products;
DROP POLICY IF EXISTS "Permitir lectura a autenticados" ON categories;
DROP POLICY IF EXISTS "Permitir lectura a autenticados" ON suppliers;
DROP POLICY IF EXISTS "Permitir lectura a autenticados" ON customers;

-- Crear políticas de lectura para usuarios autenticados
CREATE POLICY "Permitir lectura a autenticados" ON products
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir lectura a autenticados" ON categories
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir lectura a autenticados" ON suppliers
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir lectura a autenticados" ON customers
  FOR SELECT USING (auth.role() = 'authenticated');

-- Opcional: Permitir lectura pública a productos y categorías si es necesario para catálogo público
CREATE POLICY "Permitir lectura publica" ON products
  FOR SELECT USING (true);
  
CREATE POLICY "Permitir lectura publica" ON categories
  FOR SELECT USING (true);

-- Nota: Si creamos la política 'Permitir lectura publica' (USING true), la de autenticados es redundante para SELECT,
-- pero la dejaremos clara. Postgres usa OR si hay múltiples políticas permisivas.
