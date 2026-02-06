# Configuración de Dominio SaaS Multitenancy

## 🎯 Objetivo

Configurar el sistema para funcionar con el dominio `miposparaguay.vercel.app` y permitir subdominios para cada organización.

## 📋 Componentes Implementados

### 1. **Tabla de Configuración del Sistema** ✅

**Archivo:** `database/migrations/create-system-settings-table.sql`

Tabla `system_settings` para almacenar configuración global:
- `key`: Clave única (ej: 'base_domain')
- `value`: Valor en formato JSONB
- `updated_at`: Fecha de última actualización
- `updated_by`: Usuario que actualizó
- RLS habilitado (solo Super Admins)

### 2. **API Endpoint de Configuración** ✅

**Archivo:** `apps/frontend/src/app/api/superadmin/system-settings/route.ts`

Endpoints:
- `GET /api/superadmin/system-settings` - Obtener configuración actual
- `POST /api/superadmin/system-settings` - Actualizar configuración

Seguridad:
- ✅ Solo Super Admins pueden acceder
- ✅ Validación de formato de dominio
- ✅ Sanitización de inputs

### 3. **Componente de Configuración en SuperAdmin** ✅

**Archivo:** `apps/frontend/src/app/superadmin/components/SystemSettings.tsx`

Características:
- ✅ Formulario para configurar dominio base
- ✅ Vista previa de cómo se verán los subdominios
- ✅ Validación de formato de dominio
- ✅ Guía de configuración DNS
- ✅ Instrucciones para Vercel
- ✅ Documentación integrada

### 4. **Helper de Dominio Base** ✅

**Archivo:** `apps/frontend/src/lib/system/get-base-domain.ts`

Funciones:
- `getBaseDomain()` - Obtiene dominio de DB o env (async)
- `getBaseDomainSync()` - Versión síncrona para middleware
- `buildSubdomainUrl()` - Construye URL completa
- `extractSubdomain()` - Extrae subdominio de hostname

### 5. **Actualización de SuperAdmin** ✅

**Archivo:** `apps/frontend/src/app/superadmin/SuperAdminClient.tsx`

Cambios:
- ✅ Nuevo tab "Configuración"
- ✅ Integración del componente SystemSettings
- ✅ Icono Settings agregado

### 6. **Actualización de DomainSettingsForm** ✅

**Archivo:** `apps/frontend/src/app/admin/business-config/components/DomainSettingsForm.tsx`

Cambios:
- ✅ Carga dominio base del sistema
- ✅ Vista previa usa dominio base real
- ✅ Validaciones actualizadas

## 🚀 Pasos de Implementación

### Paso 1: Aplicar Migración de Base de Datos

```bash
# Ejecutar script de migración
npm run ts-node scripts/apply-system-settings-migration.ts
```

O ejecutar manualmente en Supabase SQL Editor:
```sql
-- Copiar y pegar el contenido de:
database/migrations/create-system-settings-table.sql
```

### Paso 2: Configurar Variables de Entorno

Agregar a `apps/frontend/.env.local`:

```env
NEXT_PUBLIC_BASE_DOMAIN=miposparaguay.vercel.app
```

### Paso 3: Configurar en SuperAdmin

1. Ir a `/superadmin`
2. Seleccionar tab "Configuración"
3. Ingresar dominio base: `miposparaguay.vercel.app`
4. Guardar

### Paso 4: Configuración DNS en Vercel

#### Opción A: Dominio de Vercel (Automático)

Si usas `*.vercel.app`, los subdominios funcionan automáticamente. No requiere configuración adicional.

#### Opción B: Dominio Personalizado

Si usas un dominio personalizado, agregar en tu proveedor DNS:

```
Tipo: CNAME
Nombre: *
Valor: cname.vercel-dns.com
TTL: 3600
```

### Paso 5: Configurar Dominio en Vercel

1. Ir a tu proyecto en Vercel
2. Settings → Domains
3. Agregar dominio: `miposparaguay.vercel.app`
4. Vercel configurará automáticamente los subdominios wildcard

## 📊 Flujo de Funcionamiento

### 1. Detección de Organización

```
Usuario accede a: tienda1.miposparaguay.vercel.app/home
                    ↓
Middleware extrae subdomain: "tienda1"
                    ↓
Busca en DB: organizations WHERE subdomain = 'tienda1'
                    ↓
Inyecta organization_id en cookies
                    ↓
Página /home filtra datos por organization_id
```

### 2. Configuración de Subdominios

```
Admin va a: /admin/business-config → Tab "Dominio y Tienda"
                    ↓
Configura subdomain: "mi-tienda"
                    ↓
Sistema genera URL: mi-tienda.miposparaguay.vercel.app
                    ↓
Clientes acceden a esa URL
```

### 3. Configuración Global

```
Super Admin va a: /superadmin → Tab "Configuración"
                    ↓
Configura base domain: "miposparaguay.vercel.app"
                    ↓
Todos los subdominios usan ese dominio base
```

## 🔒 Seguridad

### RLS Policies

✅ Solo Super Admins pueden:
- Leer configuración del sistema
- Modificar configuración del sistema

✅ Solo Admins/Owners pueden:
- Configurar subdomain de su organización
- Ver configuración de su organización

### Validaciones

✅ Formato de dominio validado (regex)
✅ Subdominios únicos por organización
✅ Sanitización de inputs
✅ Cookies httpOnly para organization_id

## 📁 Archivos Creados/Modificados

### Nuevos Archivos

```
database/migrations/create-system-settings-table.sql
scripts/apply-system-settings-migration.ts
apps/frontend/src/app/api/superadmin/system-settings/route.ts
apps/frontend/src/app/superadmin/components/SystemSettings.tsx
apps/frontend/src/lib/system/get-base-domain.ts
SAAS_DOMAIN_CONFIGURATION.md
```

### Archivos Modificados

```
apps/frontend/src/app/superadmin/SuperAdminClient.tsx
apps/frontend/src/app/admin/business-config/components/DomainSettingsForm.tsx
apps/frontend/.env.example
```

## 🧪 Testing

### 1. Verificar Tabla

```sql
SELECT * FROM system_settings WHERE key = 'base_domain';
```

### 2. Verificar API

```bash
# GET configuración
curl http://localhost:3001/api/superadmin/system-settings

# POST configuración (requiere auth)
curl -X POST http://localhost:3001/api/superadmin/system-settings \
  -H "Content-Type: application/json" \
  -d '{"baseDomain": "miposparaguay.vercel.app"}'
```

### 3. Verificar UI

1. **SuperAdmin:**
   - Ir a `/superadmin`
   - Tab "Configuración"
   - Verificar que carga el dominio actual
   - Modificar y guardar
   - Verificar que persiste

2. **Admin:**
   - Ir a `/admin/business-config`
   - Tab "Dominio y Tienda"
   - Verificar que la vista previa usa el dominio base correcto
   - Configurar subdomain
   - Verificar URL generada

3. **Páginas Públicas:**
   - Acceder a `[subdomain].miposparaguay.vercel.app/home`
   - Verificar que carga datos de la organización correcta
   - Verificar que no se mezclan datos entre organizaciones

## 📝 Notas Importantes

### Desarrollo Local

En desarrollo (localhost), el sistema:
- Usa la primera organización activa como default
- No requiere configuración de subdominios
- Logs en consola para debugging

### Producción

En producción:
- Subdominios son obligatorios
- Redirige a 404 si no encuentra organización
- Verifica subscription_status = 'ACTIVE'

### Prioridad de Configuración

1. **Base de datos** (`system_settings.base_domain`)
2. **Variable de entorno** (`NEXT_PUBLIC_BASE_DOMAIN`)
3. **Valor por defecto** (`miposparaguay.vercel.app`)

## 🎨 UI/UX

### SuperAdmin - Configuración

- 🎨 Diseño con gradientes purple/pink
- 📊 Vista previa de subdominios
- 📚 Guía de configuración integrada
- 🔗 Links a documentación de Vercel
- ✅ Validación en tiempo real

### Admin - Dominio y Tienda

- 🎨 Diseño con gradientes blue/purple
- 🖼️ Mockup de navegador con preview
- 📋 Botón copiar URL
- 🔗 Botón abrir tienda en nueva pestaña
- 💡 Instrucciones paso a paso

## 🚀 Próximos Pasos

1. ✅ Aplicar migración de base de datos
2. ✅ Configurar variable de entorno
3. ✅ Configurar dominio en SuperAdmin
4. ⏳ Configurar DNS (si es dominio personalizado)
5. ⏳ Probar subdominios en producción
6. ⏳ Documentar para usuarios finales

## 📞 Soporte

Si tienes problemas:

1. Verificar que la tabla `system_settings` existe
2. Verificar que el usuario tiene rol SUPER_ADMIN
3. Verificar variables de entorno
4. Revisar logs del middleware
5. Verificar configuración DNS

---

**Fecha:** 2026-02-05  
**Versión:** 1.0  
**Estado:** ✅ Implementado y listo para usar
