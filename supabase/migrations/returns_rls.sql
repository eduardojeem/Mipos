-- RLS para Devoluciones
-- Habilita RLS y define políticas multitenancy y de permisos en returns y return_items

-- Helpers requeridos (ya existen en migraciones previas, se incluyen por seguridad)
-- get_my_org_ids(): UUID[]
-- belongs_to_org(org_id UUID): BOOLEAN
-- has_permission(resource TEXT, action TEXT): BOOLEAN

-- Tabla returns: aislamiento por organization_id
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;

-- Lectura: usuarios autenticados pueden leer devoluciones de sus organizaciones
DROP POLICY IF EXISTS "Tenant Isolation Read" ON public.returns;
CREATE POLICY "Tenant Isolation Read" ON public.returns
  FOR SELECT
  TO authenticated
  USING (organization_id IN (SELECT unnest(get_my_org_ids())));

-- Inserción: requiere pertenecer a la organización y permiso funcional
DROP POLICY IF EXISTS "Tenant Isolation Insert" ON public.returns;
CREATE POLICY "Tenant Isolation Insert" ON public.returns
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (SELECT unnest(get_my_org_ids()))
    AND (has_permission('returns', 'create') OR is_admin())
  );

-- Actualización: requiere pertenecer a la organización y permiso
DROP POLICY IF EXISTS "Tenant Isolation Update" ON public.returns;
CREATE POLICY "Tenant Isolation Update" ON public.returns
  FOR UPDATE
  TO authenticated
  USING (organization_id IN (SELECT unnest(get_my_org_ids())))
  WITH CHECK (
    organization_id IN (SELECT unnest(get_my_org_ids()))
    AND (has_permission('returns', 'update') OR is_admin())
  );

-- Borrado: requiere pertenecer a la organización y permiso
DROP POLICY IF EXISTS "Tenant Isolation Delete" ON public.returns;
CREATE POLICY "Tenant Isolation Delete" ON public.returns
  FOR DELETE
  TO authenticated
  USING (
    organization_id IN (SELECT unnest(get_my_org_ids()))
    AND (has_permission('returns', 'delete') OR is_admin())
  );

-- Índice recomendado (si no existe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='returns' AND indexname='idx_returns_organization_id'
  ) THEN
    EXECUTE 'CREATE INDEX idx_returns_organization_id ON public.returns(organization_id)';
  END IF;
END $$;

-- Tabla return_items: aislamiento por relación con returns
ALTER TABLE public.return_items ENABLE ROW LEVEL SECURITY;

-- Lectura: solo ítems de devoluciones de tus organizaciones
DROP POLICY IF EXISTS "Tenant Isolation Read" ON public.return_items;
CREATE POLICY "Tenant Isolation Read" ON public.return_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.returns r
      WHERE r.id = return_items.return_id
        AND r.organization_id IN (SELECT unnest(get_my_org_ids()))
    )
  );

-- Inserción: el ítem debe pertenecer a una devolución de tu organización y tener permiso
DROP POLICY IF EXISTS "Tenant Isolation Insert" ON public.return_items;
CREATE POLICY "Tenant Isolation Insert" ON public.return_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.returns r
      WHERE r.id = return_items.return_id
        AND r.organization_id IN (SELECT unnest(get_my_org_ids()))
    )
    AND (has_permission('returns', 'update') OR has_permission('returns', 'create') OR is_admin())
  );

-- Actualización: mismo aislamiento y permiso
DROP POLICY IF EXISTS "Tenant Isolation Update" ON public.return_items;
CREATE POLICY "Tenant Isolation Update" ON public.return_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.returns r
      WHERE r.id = return_items.return_id
        AND r.organization_id IN (SELECT unnest(get_my_org_ids()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.returns r
      WHERE r.id = return_items.return_id
        AND r.organization_id IN (SELECT unnest(get_my_org_ids()))
    )
    AND (has_permission('returns', 'update') OR is_admin())
  );

-- Borrado: mismo aislamiento y permiso
DROP POLICY IF EXISTS "Tenant Isolation Delete" ON public.return_items;
CREATE POLICY "Tenant Isolation Delete" ON public.return_items
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.returns r
      WHERE r.id = return_items.return_id
        AND r.organization_id IN (SELECT unnest(get_my_org_ids()))
    )
    AND (has_permission('returns', 'delete') OR is_admin())
  );

