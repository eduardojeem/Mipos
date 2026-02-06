# 🎉 Setup Gratis: Wildcard con *.vercel.app

**Fecha:** 5 de febrero de 2026  
**Ventaja:** 100% gratis, sin necesidad de Vercel Pro

---

## ✅ VENTAJAS DE USAR .vercel.app

- ✅ **Gratis** - No necesitas Vercel Pro
- ✅ **Wildcard automático** - Funciona sin configuración
- ✅ **SSL automático** - Certificados incluidos
- ✅ **Sin DNS** - No necesitas configurar nada
- ✅ **Instantáneo** - Funciona inmediatamente

---

## 🚀 PASO 1: Configurar Variables de Entorno Locales

Actualiza tu archivo `.env.local`:

```bash
# apps/frontend/.env.local

# Supabase (ya lo tienes)
NEXT_PUBLIC_SUPABASE_URL="https://pveqijpwccezviwqkslb.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# 🆕 AGREGAR ESTA LÍNEA (reemplaza con tu nombre de proyecto)
NEXT_PUBLIC_BASE_DOMAIN=tu-proyecto.vercel.app

# Backend
NEXT_PUBLIC_API_URL="http://localhost:3000/api"
NODE_ENV="development"
```

**¿Cómo saber tu nombre de proyecto?**
1. Ve a tu proyecto en Vercel Dashboard
2. Mira la URL: `https://tu-proyecto.vercel.app`
3. Usa `tu-proyecto.vercel.app` como base domain

---

## 🚀 PASO 2: Configurar Variables en Vercel

1. Ve a tu proyecto en **Vercel Dashboard**
2. Click en **Settings** → **Environment Variables**
3. Agrega estas variables:

### Variables Requeridas:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://pveqijpwccezviwqkslb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2ZXFpanB3Y2NlenZpd3Frc2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NjI0NDAsImV4cCI6MjA4NDQzODQ0MH0.t6on5tp7XqOiNxW2xG3ODIhFCSZhjOrc5JJoJgmhmMM
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2ZXFpanB3Y2NlenZpd3Frc2xiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg2MjQ0MCwiZXhwIjoyMDg0NDM4NDQwfQ.DZNjp85X7xtCKr7_bLIj3l0PNCTuuVXicM449CazVEY

# Base Domain (IMPORTANTE)
NEXT_PUBLIC_BASE_DOMAIN=tu-proyecto.vercel.app

# API
NEXT_PUBLIC_API_URL=https://tu-proyecto.vercel.app/api

# Environment
NODE_ENV=production
```

4. Aplica a: **Production**, **Preview**, y **Development**
5. Click **Save**

---

## 🚀 PASO 3: Configurar Organizaciones con Subdominios

Ahora necesitas configurar tus organizaciones en Supabase para que tengan subdominios.

### Opción A: Desde Supabase SQL Editor

1. Ve a **Supabase Dashboard** → **SQL Editor**
2. Ejecuta este SQL:

```sql
-- Ver organizaciones actuales
SELECT id, name, slug, subdomain, subscription_status
FROM organizations
ORDER BY created_at DESC;

-- Agregar subdomain a organizaciones existentes
UPDATE organizations
SET subdomain = slug
WHERE subdomain IS NULL AND slug IS NOT NULL;

-- Crear organización de prueba
INSERT INTO organizations (
  name,
  slug,
  subdomain,
  subscription_plan,
  subscription_status
) VALUES (
  'Tienda Demo',
  'tienda-demo',
  'tienda-demo',
  'PRO',
  'ACTIVE'
);

-- Verificar
SELECT name, slug, subdomain, subscription_status
FROM organizations
WHERE subdomain IS NOT NULL;
```

### Opción B: Desde tu App (Super Admin)

1. Accede a `/superadmin/organizations`
2. Edita cada organización
3. Agrega un `subdomain` (ej: "tienda-demo")
4. Guarda

---

## 🚀 PASO 4: Deploy a Vercel

### Desde Git (Recomendado)

Si tu proyecto está conectado a GitHub:

```bash
# Hacer commit de cambios
git add .
git commit -m "feat: configurar wildcard vercel.app"
git push

# Vercel detectará el push y hará deploy automático
```

### Desde CLI

```bash
# Instalar Vercel CLI (si no lo tienes)
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

---

## 🧪 PASO 5: Probar Subdominios

Una vez deployado, prueba acceder a:

### Dominio Principal
```
https://tu-proyecto.vercel.app
```

### Subdominios de Organizaciones
```
https://tienda-demo.tu-proyecto.vercel.app/home
https://tienda-demo.tu-proyecto.vercel.app/offers
https://tienda-demo.tu-proyecto.vercel.app/catalog
```

### Verificar Aislamiento

1. Crea 2 organizaciones:
   - `tienda-a` con subdomain `tienda-a`
   - `tienda-b` con subdomain `tienda-b`

2. Agrega productos diferentes a cada una

3. Accede a:
   ```
   https://tienda-a.tu-proyecto.vercel.app/catalog
   https://tienda-b.tu-proyecto.vercel.app/catalog
   ```

4. Verifica que cada una muestre solo sus productos

---

## 🔍 PASO 6: Verificar Configuración

### Verificar Variables de Entorno

En Vercel Dashboard → Settings → Environment Variables:

```
✅ NEXT_PUBLIC_BASE_DOMAIN = tu-proyecto.vercel.app
✅ NEXT_PUBLIC_SUPABASE_URL = https://...
✅ NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJ...
✅ SUPABASE_SERVICE_ROLE_KEY = eyJ...
```

### Verificar Middleware

Revisa los logs en Vercel:

1. Ve a **Deployments** → **Latest**
2. Click en **Functions**
3. Busca logs como:

```
✅ Organization detected: Tienda Demo (tienda-demo)
✅ Hostname: tienda-demo.tu-proyecto.vercel.app
```

### Verificar Base de Datos

```sql
-- Todas las organizaciones deben tener subdomain
SELECT name, subdomain, subscription_status
FROM organizations
WHERE subdomain IS NULL;

-- Debe devolver 0 filas
```

---

## 📱 PASO 7: Compartir con Clientes

Ahora puedes dar a cada cliente su URL personalizada:

```
Cliente A: https://cliente-a.tu-proyecto.vercel.app
Cliente B: https://cliente-b.tu-proyecto.vercel.app
Cliente C: https://cliente-c.tu-proyecto.vercel.app
```

Cada uno verá solo su contenido aislado.

---

## 🎨 PASO 8: Personalización por Cliente

Cada organización puede personalizar:

1. **Logo y colores** - En `/dashboard/settings` → Apariencia
2. **Información de negocio** - En `/dashboard/settings` → Sistema
3. **Productos** - En `/dashboard/products`
4. **Ofertas** - En `/dashboard/offers`

Todo se mostrará en su subdominio público:
```
https://su-subdominio.tu-proyecto.vercel.app/home
```

---

## 🐛 TROUBLESHOOTING

### Problema: "No organization context found"

**Causa:** El middleware no encuentra la organización

**Solución:**
```sql
-- Verificar que la organización existe
SELECT * FROM organizations WHERE subdomain = 'tienda-demo';

-- Verificar que está activa
SELECT * FROM organizations 
WHERE subdomain = 'tienda-demo' 
AND subscription_status = 'ACTIVE';

-- Si no existe, crearla
INSERT INTO organizations (name, slug, subdomain, subscription_status)
VALUES ('Tienda Demo', 'tienda-demo', 'tienda-demo', 'ACTIVE');
```

### Problema: Veo productos de otra organización

**Causa:** Falta filtro por organization_id

**Solución:**
```bash
# Ejecutar script de verificación
npx tsx scripts/verify-public-pages-saas.ts

# Debe mostrar:
# ✅ Aislamiento de datos: Correcto
```

### Problema: 404 en subdominios

**Causa:** Variable NEXT_PUBLIC_BASE_DOMAIN incorrecta

**Solución:**
1. Verificar en Vercel → Settings → Environment Variables
2. Debe ser: `tu-proyecto.vercel.app` (sin https://)
3. Redeploy después de cambiar

### Problema: SSL inválido

**Causa:** Vercel aún está generando certificado

**Solución:**
- Esperar 5-10 minutos
- Vercel genera certificados SSL automáticamente
- Refrescar página

---

## 📊 EJEMPLO COMPLETO

### Configuración Final

```env
# .env.local y Vercel Environment Variables
NEXT_PUBLIC_BASE_DOMAIN=mipos-paraguay.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://pveqijpwccezviwqkslb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_API_URL=https://mipos-paraguay.vercel.app/api
NODE_ENV=production
```

### Organizaciones en DB

```sql
-- Ejemplo de organizaciones configuradas
SELECT name, subdomain FROM organizations;

-- Resultado:
-- Farmacia Central | farmacia-central
-- Supermercado Norte | supermercado-norte
-- Tienda Tech | tienda-tech
```

### URLs Resultantes

```
https://mipos-paraguay.vercel.app                    ← App principal
https://farmacia-central.mipos-paraguay.vercel.app   ← Cliente 1
https://supermercado-norte.mipos-paraguay.vercel.app ← Cliente 2
https://tienda-tech.mipos-paraguay.vercel.app        ← Cliente 3
```

---

## ✅ CHECKLIST FINAL

- [ ] Variable `NEXT_PUBLIC_BASE_DOMAIN` configurada localmente
- [ ] Variables de entorno configuradas en Vercel
- [ ] Organizaciones tienen `subdomain` configurado
- [ ] Deploy exitoso en Vercel
- [ ] Probado dominio principal: `https://tu-proyecto.vercel.app`
- [ ] Probado subdominio: `https://test.tu-proyecto.vercel.app/home`
- [ ] Verificado aislamiento de datos
- [ ] SSL funcionando correctamente

---

## 🎉 RESULTADO FINAL

Ahora tienes un sistema SaaS multitenancy completamente funcional:

✅ **Wildcard gratis** con `*.vercel.app`  
✅ **SSL automático** en todos los subdominios  
✅ **Aislamiento de datos** por organización  
✅ **URLs personalizadas** para cada cliente  
✅ **Sin costos adicionales** - 100% gratis

**Cada cliente tiene su propia tienda:**
```
https://cliente-a.tu-proyecto.vercel.app
https://cliente-b.tu-proyecto.vercel.app
https://cliente-c.tu-proyecto.vercel.app
```

---

## 🚀 PRÓXIMOS PASOS

### Para Producción Real

Cuando estés listo para usar tu propio dominio:

1. **Comprar dominio** (ej: `miposparaguay.com`)
2. **Upgrade a Vercel Pro** ($20/mes)
3. **Configurar wildcard** (`*.miposparaguay.com`)
4. **Actualizar variable:** `NEXT_PUBLIC_BASE_DOMAIN=miposparaguay.com`

Pero por ahora, `*.vercel.app` es perfecto para:
- ✅ Desarrollo
- ✅ Testing
- ✅ Demo a clientes
- ✅ MVP inicial

---

## 📞 NECESITAS AYUDA?

Si tienes problemas:

1. Revisa los logs en Vercel → Deployments → Functions
2. Ejecuta: `npx tsx scripts/verify-public-pages-saas.ts`
3. Verifica variables de entorno en Vercel
4. Revisa que organizaciones tengan `subdomain` en DB

---

**Preparado por:** Kiro AI  
**Fecha:** 5 de febrero de 2026  
**Versión:** 1.0 - Setup Gratis
