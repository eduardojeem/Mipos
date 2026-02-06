# ✅ Fix: Migración Idempotente

**Fecha:** 2026-02-05  
**Problema:** Error al ejecutar migración múltiples veces  
**Estado:** ✅ RESUELTO

---

## 🐛 Problema Original

```
Error: Failed to run sql query: 
ERROR: 42710: policy "Super Admin can view all domains" 
for table "organization_domains" already exists
```

**Causa:** La migración intentaba crear policies que ya existían de una ejecución anterior.

---

## ✅ Solución Implementada

Actualizada la migración para ser **idempotente** (se puede ejecutar múltiples veces sin errores):

```sql
-- Eliminar policies existentes si existen (para idempotencia)
DROP POLICY IF EXISTS "Super Admin can view all domains" ON organization_domains;
DROP POLICY IF EXISTS "Users can view their organization domains" ON organization_domains;
DROP POLICY IF EXISTS "Super Admin can manage all domains" ON organization_domains;

-- Luego crear las policies
CREATE POLICY "Super Admin can view all domains" ...
CREATE POLICY "Users can view their organization domains" ...
CREATE POLICY "Super Admin can manage all domains" ...
```

**Cambio clave:** Agregado `DROP POLICY IF EXISTS` antes de cada `CREATE POLICY`.

---

## 🧪 Verificación

```bash
# Ejecutar migración (ahora funciona múltiples veces)
npx tsx scripts/apply-organization-domains-migration.ts
# ✅ Migración ejecutada exitosamente

# Verificar resultado
npx tsx scripts/verify-public-pages-saas.ts
# ✅ 3 organizaciones configuradas
# ✅ Todos los campos necesarios presentes
# ✅ Aislamiento de datos correcto
```

---

## 📊 Resultado

| Verificación | Estado |
|--------------|--------|
| Tabla organizations | ✅ 3 orgs configuradas |
| Campos subdomain/custom_domain | ✅ Presentes |
| organization_id en tablas | ✅ Correcto |
| Aislamiento de datos | ✅ 100% |
| Configuración por org | ✅ Correcta |
| Policies RLS | ✅ Creadas |

---

## 📝 Lecciones Aprendidas

**Siempre hacer migraciones idempotentes:**

```sql
-- ✅ BUENO (idempotente)
DROP POLICY IF EXISTS "policy_name" ON table_name;
CREATE POLICY "policy_name" ...

-- ❌ MALO (falla si ya existe)
CREATE POLICY "policy_name" ...
```

**Otros ejemplos de idempotencia:**

```sql
-- Tablas
CREATE TABLE IF NOT EXISTS ...

-- Columnas
ALTER TABLE table_name
ADD COLUMN IF NOT EXISTS column_name ...

-- Índices
CREATE INDEX IF NOT EXISTS ...

-- Constraints
ALTER TABLE table_name
DROP CONSTRAINT IF EXISTS constraint_name;
ALTER TABLE table_name
ADD CONSTRAINT constraint_name ...
```

---

## ✅ Estado Final

- ✅ Migración ejecutada exitosamente
- ✅ Policies RLS creadas correctamente
- ✅ Organizaciones configuradas con subdominios
- ✅ Sistema listo para páginas públicas SaaS

**Todo funcionando correctamente.**

---

**Resuelto por:** Kiro AI Assistant  
**Fecha:** 2026-02-05
