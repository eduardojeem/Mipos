-- Funciones avanzadas para ejecutar manualmente en Supabase SQL Editor
-- Estas funciones requieren permisos especiales y es mejor ejecutarlas manualmente

-- 1. Función para obtener estadísticas de roles
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Función para validar jerarquía circular
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Función para auditoría automática (OPCIONAL - solo si quieres triggers automáticos)
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
            COALESCE(
                NULLIF(current_setting('app.current_user_id', true), '')::UUID,
                '00000000-0000-0000-0000-000000000000'::UUID
            )
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
            COALESCE(
                NULLIF(current_setting('app.current_user_id', true), '')::UUID,
                '00000000-0000-0000-0000-000000000000'::UUID
            )
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
            COALESCE(
                NULLIF(current_setting('app.current_user_id', true), '')::UUID,
                '00000000-0000-0000-0000-000000000000'::UUID
            )
        );
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Crear el trigger (OPCIONAL)
DROP TRIGGER IF EXISTS role_audit_trigger ON roles;
CREATE TRIGGER role_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON roles
    FOR EACH ROW EXECUTE FUNCTION audit_role_changes();

-- 5. Comentarios
COMMENT ON FUNCTION get_role_statistics() IS 'Función para obtener estadísticas de roles';
COMMENT ON FUNCTION check_circular_hierarchy(UUID, UUID) IS 'Función para validar jerarquía circular';
COMMENT ON FUNCTION audit_role_changes() IS 'Función trigger para auditoría automática de roles';

-- 6. Probar las funciones
SELECT 'Funciones creadas correctamente' as status;

-- Probar estadísticas
SELECT get_role_statistics() as estadisticas;

-- Probar validación circular (debería retornar false)
SELECT check_circular_hierarchy('00000000-0000-0000-0000-000000000001'::UUID, '00000000-0000-0000-0000-000000000002'::UUID) as es_circular;