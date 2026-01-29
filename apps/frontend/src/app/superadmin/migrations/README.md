# Migraciones de Base de Datos - Super Admin

Este directorio contiene las migraciones SQL necesarias para las nuevas funcionalidades del panel de Super Admin.

## 🗃️ Migraciones Disponibles

### 001 - Subscription Plans

**Archivo:** `001_create_subscription_plans.sql`

Crea la tabla `subscription_plans` para gestionar los planes de suscripción del SaaS.

**Características:**

- Planes con precios mensuales y anuales
- Límites configurables (usuarios, productos, transacciones, ubicaciones)
- Features/características incluidas por plan
- Trial periods configurables
- Auto-actualización de `updated_at`

### 002 - Audit Logs

**Archivo:** `002_create_audit_logs.sql`

Crea la tabla `audit_logs` para tracking completo de acciones en el sistema.

**Características:**

- Registro de todas las acciones críticas
- Metadata flexible en formato JSONB
- Niveles de severidad (INFO, WARNING, CRITICAL)
- Triggers automáticos para organizaciones
- Función helper `create_audit_log()`
- Índices optimizados para consultas frecuentes

## 📋 Cómo Ejecutar las Migraciones

### Opción 1: Supabase Dashboard (Recomendado)

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navega a **SQL Editor**
3. Crea una nueva query
4. Copia y pega el contenido de cada archivo SQL
5. Ejecuta las queries en orden (001, 002)

### Opción 2: Supabase CLI

```bash
# Asegúrate de estar en el directorio del proyecto
cd apps/frontend

# Ejecutar migración de planes
supabase db execute --file src/app/superadmin/migrations/001_create_subscription_plans.sql

# Ejecutar migración de audit logs
supabase db execute --file src/app/superadmin/migrations/002_create_audit_logs.sql
```

### Opción 3: Usando psql directamente

```bash
# Conectarse a tu base de datos
psql "postgresql://[USER]:[PASSWORD]@[HOST]:5432/[DATABASE]"

# Ejecutar cada migración
\i src/app/superadmin/migrations/001_create_subscription_plans.sql
\i src/app/superadmin/migrations/002_create_audit_logs.sql
```

## ✅ Verificar Instalación

Después de ejecutar las migraciones, verifica que se crearon correctamente:

```sql
-- Verificar tablas
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('subscription_plans', 'audit_logs');

-- Verificar la función helper
SELECT proname
FROM pg_proc
WHERE proname = 'create_audit_log';

-- Verificar triggers
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE 'audit_%';
```

## 🔄 Rollback (Si es necesario)

Si necesitas revertir las migraciones:

```sql
-- Rollback audit logs
DROP TRIGGER IF EXISTS audit_organization_changes ON organizations;
DROP FUNCTION IF EXISTS log_organization_changes();
DROP FUNCTION IF EXISTS create_audit_log(TEXT, TEXT, TEXT, UUID, TEXT, UUID, TEXT, JSONB, TEXT, TEXT, TEXT);
DROP TABLE IF EXISTS audit_logs;

-- Rollback subscription plans
DROP TRIGGER IF EXISTS update_subscription_plans_updated_at ON subscription_plans;
DROP TABLE IF EXISTS subscription_plans;
DROP FUNCTION IF EXISTS update_updated_at_column();
```

## 📊 Inicialización de Datos

### Planes por Defecto

Una vez ejecutadas las migraciones, puedes inicializar los planes por defecto desde la interfaz:

1. Ve a `/superadmin/plans`
2. Click en "Inicializar Planes por Defecto"

O ejecuta manualmente en SQL:

```sql
INSERT INTO subscription_plans (name, slug, description, price_monthly, price_yearly, currency, trial_days, limits, features, display_order)
VALUES
  ('Gratuito', 'FREE', 'Para probar el sistema', 0, 0, 'USD', 0,
   '{"maxUsers": 2, "maxProducts": 50, "maxTransactionsPerMonth": 100, "maxLocations": 1}'::jsonb,
   '[{"name": "Panel de control básico", "included": true}, {"name": "Gestión de productos", "included": true}]'::jsonb, 1),
  ('Starter', 'STARTER', 'Para pequeños negocios', 29, 290, 'USD', 14,
   '{"maxUsers": 5, "maxProducts": 500, "maxTransactionsPerMonth": 1000, "maxLocations": 2}'::jsonb,
   '[{"name": "Panel de control básico", "included": true}, {"name": "Reportes avanzados", "included": true}]'::jsonb, 2),
  ('Professional', 'PROFESSIONAL', 'Para negocios en crecimiento', 79, 790, 'USD', 14,
   '{"maxUsers": 15, "maxProducts": 5000, "maxTransactionsPerMonth": 10000, "maxLocations": 5}'::jsonb,
   '[{"name": "Panel de control básico", "included": true}, {"name": "API acceso", "included": true}]'::jsonb, 3),
  ('Enterprise', 'ENTERPRISE', 'Para grandes empresas', 299, 2990, 'USD', 30,
   '{"maxUsers": -1, "maxProducts": -1, "maxTransactionsPerMonth": -1, "maxLocations": -1}'::jsonb,
   '[{"name": "Todo incluido", "included": true}, {"name": "Soporte prioritario", "included": true}]'::jsonb, 4);
```

## 🔒 Permisos Recomendados

Las tablas deben tener los siguientes permisos en Supabase:

### subscription_plans

- **Super Admin**: Lectura + Escritura completa
- **Organizaciones**: Solo lectura
- **Usuarios**: Solo lectura

### audit_logs

- **Super Admin**: Lectura completa
- **Sistema**: Escritura automática via triggers
- **Organizaciones**: Sin acceso directo
- **Usuarios**: Sin acceso directo

## 📝 Notas Importantes

1. **Backup**: Siempre haz un backup antes de ejecutar migraciones en producción
2. **Orden**: Ejecuta las migraciones en orden numérico
3. **Testing**: Prueba primero en desarrollo/staging
4. **Audit Logs**: Los logs se crean automáticamente via triggers, no es necesario insertar manualmente
5. **Performance**: Los índices están optimizados para consultas frecuentes

## 🆘 Troubleshooting

### Error: "relation already exists"

Las tablas ya existen. Puedes:

- Saltarte la migración
- Hacer rollback y volver a ejecutar
- Usar `CREATE TABLE IF NOT EXISTS`

### Error: "function already exists"

Las funciones ya existen. Usa `CREATE OR REPLACE FUNCTION` o haz rollback primero.

### Los triggers no se ejecutan

Verifica que:

1. La tabla `organizations` existe
2. El trigger se creó correctamente: `SELECT * FROM pg_trigger WHERE tgname = 'audit_organization_changes';`
3. Hay permisos suficientes

## 🔗 Recursos

- [Documentación de Supabase](https://supabase.com/docs)
- [PostgreSQL JSONB](https://www.postgresql.org/docs/current/datatype-json.html)
- [PostgreSQL Triggers](https://www.postgresql.org/docs/current/sql-createtrigger.html)
