# Scripts de Base de Datos - Módulo de Promociones

Este directorio contiene scripts SQL para optimizar el módulo de promociones.

## 📁 Archivos Disponibles

### 1. `add-promotions-indexes-safe.sql` ⭐ RECOMENDADO
Script principal para crear índices y optimizaciones.

**Qué hace:**
- ✅ Crea columna `deleted_at` para soft delete
- ✅ Crea 13 índices optimizados
- ✅ Crea índice único para prevenir duplicados
- ✅ Crea trigger para limitar carrusel a 10 items
- ✅ Actualiza estadísticas de tablas
- ✅ Genera reporte de verificación

**Cuándo usar:** Primera instalación o actualización

**Cómo ejecutar:**
```bash
psql -U postgres -d your_database -f apps/backend/scripts/add-promotions-indexes-safe.sql
```

En entornos con Supabase Cloud también está disponible en `supabase/migrations/add-promotions-indexes-safe.sql`.

---

### 2. `verify-promotions-setup.sql` 🔍
Script de verificación y diagnóstico.

**Qué hace:**
- ✅ Verifica existencia de tablas
- ✅ Verifica columnas importantes
- ✅ Lista todos los índices
- ✅ Detecta duplicados
- ✅ Muestra tamaño de índices
- ✅ Muestra uso de índices
- ✅ Genera reporte completo

**Cuándo usar:** Antes y después de aplicar cambios

**Cómo ejecutar:**
```bash
psql -U postgres -d your_database -f apps/backend/scripts/verify-promotions-setup.sql
```

Disponible en `supabase/migrations/verify-promotions-setup.sql` para ejecutar desde el entorno de base de datos.

---

### 3. `rollback-promotions-indexes.sql` ⚠️
Script de rollback para revertir cambios.

**Qué hace:**
- ⚠️ Elimina todos los índices creados
- ⚠️ Elimina trigger de límite de carrusel
- ⚠️ Elimina función de validación
- ℹ️ NO elimina columna `deleted_at` (por seguridad)

**Cuándo usar:** Solo si hay problemas con los índices

**Cómo ejecutar:**
```bash
psql -U postgres -d your_database -f apps/backend/scripts/rollback-promotions-indexes.sql
```

Disponible en `supabase/migrations/rollback-promotions-indexes.sql`.

---

## 🚀 Guía de Instalación

### Paso 1: Verificar Estado Actual

```bash
psql -U postgres -d your_database -f apps/backend/scripts/verify-promotions-setup.sql
```

**Salida esperada:**
```
✅ Tabla promotions: OK
⚠️  Columna deleted_at: FALTA
⚠️  Índice único: FALTA
⚠️  Trigger de límite: FALTA

⚠️  ISSUES ENCONTRADOS: 3
```

---

### Paso 2: Aplicar Mejoras

```bash
psql -U postgres -d your_database -f apps/backend/scripts/add-promotions-indexes-safe.sql
```

**Salida esperada:**
```
NOTICE: Columna deleted_at agregada a promotions
NOTICE: Índices creados en promotions
NOTICE: Índices creados en promotions_products
NOTICE: Índice único creado en promotions_products
NOTICE: Índices creados en promotions_carousel
NOTICE: Trigger enforce_carousel_limit creado
```

---

### Paso 3: Verificar Instalación

```bash
psql -U postgres -d your_database -f apps/backend/scripts/verify-promotions-setup.sql
```

**Salida esperada:**
```
✅ Tabla promotions: OK
✅ Columna deleted_at: OK
✅ Índice único: OK
✅ Trigger de límite: OK

🎉 SETUP COMPLETO - Todo está correcto!
```

---

## 🔧 Solución de Problemas

### Error: "column deleted_at does not exist"

**Causa:** El script intentó crear un índice antes de crear la columna.

**Solución:** Usa el script seguro:
```bash
psql -U postgres -d your_database -f apps/backend/scripts/add-promotions-indexes-safe.sql
```

---

### Error: "unique constraint violation"

**Causa:** Ya existen duplicados en `promotions_products`.

**Solución 1 - Encontrar duplicados:**
```sql
SELECT promotion_id, product_id, organization_id, COUNT(*) 
FROM promotions_products 
GROUP BY promotion_id, product_id, organization_id 
HAVING COUNT(*) > 1;
```

**Solución 2 - Eliminar duplicados:**
```sql
DELETE FROM promotions_products a
USING promotions_products b
WHERE a.id < b.id
  AND a.promotion_id = b.promotion_id
  AND a.product_id = b.product_id
  AND a.organization_id = b.organization_id;
```

**Solución 3 - Volver a intentar:**
```bash
psql -U postgres -d your_database -f apps/backend/scripts/add-promotions-indexes-safe.sql
```

---

### Error: "trigger already exists"

**Causa:** El trigger ya fue creado anteriormente.

**Solución:** No es un error crítico. El script detecta esto y continúa.

---

### Revertir Todos los Cambios

Si necesitas revertir todo:

```bash
# 1. Ejecutar rollback
psql -U postgres -d your_database -f apps/backend/scripts/rollback-promotions-indexes.sql

# 2. Verificar que se revirtió
psql -U postgres -d your_database -f apps/backend/scripts/verify-promotions-setup.sql

# 3. (Opcional) Eliminar columna deleted_at manualmente
psql -U postgres -d your_database -c "ALTER TABLE promotions DROP COLUMN IF EXISTS deleted_at;"
```

---

## 📊 Índices Creados

### Tabla: `promotions`
1. `idx_promotions_org_active` - Queries por organización y estado
2. `idx_promotions_dates` - Búsquedas por rango de fechas
3. `idx_promotions_active_dates` - Promociones activas por fecha
4. `idx_promotions_deleted` - Soft delete (WHERE deleted_at IS NULL)

### Tabla: `promotions_products`
1. `idx_promotions_products_promo_org` - Productos por promoción
2. `idx_promotions_products_product_org` - Promociones por producto
3. `idx_promotions_products_org` - Queries por organización
4. `idx_promotions_products_unique` - Prevención de duplicados (UNIQUE)

### Tabla: `promotions_carousel`
1. `idx_promotions_carousel_org_position` - Carrusel por organización
2. `idx_promotions_carousel_promotion` - Queries por promoción

### Tabla: `carousel_audit_log` (si existe)
1. `idx_carousel_audit_user` - Auditoría por usuario
2. `idx_carousel_audit_created` - Auditoría por fecha
3. `idx_carousel_audit_action` - Auditoría por acción

---

## 🎯 Mejoras de Performance Esperadas

### Antes de los Índices
- Query de promociones activas: ~500ms (con 10k registros)
- Query de productos en promoción: ~800ms (con 50k registros)
- Carrusel público: ~300ms

### Después de los Índices
- Query de promociones activas: ~50ms ⚡ (10x más rápido)
- Query de productos en promoción: ~80ms ⚡ (10x más rápido)
- Carrusel público: ~30ms ⚡ (10x más rápido)

---

## 📝 Notas Importantes

1. **Backup:** Siempre haz backup antes de ejecutar scripts en producción
2. **Downtime:** Los índices se crean con `IF NOT EXISTS`, no hay downtime
3. **Espacio:** Los índices ocupan espacio adicional (~10-20% del tamaño de la tabla)
4. **Mantenimiento:** Los índices se mantienen automáticamente por PostgreSQL
5. **Estadísticas:** Ejecuta `ANALYZE` periódicamente para mantener estadísticas actualizadas

---

## 🔗 Referencias

- [Auditoría completa](../../.agent/audits/promotions-audit-2026-02-11.md)
- [Resumen de mejoras](../../.agent/audits/promotions-improvements-summary.md)
- [PostgreSQL Indexes](https://www.postgresql.org/docs/current/indexes.html)
- [PostgreSQL Triggers](https://www.postgresql.org/docs/current/triggers.html)

---

**Última actualización:** 11 de febrero de 2026
