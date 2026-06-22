# Supabase Migrations - MiPOS

## 📋 Resumen de Cambios

Se agregaron **4 nuevas tablas** + **índices** + **funciones** para email verification:

| Elemento | Tipo | Descripción |
|----------|------|------------|
| `settings` en organizations | Columna JSONB | Tracking de emailVerified |
| `email_verified` en users | Columna BOOLEAN | Flag de verificación |
| `email_verification_codes` | Tabla | 6-digit codes, 24h expiration |
| `email_verification_tokens` | Tabla | Tracking de tokens Supabase |
| Índices | 7 índices | Para queries rápidas |
| Funciones | 2 funciones | Cleanup + mark verified |

---

## 🚀 Ejecución en Supabase

### Opción A: Dashboard Supabase (Recomendado - Visual)

#### Paso 1: Abrir SQL Editor

```
1. Ir a https://app.supabase.com/
2. Seleccionar proyecto MiPOS
3. Ir a "SQL Editor" (sidebar izquierdo)
4. Click en "New Query"
```

#### Paso 2: Copiar y ejecutar SQL

```
1. Copiar todo el contenido de:
   apps/frontend/src/app/superadmin/migrations/003_add_email_verification.sql

2. Pegar en el SQL Editor

3. Click en "Run" (botón verde)

4. Esperar a que complete (2-5 segundos)
```

#### Paso 3: Verificar

```sql
-- Verificar que las tablas existan
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Debería ver:
-- email_verification_codes
-- email_verification_tokens
```

---

### Opción B: CLI Supabase (Para DevOps)

#### Setup

```bash
# Instalar Supabase CLI
brew install supabase/tap/supabase

# O si usas npm
npm install -g supabase

# Login
supabase login
```

#### Ejecutar migration

```bash
cd apps/frontend

# Crear migration
supabase migration new add_email_verification

# Copiar contenido de 003_add_email_verification.sql 
# al archivo creado en supabase/migrations/

# Ejecutar en dev (local)
supabase migration up

# Ejecutar en producción
supabase db push --project-id=<your-project-id>
```

---

## 📝 Checklist de Ejecución

### Pre-ejecución

- [ ] Backup de base de datos (Supabase lo hace automático)
- [ ] Revisar SQL en editor antes de ejecutar
- [ ] Sin usuarios en verificación (es setup inicial)

### Ejecución

- [ ] Abrir SQL Editor en Supabase
- [ ] Copiar y pegar SQL completo
- [ ] Click "Run"
- [ ] Esperar a que complete

### Post-ejecución

- [ ] Verificar tablas creadas (query abajo)
- [ ] Verificar columnas agregadas
- [ ] Verificar índices creados
- [ ] Verificar funciones creadas

---

## ✅ Verificaciones Post-Migración

### 1. Verificar tablas creadas

```sql
-- Consultar todas las tablas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Debería incluir:
-- - email_verification_codes
-- - email_verification_tokens
```

### 2. Verificar columnas en organizations

```sql
-- Ver todas las columnas de organizations
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'organizations'
ORDER BY column_name;

-- Debería ver:
-- settings | jsonb | YES
```

### 3. Verificar columnas en users

```sql
-- Ver todas las columnas de users
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY column_name;

-- Debería ver:
-- email_verified | boolean | YES
```

### 4. Verificar índices creados

```sql
-- Ver índices
SELECT indexname 
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY indexname;

-- Debería ver índices con:
-- idx_organizations_email_verified
-- idx_users_email_verified
-- idx_verification_codes_user
-- idx_verification_codes_user_code
-- idx_verification_codes_expires
-- idx_verification_tokens_org
-- idx_verification_tokens_expires
```

### 5. Verificar funciones creadas

```sql
-- Ver funciones
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- Debería ver:
-- cleanup_expired_verification_codes
-- mark_organization_email_verified
-- trigger_cleanup_expired_codes
```

---

## ⚠️ Posibles Errores & Soluciones

### Error: "Column 'settings' already exists"

**Causa:** Columna ya existe (migración duplicada)

**Solución:**

```sql
-- Ignorar, continuarse el script
-- O solo ejecutar desde la línea que falta
```

### Error: "Relation 'email_verification_codes' already exists"

**Causa:** Tabla ya existe

**Solución:** Script tiene `IF NOT EXISTS`, debería ser seguro
- Si persiste, borrar tabla manualmente:

```sql
DROP TABLE IF EXISTS email_verification_codes CASCADE;
DROP TABLE IF EXISTS email_verification_tokens CASCADE;
-- Luego re-ejecutar script
```

### Error: "TRIGGER ... does not exist"

**Causa:** Trigger no estaba creado antes

**Solución:** Es normal, el script `CREATE OR REPLACE` maneja esto

---

## 🔧 Cleanup Automático (Opcional)

Las migraciones incluyen funciones para limpiar códigos expirados. Para activar cleanup automático:

```sql
-- Crear extensión pg_cron (si no existe)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Agendar cleanup diario (medianoche UTC)
SELECT cron.schedule(
  'cleanup-verification-codes',
  '0 0 * * *',
  'SELECT cleanup_expired_verification_codes()'
);

-- Ver jobs programados
SELECT * FROM cron.job;

-- Desactivar si necesario
SELECT cron.unschedule('cleanup-verification-codes');
```

**Nota:** pg_cron puede no estar disponible en plan Free de Supabase. En ese caso:
- Usar Edge Functions para limpiar periódicamente
- O usar aplicación para llamar `cleanup_expired_verification_codes()` diariamente

---

## 📊 Monitoreo Post-Migración

### Tamaño de tablas

```sql
-- Ver tamaño de nuevas tablas
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('email_verification_codes', 'email_verification_tokens')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Verificaciones esperadas

```sql
-- Verificar que organizations tiene settings
SELECT COUNT(*) as org_count, 
       COUNT(CASE WHEN settings IS NOT NULL THEN 1 END) as with_settings
FROM organizations;

-- Verificar que users tiene email_verified
SELECT COUNT(*) as user_count,
       COUNT(CASE WHEN email_verified THEN 1 END) as verified_count
FROM users;
```

---

## 🔄 Rollback (Si es necesario)

Si algo sale mal, puedes revertir:

```sql
-- Drop tables
DROP TABLE IF EXISTS email_verification_tokens CASCADE;
DROP TABLE IF EXISTS email_verification_codes CASCADE;

-- Remove columns
ALTER TABLE organizations DROP COLUMN IF EXISTS settings;
ALTER TABLE users DROP COLUMN IF EXISTS email_verified;

-- Remove functions
DROP FUNCTION IF EXISTS cleanup_expired_verification_codes();
DROP FUNCTION IF EXISTS mark_organization_email_verified(UUID);
DROP FUNCTION IF EXISTS trigger_cleanup_expired_codes();
```

---

## 📅 Próximos Pasos Después de Migraciones

1. **Deploy aplicación** con código que usa estas tablas
2. **Test flujo de signup** en dev/staging
3. **Verificar email verification** funciona
4. **Monitor** uso de nuevas tablas
5. **Setup cleanup** si tienes pg_cron

---

## 📞 Soporte

**Si tienes errores:**

1. Copiar mensaje de error exacto
2. Revisar [Supabase Docs](https://supabase.com/docs)
3. Revisar commit en git para detalles
4. Check logs en Supabase "Database" → "Logs"

---

**¿Listo para ejecutar las migraciones?** Avisame si necesitas help! 🚀
