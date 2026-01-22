-- =====================================================
-- Crear tabla faltante: role_audit_logs con RLS y políticas
-- =====================================================

-- Tabla de auditoría para cambios en roles y permisos
CREATE TABLE IF NOT EXISTS public.role_audit_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  performed_by UUID,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT audit_logs_action_check CHECK (action IN ('CREATE','UPDATE','DELETE','ASSIGN','REVOKE')),
  CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_audit_logs_performed_by FOREIGN KEY (performed_by) REFERENCES public.users(id) ON DELETE SET NULL
);

-- Índices recomendados
CREATE INDEX IF NOT EXISTS idx_role_audit_logs_user_id ON public.role_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_role_audit_logs_action ON public.role_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_role_audit_logs_resource_type ON public.role_audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_role_audit_logs_created_at ON public.role_audit_logs(created_at);

-- Habilitar RLS
ALTER TABLE public.role_audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso
DO $$
BEGIN
  -- Lectura: solo administradores pueden ver logs
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'role_audit_logs' AND policyname = 'Admins can view audit logs'
  ) THEN
    CREATE POLICY "Admins can view audit logs" ON public.role_audit_logs
      FOR SELECT USING (is_admin());
  END IF;

  -- Inserción: el sistema puede crear logs (permite inserts desde service/bots)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'role_audit_logs' AND policyname = 'System can create audit logs'
  ) THEN
    CREATE POLICY "System can create audit logs" ON public.role_audit_logs
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- Opcional: otorgar privilegios básicos (RLS gobierna el acceso)
GRANT SELECT, INSERT ON public.role_audit_logs TO authenticated;
GRANT SELECT, INSERT ON public.role_audit_logs TO service_role;

-- Recargar cache de esquema en PostgREST
DO $$ BEGIN PERFORM pg_notify('pgrst', 'reload schema'); END $$;

