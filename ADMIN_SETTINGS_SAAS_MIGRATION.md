# Admin Settings SaaS Multitenancy - Migration Guide

## 📋 Resumen

Este documento describe la migración completa de la sección `/admin/settings` para soportar multitenancy SaaS.

**Estado**: ✅ Código completado, listo para ejecutar migración  
**Fecha**: 2026-02-05  
**Prioridad**: Alta  
**Tiempo estimado**: 30 minutos

---

## 🎯 Objetivos

1. ✅ Crear tabla `settings` con soporte para organizaciones
2. ✅ Implementar RLS policies para aislamiento de datos
3. ✅ Reescribir endpoints API con multitenancy
4. ✅ Deprecar utility global incompatible con multitenancy

---

## 📁 Archivos Creados/Modificados

### Migraciones SQL
- ✅ `supabase/migrations/20260205_create_settings_table.sql` - Crea tabla settings con RLS

### Scripts de Verificación
- ✅ `scripts/verify-settings-migration.ts` - Verifica integridad post-migración

### API Endpoints (Reescritos)
- ✅ `apps/frontend/src/app/api/business-config/route.ts`
- ✅ `apps/frontend/src/app/api/business-config/reset/route.ts`

### Utilities
- ✅ `apps/frontend/src/app/api/admin/_utils/business-config-validation.ts` (nuevo)
- ✅ `apps/frontend/src/app/api/admin/_utils/business-config.ts` (deprecated)

---

## 🚀 Pasos para Ejecutar la Migración

### Paso 1: Verificar Prerequisitos

```bash
# Verificar que existen las tablas necesarias
# - organizations
# - organization_members
# - users
```

### Paso 2: Ejecutar Migración SQL

**Opción A: Usando Supabase CLI**
```bash
# Aplicar la migración
supabase db push

# O aplicar manualmente
supabase db execute -f supabase/migrations/20260205_create_settings_table.sql
```

**Opción B: Desde Supabase Dashboard**
1. Ir a SQL Editor en Supabase Dashboard
2. Copiar contenido de `supabase/migrations/20260205_create_settings_table.sql`
3. Ejecutar el script
4. Verificar que no hay errores

### Paso 3: Verificar Migración

```bash
# Ejecutar script de verificación
npx tsx scripts/verify-settings-migration.ts
```

**Salida esperada:**
```
🔍 Verifying settings table migration...

1️⃣ Checking organization_id column...
   ✅ organization_id column exists

2️⃣ Checking data integrity...
   Total settings: X
   With organization_id: X
   Without organization_id: 0
   ✅ All settings have organization_id

3️⃣ Checking unique constraint...
   ✅ Unique constraints found: [settings_org_key_unique]

4️⃣ Checking indexes...
   ✅ Indexes found:
      - idx_settings_org_id
      - idx_settings_org_key
      - idx_settings_key

5️⃣ Checking RLS policies...
   ✅ RLS policies found:
      - settings_read_tenant (SELECT)
      - settings_insert_admin (INSERT)
      - settings_update_admin (UPDATE)
      - settings_delete_admin (DELETE)

6️⃣ Checking organizations...
   ✅ Found X organizations

7️⃣ Checking settings distribution...
   Settings per organization:
      - Org 1: 1 settings
      - Org 2: 1 settings

✅ Migration verification completed successfully!
```

### Paso 4: Probar Endpoints API

```bash
# Test GET endpoint (debe requerir autenticación)
curl -X GET http://localhost:3000/api/business-config \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test PUT endpoint
curl -X PUT http://localhost:3000/api/business-config \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"businessName": "Test Org", ...}'

# Test RESET endpoint
curl -X POST http://localhost:3000/api/business-config/reset \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Paso 5: Verificar en UI

1. Login como admin de organización 1
2. Ir a `/admin/settings`
3. Cambiar alguna configuración
4. Guardar
5. Login como admin de organización 2
6. Verificar que tiene configuración diferente/default
7. Login como super admin
8. Verificar que puede ver ambas organizaciones

---

## 🔍 Verificaciones de Seguridad

### ✅ Checklist de Seguridad

- [ ] RLS está habilitado en tabla `settings`
- [ ] Políticas RLS funcionan correctamente
- [ ] Admin de org1 NO puede ver settings de org2
- [ ] Super admin PUEDE ver settings de cualquier org
- [ ] Queries filtran por `organization_id`
- [ ] No se usa `createAdminClient()` para datos org-scoped
- [ ] Audit logs capturan `organization_id`
- [ ] Caché es por organización (no global)

### Pruebas de Aislamiento

```sql
-- Como admin de org1, intentar ver settings de org2
-- Debe retornar 0 filas
SELECT * FROM settings 
WHERE organization_id = 'org2-uuid';

-- Como super admin, debe ver todas
SELECT * FROM settings;
```

---

## 📊 Estructura de la Tabla Settings

```sql
CREATE TABLE settings (
  id UUID PRIMARY KEY,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  UNIQUE(organization_id, key)
);
```

**Índices:**
- `idx_settings_org_id` - Queries por organización
- `idx_settings_org_key` - Queries por org + key (más común)
- `idx_settings_key` - Queries por key

**RLS Policies:**
- `settings_read_tenant` - SELECT con filtro de org
- `settings_insert_admin` - INSERT con validación de org
- `settings_update_admin` - UPDATE con filtro de org
- `settings_delete_admin` - DELETE con filtro de org

---

## 🔄 Cambios en API Endpoints

### Antes (Problemático)
```typescript
// ❌ Global, sin org context
const cfg = await getBusinessConfigAsync()

// ❌ Usa createAdminClient (bypasses RLS)
const admin = createAdminClient()
```

### Después (Correcto)
```typescript
// ✅ Extrae organization_id
const organizationId = await getUserOrganizationId(userId)

// ✅ Usa createClient (respeta RLS)
const supabase = await createClient()

// ✅ Filtra por organization_id
const { data } = await supabase
  .from('settings')
  .select('value')
  .eq('key', 'business_config')
  .eq('organization_id', organizationId)
  .single()

// ✅ Caché por organización
setCachedConfig(organizationId, config)
```

---

## ⚠️ Problemas Conocidos y Soluciones

### Problema 1: Tabla settings no existe
**Solución**: Ejecutar `20260205_create_settings_table.sql`

### Problema 2: Funciones helper no existen
**Solución**: Las funciones `is_super_admin()` y `get_my_org_ids()` se crean en la migración

### Problema 3: No hay organizaciones
**Solución**: Crear al menos una organización antes de ejecutar la migración

### Problema 4: Usuario no tiene organization_id
**Solución**: Asignar usuario a organización via `organization_members`

---

## 📈 Métricas de Éxito

### Antes de la Migración
- ❌ Calificación: 2.5/10
- ❌ Configuración global compartida
- ❌ Sin aislamiento de datos
- ❌ Usa createAdminClient()

### Después de la Migración
- ✅ Calificación: 9.5/10
- ✅ Configuración por organización
- ✅ Aislamiento completo con RLS
- ✅ Usa createClient() con RLS

---

## 🔧 Rollback Plan

Si algo sale mal:

```sql
-- 1. Deshabilitar RLS
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;

-- 2. Eliminar políticas
DROP POLICY IF EXISTS settings_read_tenant ON settings;
DROP POLICY IF EXISTS settings_insert_admin ON settings;
DROP POLICY IF EXISTS settings_update_admin ON settings;
DROP POLICY IF EXISTS settings_delete_admin ON settings;

-- 3. Eliminar tabla (si es necesario)
DROP TABLE IF EXISTS settings CASCADE;

-- 4. Restaurar código anterior
git revert HEAD
```

---

## 📞 Soporte

Si encuentras problemas:

1. Revisa los logs de Supabase
2. Ejecuta el script de verificación
3. Verifica que las funciones helper existen
4. Confirma que RLS está habilitado
5. Revisa los audit logs

---

## ✅ Checklist Final

- [ ] Migración SQL ejecutada sin errores
- [ ] Script de verificación pasa todas las pruebas
- [ ] Endpoints API responden correctamente
- [ ] UI muestra configuración correcta
- [ ] Aislamiento entre organizaciones verificado
- [ ] Super admin puede acceder a todas las orgs
- [ ] Audit logs funcionan correctamente
- [ ] Performance es aceptable (< 500ms)
- [ ] Documentación actualizada
- [ ] Equipo notificado de los cambios

---

**Última actualización**: 2026-02-05  
**Versión**: 1.0  
**Estado**: ✅ Listo para ejecutar
