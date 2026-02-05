# 🔒 Corrección de Seguridad Crítica: `/api/system/settings`

**Fecha:** 5 de febrero de 2026  
**Prioridad:** 🔴 CRÍTICA  
**Estado:** ✅ IMPLEMENTADO

---

## 📋 Resumen

Se ha implementado una corrección de seguridad crítica en el endpoint `/api/system/settings` que previamente permitía a cualquier usuario autenticado modificar la configuración global del sistema.

---

## 🚨 Vulnerabilidad Identificada

### Antes de la Corrección

```typescript
// ❌ VULNERABLE: Sin verificación de permisos
export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const settings = await request.json();
  
  // Cualquier usuario autenticado podía modificar configuración global
  const { data, error } = await supabase
    .from('business_config')
    .upsert(configUpdate);
}
```

**Riesgos:**
- ❌ Cualquier usuario podía cambiar tasas de impuestos
- ❌ Modificación de moneda base sin autorización
- ❌ Cambio de configuración de respaldos
- ❌ Sin auditoría de cambios
- ❌ Sin multitenancy (todas las organizaciones compartían configuración)

---

## ✅ Solución Implementada

### 1. Control de Acceso (RBAC)

```typescript
// ✅ SEGURO: Verificación de rol ADMIN/SUPER_ADMIN
export async function PUT(request: NextRequest) {
  const authResult = await assertAdmin(request);
  if (!authResult.ok) {
    return NextResponse.json(authResult.body, { status: authResult.status });
  }
  
  const { userId, organizationId, isSuperAdmin } = authResult;
  // ... continuar con la actualización
}
```

**Beneficios:**
- ✅ Solo ADMIN y SUPER_ADMIN pueden modificar configuración
- ✅ Verificación en base de datos (tabla `user_roles`)
- ✅ Fallback a metadata si falla consulta DB
- ✅ Retorna información de organización para filtrado

### 2. Multitenancy

```typescript
// ✅ MULTITENANCY: Filtrar por organization_id
let query = supabase.from('business_config').select('*');

if (!isSuperAdmin && organizationId) {
  query = query.eq('organization_id', organizationId);
}
```

**Beneficios:**
- ✅ Cada organización tiene su propia configuración
- ✅ ADMIN solo ve/modifica configuración de su organización
- ✅ SUPER_ADMIN puede gestionar todas las organizaciones
- ✅ Aislamiento de datos entre organizaciones

### 3. Validación de Datos

```typescript
// ✅ VALIDACIÓN: Validar datos de entrada
const validationErrors: string[] = [];

if (settings.taxRate !== undefined) {
  const taxRate = Number(settings.taxRate);
  if (isNaN(taxRate) || taxRate < 0 || taxRate > 100) {
    validationErrors.push('La tasa de impuesto debe estar entre 0 y 100');
  }
}

if (settings.currency && !['PYG', 'USD', 'EUR', 'BRL', 'ARS'].includes(settings.currency)) {
  validationErrors.push('Moneda no soportada');
}
```

**Validaciones Implementadas:**
- ✅ Tasa de impuesto: 0-100%
- ✅ Moneda: Solo valores permitidos
- ✅ Formato de hora: 12h o 24h
- ✅ Frecuencia de respaldo: hourly, daily, weekly, monthly

### 4. Auditoría de Cambios

```typescript
// ✅ AUDITORÍA: Registrar cambios exitosos
const changes: Record<string, { old: any; new: any }> = {};

if (oldConfig) {
  Object.keys(configUpdate).forEach(key => {
    if (key !== 'updated_at' && oldConfig[key] !== configUpdate[key]) {
      changes[key] = {
        old: oldConfig[key],
        new: configUpdate[key]
      };
    }
  });
}

logAudit('system.settings.update', {
  userId,
  organizationId,
  isSuperAdmin,
  changes,
  oldData: oldConfig,
  newData: data,
  url: request.url
});
```

**Eventos Auditados:**
- ✅ `system.settings.read` - Lectura de configuración
- ✅ `system.settings.update` - Actualización exitosa
- ✅ `system.settings.update.failed` - Intento fallido
- ✅ `system.settings.update.error` - Error interno

**Información Registrada:**
- Usuario que realizó el cambio
- Organización afectada
- Valores anteriores y nuevos
- Timestamp del cambio
- URL del request

---

## 🗄️ Migración de Base de Datos

### Archivo: `20260205_add_multitenancy_business_config.sql`

**Cambios Realizados:**

1. **Agregar columna `organization_id`**
   ```sql
   ALTER TABLE public.business_config 
   ADD COLUMN IF NOT EXISTS organization_id UUID 
   REFERENCES public.organizations(id) ON DELETE CASCADE;
   ```

2. **Migrar datos existentes**
   - Asigna configuraciones huérfanas a la primera organización
   - Mantiene compatibilidad con datos existentes

3. **Actualizar políticas RLS**
   - SUPER_ADMIN: Acceso total a todas las organizaciones
   - ADMIN: Solo acceso a su organización
   - Políticas separadas para SELECT, INSERT, UPDATE, DELETE

4. **Agregar columnas faltantes**
   ```sql
   ALTER TABLE public.business_config 
   ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'es',
   ADD COLUMN IF NOT EXISTS enable_inventory_tracking BOOLEAN DEFAULT true,
   ADD COLUMN IF NOT EXISTS enable_notifications BOOLEAN DEFAULT true;
   ```

5. **Constraint único por organización**
   ```sql
   CREATE UNIQUE INDEX idx_business_config_unique_org 
   ON public.business_config(organization_id) 
   WHERE organization_id IS NOT NULL;
   ```

---

## 📊 Comparación Antes/Después

| Aspecto | Antes | Después |
|---------|-------|---------|
| **Autenticación** | ❌ Solo verifica sesión | ✅ Verifica rol ADMIN/SUPER_ADMIN |
| **Autorización** | ❌ Ninguna | ✅ RBAC completo |
| **Multitenancy** | ❌ Configuración compartida | ✅ Configuración por organización |
| **Validación** | ❌ Ninguna | ✅ Validación de tipos y rangos |
| **Auditoría** | ❌ Ninguna | ✅ Registro completo de cambios |
| **Manejo de Errores** | ⚠️ Genérico | ✅ Específico por tipo de error |
| **RLS** | ⚠️ Políticas básicas | ✅ Políticas por rol y organización |

---

## 🧪 Pruebas Recomendadas

### 1. Prueba de Autorización

```bash
# Usuario sin rol ADMIN (debe fallar)
curl -X PUT http://localhost:3000/api/system/settings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token_usuario_normal>" \
  -d '{"taxRate": 15}'

# Respuesta esperada: 403 Forbidden
```

### 2. Prueba de Multitenancy

```bash
# ADMIN de Org A intenta modificar config de Org B (debe fallar)
curl -X PUT http://localhost:3000/api/system/settings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token_admin_org_a>" \
  -d '{"taxRate": 15}'

# Debe solo modificar configuración de Org A
```

### 3. Prueba de Validación

```bash
# Tasa de impuesto inválida (debe fallar)
curl -X PUT http://localhost:3000/api/system/settings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token_admin>" \
  -d '{"taxRate": 150}'

# Respuesta esperada: 400 Bad Request
# { "error": "Datos inválidos", "details": ["La tasa de impuesto debe estar entre 0 y 100"] }
```

### 4. Prueba de Auditoría

```bash
# Verificar que los cambios se registran en audit_logs
SELECT * FROM audit_logs 
WHERE action LIKE 'system.settings%' 
ORDER BY timestamp DESC 
LIMIT 10;
```

---

## 🚀 Despliegue

### Pasos para Aplicar la Corrección

1. **Aplicar migración de base de datos**
   ```bash
   # Opción 1: Supabase CLI
   supabase db push
   
   # Opción 2: SQL directo
   psql -h <host> -U <user> -d <database> -f supabase/migrations/20260205_add_multitenancy_business_config.sql
   ```

2. **Verificar migración**
   ```sql
   -- Verificar que la columna existe
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'business_config' 
   AND column_name = 'organization_id';
   
   -- Verificar políticas RLS
   SELECT policyname, cmd, qual 
   FROM pg_policies 
   WHERE tablename = 'business_config';
   ```

3. **Desplegar código actualizado**
   ```bash
   # El código ya está actualizado en:
   # apps/frontend/src/app/api/system/settings/route.ts
   
   # Desplegar a producción
   git add .
   git commit -m "fix: Agregar control de acceso y multitenancy a /api/system/settings"
   git push origin main
   ```

4. **Verificar en producción**
   - Probar acceso con usuario ADMIN
   - Probar acceso con usuario sin permisos
   - Verificar logs de auditoría
   - Confirmar multitenancy funcional

---

## 📝 Notas Adicionales

### Compatibilidad con Código Existente

El endpoint mantiene la misma interfaz pública:

```typescript
// GET /api/system/settings
// Respuesta: { businessName, currency, timezone, ... }

// PUT /api/system/settings
// Body: { businessName, currency, timezone, ... }
```

**No se requieren cambios en el frontend** que consume este endpoint.

### Configuración por Defecto

Si una organización no tiene configuración, el endpoint devuelve valores por defecto:

```typescript
{
  businessName: '',
  currency: 'PYG',
  timezone: 'America/Asuncion',
  language: 'es',
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '24h',
  taxRate: 0,
  enableInventoryTracking: true,
  enableLoyaltyProgram: false,
  enableNotifications: true,
  autoBackup: false,
  backupFrequency: 'daily',
}
```

### Rollback

Si es necesario revertir los cambios:

```sql
-- Eliminar columna organization_id
ALTER TABLE public.business_config DROP COLUMN IF EXISTS organization_id;

-- Restaurar políticas antiguas
-- (Ver archivo 20240122000001_create_business_config.sql)
```

---

## ✅ Checklist de Verificación

- [x] Control de acceso implementado (assertAdmin)
- [x] Multitenancy implementado (organization_id)
- [x] Validación de datos implementada
- [x] Auditoría de cambios implementada
- [x] Migración de base de datos creada
- [x] Políticas RLS actualizadas
- [x] Documentación completa
- [ ] Tests unitarios (pendiente)
- [ ] Tests de integración (pendiente)
- [ ] Pruebas en staging (pendiente)
- [ ] Despliegue a producción (pendiente)

---

## 🔗 Referencias

- [Auditoría Completa de Settings](./AUDITORIA_SETTINGS_COMPLETA.md)
- [Utilidades de Autenticación](./apps/frontend/src/app/api/_utils/auth.ts)
- [Utilidades de Auditoría](./apps/frontend/src/app/api/admin/_utils/audit.ts)
- [Migración de Multitenancy](./supabase/migrations/20260205_add_multitenancy_business_config.sql)

---

**Implementado por:** Kiro AI  
**Fecha:** 5 de febrero de 2026  
**Revisión:** Pendiente
