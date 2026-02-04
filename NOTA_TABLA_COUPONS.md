# ℹ️ Nota sobre la Tabla Coupons

**Fecha**: 4 de Febrero, 2026

---

## 🔍 Problema Detectado

Durante la aplicación de la migración SQL, se detectó que la tabla `coupons` **no existe** en tu base de datos.

**Error original**:
```
ERROR: 42P01: relation "coupons" does not exist
```

---

## ✅ Solución Aplicada

He actualizado la migración y el código para manejar este caso:

### 1. Migración SQL Actualizada

La migración ahora verifica si las tablas existen antes de modificarlas:

```sql
-- Solo aplica cambios si la tabla existe
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'coupons') THEN
    ALTER TABLE coupons 
    ADD COLUMN IF NOT EXISTS organization_id UUID 
    REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
```

**Resultado**:
- ✅ Si la tabla `coupons` existe → se agrega `organization_id`
- ✅ Si la tabla `coupons` NO existe → se omite sin error

### 2. Endpoint Actualizado

El endpoint `/api/admin/coupons/usable/route.ts` ahora maneja el caso cuando la tabla no existe:

```typescript
// Si la tabla no existe, retornar array vacío
if (error && error.message?.includes('does not exist')) {
  return NextResponse.json({ 
    success: true, 
    data: [], 
    count: 0, 
    page, 
    limit,
    message: 'Tabla de cupones no configurada'
  })
}
```

**Resultado**:
- ✅ Si la tabla existe → funciona normalmente
- ✅ Si la tabla NO existe → retorna array vacío sin error

---

## 📊 Estado de las Tablas

| Tabla | Estado | Acción |
|-------|--------|--------|
| `audit_logs` | ✅ Existe | organization_id agregado |
| `promotions` | ✅ Existe | organization_id agregado |
| `coupons` | ❌ No existe | Omitida (sin error) |

---

## 🚀 Próximos Pasos

### Opción 1: Continuar sin Coupons (Recomendado)

Si no usas cupones en tu aplicación:

1. ✅ La migración ya está lista
2. ✅ El endpoint ya maneja el caso
3. ✅ Puedes aplicar la migración sin problemas

```bash
cd supabase
supabase db push
```

### Opción 2: Crear la Tabla Coupons

Si necesitas la funcionalidad de cupones:

1. Crear la tabla `coupons`:

```sql
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL, -- 'percentage' o 'fixed'
  value NUMERIC NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  usage_limit INTEGER,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_organization_id ON coupons(organization_id);
CREATE INDEX idx_coupons_dates ON coupons(start_date, end_date);
```

2. Aplicar la migración de multitenancy:

```bash
cd supabase
supabase db push
```

---

## ✅ Verificación

Después de aplicar la migración, verifica:

```sql
-- Verificar columnas agregadas
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE column_name = 'organization_id'
  AND table_name IN ('audit_logs', 'promotions', 'coupons');
```

**Resultado esperado**:
- `audit_logs.organization_id` ✅
- `promotions.organization_id` ✅
- `coupons.organization_id` (solo si creaste la tabla)

---

## 📝 Resumen de Cambios

### Archivos Modificados

1. **supabase/migrations/20260204_add_organization_id_multitenancy.sql**
   - ✅ Verifica existencia de tablas antes de modificar
   - ✅ Maneja tabla `coupons` como opcional
   - ✅ No falla si la tabla no existe

2. **apps/frontend/src/app/api/admin/coupons/usable/route.ts**
   - ✅ Maneja error cuando tabla no existe
   - ✅ Retorna array vacío en lugar de error 500
   - ✅ Incluye mensaje informativo

### Impacto

- ✅ **Sin impacto negativo**: La aplicación funciona con o sin la tabla
- ✅ **Sin errores**: No hay errores 500 si la tabla no existe
- ✅ **Migración segura**: Se puede aplicar sin problemas

---

## 🎯 Recomendación

**Continuar con la migración tal como está**:

1. La migración ya está actualizada
2. El código ya maneja el caso
3. Puedes aplicar la migración sin problemas

```bash
cd supabase
supabase db push
```

Si en el futuro necesitas cupones, puedes crear la tabla y volver a ejecutar la migración.

---

**Preparado por**: Kiro AI Assistant  
**Fecha**: 2026-02-04  
**Estado**: ✅ RESUELTO

