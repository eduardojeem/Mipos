# 🚀 Guía Rápida: Configurar Dominio SaaS

## ✅ Paso 1: Aplicar Migración de Base de Datos

Ejecuta este comando para crear la tabla de configuración:

```bash
npm run ts-node scripts/apply-system-settings-migration.ts
```

Si tienes problemas, ejecuta manualmente en Supabase SQL Editor:
- Abre: https://supabase.com/dashboard/project/[tu-proyecto]/editor
- Copia y pega el contenido de: `database/migrations/create-system-settings-table.sql`
- Ejecuta

## ✅ Paso 2: Configurar Dominio Base

### Opción A: Script Automático (Recomendado)

```bash
npm run ts-node scripts/configure-base-domain.ts
```

### Opción B: Desde la UI

1. Ir a `/superadmin`
2. Seleccionar tab **"Configuración"**
3. Ingresar: `miposparaguay.vercel.app`
4. Clic en **"Guardar Configuración"**

## ✅ Paso 3: Configurar Variable de Entorno

Agregar a `apps/frontend/.env.local`:

```env
NEXT_PUBLIC_BASE_DOMAIN=miposparaguay.vercel.app
```

## ✅ Paso 4: Reiniciar Servidor

```bash
# Detener servidor (Ctrl+C)
# Iniciar de nuevo
npm run dev
```

## ✅ Paso 5: Configurar Subdominios de Organizaciones

### Como Admin de Organización:

1. Ir a `/admin/business-config`
2. Seleccionar tab **"Dominio y Tienda"**
3. Configurar tu subdominio (ej: `mi-tienda`)
4. Ver vista previa: `mi-tienda.miposparaguay.vercel.app`
5. Guardar

### Como Super Admin:

1. Ir a `/superadmin/organizations/[id]`
2. Configurar campos:
   - **Subdomain:** `nombre-tienda`
   - **Custom Domain:** (opcional) `www.mitienda.com`
3. Guardar

## 🌐 Configuración DNS en Vercel

### Para *.vercel.app (Automático)

✅ No requiere configuración adicional
✅ Los subdominios funcionan automáticamente

### Para Dominio Personalizado

1. **En tu proveedor DNS:**
   ```
   Tipo: CNAME
   Nombre: *
   Valor: cname.vercel-dns.com
   TTL: 3600
   ```

2. **En Vercel Dashboard:**
   - Settings → Domains
   - Add Domain: `tudominio.com`
   - Vercel configurará automáticamente

## 🧪 Verificar que Funciona

### 1. Verificar Base de Datos

```sql
SELECT * FROM system_settings WHERE key = 'base_domain';
```

Debe retornar:
```json
{
  "key": "base_domain",
  "value": {"domain": "miposparaguay.vercel.app"}
}
```

### 2. Verificar SuperAdmin

1. Ir a `/superadmin`
2. Tab "Configuración"
3. Debe mostrar: `miposparaguay.vercel.app`

### 3. Verificar Admin

1. Ir a `/admin/business-config`
2. Tab "Dominio y Tienda"
3. Configurar subdomain: `test`
4. Vista previa debe mostrar: `test.miposparaguay.vercel.app`

### 4. Verificar Páginas Públicas

1. Configurar subdomain de una organización: `tienda1`
2. Acceder a: `tienda1.miposparaguay.vercel.app/home`
3. Debe cargar la página pública de esa organización

## 🎯 URLs del Sistema

### Panel de Administración
- **SuperAdmin:** `miposparaguay.vercel.app/superadmin`
- **Admin:** `miposparaguay.vercel.app/admin`
- **Dashboard:** `miposparaguay.vercel.app/dashboard`

### Páginas Públicas (por organización)
- **Home:** `[subdomain].miposparaguay.vercel.app/home`
- **Ofertas:** `[subdomain].miposparaguay.vercel.app/offers`
- **Catálogo:** `[subdomain].miposparaguay.vercel.app/catalog`
- **Rastreo:** `[subdomain].miposparaguay.vercel.app/orders/track`

## 🔧 Troubleshooting

### Problema: "No organization context found"

**Solución:**
1. Verificar que el subdomain existe en la tabla `organizations`
2. Verificar que `subscription_status = 'ACTIVE'`
3. En desarrollo, el middleware usa la primera organización activa

### Problema: "Error al guardar configuración"

**Solución:**
1. Verificar que eres Super Admin
2. Verificar que la tabla `system_settings` existe
3. Revisar logs del servidor

### Problema: Subdominios no funcionan

**Solución:**
1. Verificar configuración DNS (wildcard CNAME)
2. Verificar que el dominio está agregado en Vercel
3. Esperar propagación DNS (hasta 24 horas)

### Problema: Vista previa muestra dominio incorrecto

**Solución:**
1. Verificar variable de entorno `NEXT_PUBLIC_BASE_DOMAIN`
2. Reiniciar servidor después de cambiar .env
3. Limpiar caché del navegador

## 📞 Comandos Útiles

```bash
# Aplicar migración
npm run ts-node scripts/apply-system-settings-migration.ts

# Configurar dominio base
npm run ts-node scripts/configure-base-domain.ts

# Verificar configuración
npm run ts-node scripts/verify-public-pages-saas.ts

# Reiniciar servidor
npm run dev
```

## ✨ Características Implementadas

✅ Configuración de dominio base en SuperAdmin
✅ Configuración de subdominios por organización
✅ Vista previa de URLs en tiempo real
✅ Validación de formato de dominios
✅ Guía de configuración DNS integrada
✅ Soporte para dominios personalizados
✅ Middleware para detección de organización
✅ Aislamiento de datos por organización
✅ Cookies httpOnly para seguridad

## 🎉 ¡Listo!

Tu sistema SaaS multitenancy está configurado y listo para usar con el dominio `miposparaguay.vercel.app`.

Cada organización puede tener su propia tienda pública en:
- `organizacion1.miposparaguay.vercel.app`
- `organizacion2.miposparaguay.vercel.app`
- `tienda-ejemplo.miposparaguay.vercel.app`

---

**¿Necesitas ayuda?** Revisa `SAAS_DOMAIN_CONFIGURATION.md` para documentación completa.
