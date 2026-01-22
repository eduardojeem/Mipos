-- Migración para agregar jerarquía de roles y sistema de auditoría
-- Fecha: 2024-12-17

-- 1. Agregar campos de jerarquía a la tabla roles
ALTER TABLE roles 
ADD COLUMN IF NOT EXISTS parent_role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 50;

-- 2. Crear índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_roles_parent_role_id ON roles(parent_role_id);
CREATE INDEX IF NOT EXISTS idx_roles_priority ON roles(priority);
CREATE INDEX IF NOT EXISTS idx_roles_is_active ON roles(is_active);

-- 3. Crear tabla de auditoría para roles
CREATE TABLE IF NOT EXISTS role_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'deleted', 'activated', 'deactivated', 'cloned'
    changes JSONB, -- Almacena los cambios realizados
    user_id UUID NOT NULL, -- Usuario que realizó la acción
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Crear índices para la tabla de auditoría
CREATE INDEX IF NOT EXISTS idx_role_audit_log_role_id ON role_audit_log(role_id);
CREATE INDEX IF NOT EXISTS idx_role_audit_log_user_id ON role_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_role_audit_log_created_at ON role_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_role_audit_log_action ON role_audit_log(action);

-- 5. Crear función para obtener estadísticas de roles
CREATE OR REPLACE FUNCTION get_role_statistics()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total', (SELECT COUNT(*) FROM roles),
        'active', (SELECT COUNT(*) FROM roles WHERE is_active = true),
        'inactive', (SELECT COUNT(*) FROM roles WHERE is_active = false),
        'system_roles', (SELECT COUNT(*) FROM roles WHERE name IN ('ADMIN', 'admin', 'SUPER_ADMIN', 'super_admin')),
        'custom_roles', (SELECT COUNT(*) FROM roles WHERE name NOT IN ('ADMIN', 'admin', 'SUPER_ADMIN', 'super_admin')),
        'total_permissions', (SELECT COUNT(*) FROM permissions),
        'roles_with_users', (SELECT COUNT(DISTINCT role_id) FROM user_roles),
        'avg_permissions_per_role', (
            SELECT COALESCE(AVG(perm_count), 0)
            FROM (
                SELECT COUNT(*) as perm_count
                FROM role_permissions
                GROUP BY role_id
            ) as role_perm_counts
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 6. Crear función para validar jerarquía circular
CREATE OR REPLACE FUNCTION check_circular_hierarchy(role_id UUID, parent_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_parent UUID;
    visited UUID[];
BEGIN
    -- Si no hay padre, no hay problema
    IF parent_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Si el padre es el mismo rol, es circular
    IF parent_id = role_id THEN
        RETURN TRUE;
    END IF;
    
    current_parent := parent_id;
    visited := ARRAY[role_id, parent_id];
    
    -- Seguir la cadena de padres
    WHILE current_parent IS NOT NULL LOOP
        -- Obtener el padre del padre actual
        SELECT parent_role_id INTO current_parent
        FROM roles
        WHERE id = current_parent;
        
        -- Si encontramos el rol original, hay un ciclo
        IF current_parent = role_id THEN
            RETURN TRUE;
        END IF;
        
        -- Si ya visitamos este nodo, hay un ciclo
        IF current_parent = ANY(visited) THEN
            RETURN TRUE;
        END IF;
        
        -- Agregar a visitados
        IF current_parent IS NOT NULL THEN
            visited := array_append(visited, current_parent);
        END IF;
        
        -- Prevenir bucles infinitos
        IF array_length(visited, 1) > 10 THEN
            RETURN TRUE;
        END IF;
    END LOOP;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- 7. Crear trigger para auditoría automática
CREATE OR REPLACE FUNCTION audit_role_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Para INSERT
    IF TG_OP = 'INSERT' THEN
        INSERT INTO role_audit_log (role_id, action, changes, user_id)
        VALUES (
            NEW.id,
            'created',
            json_build_object(
                'name', NEW.name,
                'display_name', NEW.display_name,
                'description', NEW.description,
                'is_active', NEW.is_active,
                'priority', NEW.priority,
                'parent_role_id', NEW.parent_role_id
            ),
            COALESCE(current_setting('app.current_user_id', true)::UUID, '00000000-0000-0000-0000-000000000000'::UUID)
        );
        RETURN NEW;
    END IF;
    
    -- Para UPDATE
    IF TG_OP = 'UPDATE' THEN
        INSERT INTO role_audit_log (role_id, action, changes, user_id)
        VALUES (
            NEW.id,
            CASE 
                WHEN OLD.is_active != NEW.is_active AND NEW.is_active = true THEN 'activated'
                WHEN OLD.is_active != NEW.is_active AND NEW.is_active = false THEN 'deactivated'
                ELSE 'updated'
            END,
            json_build_object(
                'old', json_build_object(
                    'name', OLD.name,
                    'display_name', OLD.display_name,
                    'description', OLD.description,
                    'is_active', OLD.is_active,
                    'priority', OLD.priority,
                    'parent_role_id', OLD.parent_role_id
                ),
                'new', json_build_object(
                    'name', NEW.name,
                    'display_name', NEW.display_name,
                    'description', NEW.description,
                    'is_active', NEW.is_active,
                    'priority', NEW.priority,
                    'parent_role_id', NEW.parent_role_id
                )
            ),
            COALESCE(current_setting('app.current_user_id', true)::UUID, '00000000-0000-0000-0000-000000000000'::UUID)
        );
        RETURN NEW;
    END IF;
    
    -- Para DELETE
    IF TG_OP = 'DELETE' THEN
        INSERT INTO role_audit_log (role_id, action, changes, user_id)
        VALUES (
            OLD.id,
            'deleted',
            json_build_object(
                'name', OLD.name,
                'display_name', OLD.display_name,
                'description', OLD.description,
                'is_active', OLD.is_active,
                'priority', OLD.priority,
                'parent_role_id', OLD.parent_role_id
            ),
            COALESCE(current_setting('app.current_user_id', true)::UUID, '00000000-0000-0000-0000-000000000000'::UUID)
        );
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 8. Crear el trigger
DROP TRIGGER IF EXISTS role_audit_trigger ON roles;
CREATE TRIGGER role_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON roles
    FOR EACH ROW EXECUTE FUNCTION audit_role_changes();

-- 9. Crear políticas RLS para la tabla de auditoría
ALTER TABLE role_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all audit logs" ON role_audit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.name IN ('ADMIN', 'admin', 'SUPER_ADMIN', 'super_admin')
        )
    );

CREATE POLICY "System can insert audit logs" ON role_audit_log
    FOR INSERT WITH CHECK (true);

-- 10. Actualizar prioridades por defecto para roles existentes
UPDATE roles SET priority = 100 WHERE name IN ('ADMIN', 'admin', 'SUPER_ADMIN', 'super_admin') AND priority IS NULL;
UPDATE roles SET priority = 75 WHERE name ILIKE '%manager%' AND priority IS NULL;
UPDATE roles SET priority = 50 WHERE name ILIKE '%employee%' AND priority IS NULL;
UPDATE roles SET priority = 25 WHERE name ILIKE '%cashier%' AND priority IS NULL;
UPDATE roles SET priority = 50 WHERE priority IS NULL;

-- 11. Comentarios para documentación
COMMENT ON TABLE role_audit_log IS 'Registro de auditoría para cambios en roles';
COMMENT ON COLUMN roles.parent_role_id IS 'Referencia al rol padre para jerarquía';
COMMENT ON COLUMN roles.priority IS 'Prioridad del rol (mayor número = mayor prioridad)';
COMMENT ON FUNCTION get_role_statistics() IS 'Función para obtener estadísticas de roles';
COMMENT ON FUNCTION check_circular_hierarchy(UUID, UUID) IS 'Función para validar jerarquía circular';

-- Finalizar migración
SELECT 'Migración completada: jerarquía de roles y sistema de auditoría agregados' as status;