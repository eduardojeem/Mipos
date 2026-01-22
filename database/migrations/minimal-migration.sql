-- Migración mínima para jerarquía de roles y auditoría
-- Esta versión evita problemas de tipos y funciones complejas

-- 1. Agregar columnas de jerarquía a roles
ALTER TABLE roles 
ADD COLUMN IF NOT EXISTS parent_role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 50;

-- 2. Crear índices básicos
CREATE INDEX IF NOT EXISTS idx_roles_parent_role_id ON roles(parent_role_id);
CREATE INDEX IF NOT EXISTS idx_roles_priority ON roles(priority);
CREATE INDEX IF NOT EXISTS idx_roles_is_active ON roles(is_active);

-- 3. Crear tabla de auditoría simplificada
CREATE TABLE IF NOT EXISTS role_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    changes JSONB,
    user_id UUID NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Crear índices para auditoría
CREATE INDEX IF NOT EXISTS idx_role_audit_log_role_id ON role_audit_log(role_id);
CREATE INDEX IF NOT EXISTS idx_role_audit_log_user_id ON role_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_role_audit_log_created_at ON role_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_role_audit_log_action ON role_audit_log(action);

-- 5. Habilitar RLS en tabla de auditoría
ALTER TABLE role_audit_log ENABLE ROW LEVEL SECURITY;

-- 6. Crear políticas RLS básicas
DROP POLICY IF EXISTS "Admins can view all audit logs" ON role_audit_log;
CREATE POLICY "Admins can view all audit logs" ON role_audit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.name IN ('ADMIN', 'admin', 'SUPER_ADMIN', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "System can insert audit logs" ON role_audit_log;
CREATE POLICY "System can insert audit logs" ON role_audit_log
    FOR INSERT WITH CHECK (true);

-- 7. Actualizar prioridades de roles existentes
UPDATE roles SET priority = 100 WHERE name IN ('ADMIN', 'admin', 'SUPER_ADMIN', 'super_admin') AND priority = 50;
UPDATE roles SET priority = 75 WHERE name ILIKE '%manager%' AND priority = 50;
UPDATE roles SET priority = 25 WHERE name ILIKE '%cashier%' AND priority = 50;

-- 8. Agregar comentarios
COMMENT ON TABLE role_audit_log IS 'Registro de auditoría para cambios en roles';
COMMENT ON COLUMN roles.parent_role_id IS 'Referencia al rol padre para jerarquía';
COMMENT ON COLUMN roles.priority IS 'Prioridad del rol (mayor número = mayor prioridad)';

-- 9. Verificación final
SELECT 
    'Migración básica completada' as status,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'roles' AND column_name = 'parent_role_id') as parent_column_exists,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'role_audit_log') as audit_table_exists;