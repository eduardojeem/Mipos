# 🚀 Guía de Deployment: Páginas Públicas SaaS

**Fecha:** 2026-02-05  
**Para:** Páginas públicas con multitenancy

---

## 📋 PRE-REQUISITOS

Antes de hacer deploy, asegúrate de tener:

- ✅ Migración de base de datos aplicada
- ✅ Organizaciones con `subdomain` configurado
- ✅ Variables de entorno configuradas
- ✅ Dominio principal registrado
- ✅ Acceso a configuración DNS

---

## 🔧 PASO 1: Aplicar Migración de Base de Datos

### En Desarrollo

```bash
# Ejecutar migración
npx tsx scripts/apply-organization-domains-migration.ts

# Verificar resultado
npx tsx scripts/verify-public-pages-saas.ts
```

### En Producción (Supabase Dashboard)

1. Ir a **SQL Editor** en Supabase Dashboard
2. Copiar contenido de `database/migrations/add-organization-domains.sql`
3. Ejecutar SQL
4. Verificar que no haya errores

**O usar CLI de Supabase:**

```bash
# Conectar a proyecto
supabase link --project-ref your-project-ref

# Aplicar migración
supabase db push
```

---

## 🌐 PASO 2: Configurar DNS

### Opción A: Wildcard DNS (Recomendado)

**En tu proveedor de DNS (Cloudflare, GoDaddy, etc.):**

```
Type: A
Name: *
Value: [IP de tu servidor o Vercel]
TTL: 3600 (1 hora)
```

**Ejemplo con Cloudflare:**
```
Type: A
Name: *
Content: 76.76.21.21 (IP de Vercel)
Proxy status: Proxied (naranja)
TTL: Auto
```

**Esto permite:**
- `empresa-a.tudominio.com` → Tu app
- `empresa-b.tudominio.com` → Tu app
- `cualquier-cosa.tudominio.com` → Tu app

### Opción B: Subdominios Individuales

Si no puedes usar wildcard, agrega cada subdominio manualmente:

```
Type: A
Name: empresa-a
Value: [IP de tu servidor]

Type: A
Name: empresa-b
Value: [IP de tu servidor]

Type: A
Name: empresa-c
Value: [IP de tu servidor]
```

---

## 🔐 PASO 3: Configurar SSL

### Opción A: Wildcard SSL (Recomendado)

**Con Let's Encrypt (Certbot):**

```bash
# Instalar Certbot
sudo apt-get install certbot

# Obtener certificado wildcard (requiere DNS challenge)
sudo certbot certonly --manual \
  --preferred-challenges dns \
  -d tudominio.com \
  -d *.tudominio.com

# Seguir instrucciones para agregar TXT record en DNS
```

**Con Cloudflare (Automático):**
- Si usas Cloudflare con proxy (naranja), SSL es automático
- Cloudflare maneja el certificado wildcard por ti
- No necesitas configurar nada adicional

### Opción B: SSL por Subdominio

Si no puedes usar wildcard, obtén certificado para cada subdominio:

```bash
sudo certbot certonly --webroot \
  -w /var/www/html \
  -d empresa-a.tudominio.com \
  -d empresa-b.tudominio.com \
  -d empresa-c.tudominio.com
```

---

## ☁️ PASO 4: Configurar Vercel

### 4.1 Agregar Dominio Principal

1. Ir a **Project Settings** → **Domains**
2. Agregar `tudominio.com`
3. Verificar DNS (puede tomar hasta 48 horas)

### 4.2 Agregar Wildcard Domain

1. En **Domains**, agregar `*.tudominio.com`
2. Vercel detectará automáticamente el wildcard DNS
3. SSL se configura automáticamente

**Nota:** Vercel Pro o Enterprise requerido para wildcard domains.

### 4.3 Configurar Variables de Entorno

En **Project Settings** → **Environment Variables**:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# App
NEXT_PUBLIC_BASE_URL=https://tudominio.com
NODE_ENV=production
```

### 4.4 Configurar vercel.json

Asegúrate de tener este archivo en la raíz del proyecto:

```json
{
  "buildCommand": "cd apps/frontend && npm run build",
  "outputDirectory": "apps/frontend/.next",
  "framework": "nextjs",
  "rewrites": [
    {
      "source": "/:path*",
      "destination": "/:path*"
    }
  ],
  "headers": [
    {
      "source": "/:path*",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "SAMEORIGIN"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    }
  ]
}
```

---

## 🗄️ PASO 5: Configurar Organizaciones

### 5.1 Verificar Organizaciones Existentes

```sql
-- En Supabase SQL Editor
SELECT id, name, slug, subdomain, subscription_status
FROM organizations
ORDER BY created_at DESC;
```

### 5.2 Generar Subdomains Faltantes

```sql
-- Generar subdomain basado en slug
UPDATE organizations
SET subdomain = slug
WHERE subdomain IS NULL AND slug IS NOT NULL;

-- Verificar
SELECT name, slug, subdomain FROM organizations;
```

### 5.3 Crear Nueva Organización

```sql
-- Insertar organización
INSERT INTO organizations (
  name,
  slug,
  subdomain,
  subscription_plan,
  subscription_status,
  owner_id
) VALUES (
  'Mi Empresa',
  'mi-empresa',
  'mi-empresa',
  'PRO',
  'ACTIVE',
  'user-uuid-here'
);

-- Verificar
SELECT * FROM organizations WHERE slug = 'mi-empresa';
```

---

## 🧪 PASO 6: Testing

### 6.1 Test en Staging

```bash
# 1. Deploy a staging
vercel --prod=false

# 2. Obtener URL de staging
# Ejemplo: https://your-app-staging.vercel.app

# 3. Probar con subdominios simulados
# Editar /etc/hosts (Linux/Mac) o C:\Windows\System32\drivers\etc\hosts (Windows)
127.0.0.1 empresa-a.localhost
127.0.0.1 empresa-b.localhost

# 4. Acceder
http://empresa-a.localhost:3001/home
http://empresa-b.localhost:3001/home
```

### 6.2 Test en Producción

```bash
# 1. Verificar DNS propagado
nslookup empresa-a.tudominio.com
# Debe devolver la IP correcta

# 2. Verificar SSL
curl -I https://empresa-a.tudominio.com
# Debe devolver 200 OK con SSL válido

# 3. Probar páginas
https://empresa-a.tudominio.com/home
https://empresa-a.tudominio.com/offers
https://empresa-a.tudominio.com/catalog
https://empresa-a.tudominio.com/orders/track

# 4. Verificar aislamiento
# Acceder a empresa-b.tudominio.com
# Debe mostrar productos diferentes
```

### 6.3 Verificar Aislamiento

```bash
# Script de verificación
npx tsx scripts/verify-public-pages-saas.ts

# Debe mostrar:
# ✅ Aislamiento de datos: Correcto
# ✅ organization_id en todas las tablas
# ✅ Configuración por organización
```

---

## 📊 PASO 7: Monitoreo

### 7.1 Logs de Middleware

El middleware logea cada detección de organización:

```
✅ Organization detected: Empresa A (empresa-a)
✅ Organization detected: Empresa B (empresa-b)
⚠️  No organization found for hostname: unknown.tudominio.com
```

**Ver logs en Vercel:**
1. Ir a **Deployments** → **Latest Deployment**
2. Click en **Functions**
3. Ver logs en tiempo real

### 7.2 Métricas a Monitorear

- **Requests por organización:** Cuántas visitas tiene cada org
- **Errores 404:** Subdominios no encontrados
- **Errores 500:** Problemas de middleware
- **Tiempo de respuesta:** Performance por organización

### 7.3 Alertas Recomendadas

```javascript
// Configurar en Vercel o servicio de monitoreo
- Alert: "Organization not found" > 10 veces/hora
- Alert: Middleware error > 5 veces/hora
- Alert: Response time > 3 segundos
```

---

## 🐛 TROUBLESHOOTING

### Problema: DNS no resuelve

**Síntomas:**
```bash
nslookup empresa-a.tudominio.com
# Server can't find empresa-a.tudominio.com: NXDOMAIN
```

**Solución:**
1. Verificar que el wildcard DNS esté configurado: `*` → IP
2. Esperar propagación (hasta 48 horas)
3. Limpiar caché DNS: `ipconfig /flushdns` (Windows) o `sudo dscacheutil -flushcache` (Mac)
4. Probar con otro DNS: `nslookup empresa-a.tudominio.com 8.8.8.8`

### Problema: SSL inválido

**Síntomas:**
```
ERR_CERT_COMMON_NAME_INVALID
```

**Solución:**
1. Verificar que el certificado sea wildcard: `*.tudominio.com`
2. Renovar certificado si expiró
3. En Cloudflare, verificar que SSL esté en "Full" o "Full (strict)"
4. Esperar propagación de certificado (hasta 24 horas)

### Problema: "No organization context found"

**Síntomas:**
```
Error: No organization context found
```

**Solución:**
1. Verificar que el middleware esté ejecutándose
2. Revisar logs del middleware en Vercel
3. Verificar que la organización exista en DB:
   ```sql
   SELECT * FROM organizations WHERE subdomain = 'empresa-a';
   ```
4. Verificar que `subscription_status = 'ACTIVE'`

### Problema: Veo productos de otra organización

**Síntomas:**
- Empresa A ve productos de Empresa B

**Solución:**
1. Verificar que todas las queries tengan `.eq('organization_id', organization.id)`
2. Ejecutar script de verificación:
   ```bash
   npx tsx scripts/verify-public-pages-saas.ts
   ```
3. Revisar RLS policies en Supabase
4. Limpiar caché del navegador

### Problema: Vercel no acepta wildcard domain

**Síntomas:**
```
Wildcard domains are only available on Pro and Enterprise plans
```

**Solución:**
1. Upgrade a Vercel Pro ($20/mes)
2. O agregar subdominios manualmente (uno por uno)
3. O usar otro hosting que soporte wildcard gratis (Railway, Fly.io)

---

## 📝 CHECKLIST DE DEPLOYMENT

### Pre-Deployment
- [ ] Migración de DB aplicada
- [ ] Organizaciones tienen `subdomain` configurado
- [ ] Variables de entorno configuradas
- [ ] Tests locales pasando

### DNS y SSL
- [ ] Wildcard DNS configurado (`*` → IP)
- [ ] DNS propagado (verificar con `nslookup`)
- [ ] Certificado SSL wildcard obtenido
- [ ] SSL válido (verificar con `curl -I`)

### Vercel
- [ ] Dominio principal agregado
- [ ] Wildcard domain agregado (`*.tudominio.com`)
- [ ] Variables de entorno configuradas
- [ ] `vercel.json` configurado
- [ ] Deploy exitoso

### Testing
- [ ] Acceso a subdominios funciona
- [ ] SSL válido en todos los subdominios
- [ ] Aislamiento de datos verificado
- [ ] Páginas públicas funcionan correctamente
- [ ] API de tracking funciona

### Monitoreo
- [ ] Logs de middleware configurados
- [ ] Alertas configuradas
- [ ] Métricas monitoreadas

---

## 🎓 GUÍA PARA CLIENTES

### Cómo Configurar Tu Tienda

**Para clientes que quieren su propio subdominio:**

1. **Solicitar subdominio:**
   - Contactar a soporte
   - Proporcionar nombre deseado (ej: "mi-tienda")
   - Esperar confirmación (24-48 horas)

2. **Acceder a tu tienda:**
   ```
   https://mi-tienda.tudominio.com/home
   ```

3. **Personalizar:**
   - Ir a Dashboard → Settings
   - Configurar logo, colores, nombre
   - Agregar productos

4. **Compartir:**
   - Compartir URL con clientes
   - Agregar a redes sociales
   - Usar en marketing

### Cómo Configurar Dominio Personalizado (Premium)

**Para clientes con plan PRO o ENTERPRISE:**

1. **Comprar dominio:**
   - Registrar `www.mi-tienda.com` en GoDaddy, Namecheap, etc.

2. **Configurar DNS:**
   ```
   Type: CNAME
   Name: www
   Value: tudominio.com
   TTL: 3600
   ```

3. **Solicitar activación:**
   - Ir a Dashboard → Settings → Custom Domain
   - Ingresar `www.mi-tienda.com`
   - Esperar verificación (24-48 horas)

4. **Acceder:**
   ```
   https://www.mi-tienda.com/home
   ```

---

## 📞 SOPORTE

### Para Desarrolladores
- Revisar `PUBLIC_PAGES_SAAS_IMPLEMENTATION.md`
- Ejecutar `npx tsx scripts/verify-public-pages-saas.ts`
- Revisar logs en Vercel

### Para Clientes
- Contactar soporte técnico
- Proporcionar subdomain o dominio
- Describir el problema

---

## 🎉 CONCLUSIÓN

Siguiendo esta guía, tendrás:

✅ **DNS configurado** con wildcard  
✅ **SSL válido** para todos los subdominios  
✅ **Vercel configurado** con wildcard domain  
✅ **Organizaciones configuradas** con subdominios  
✅ **Aislamiento de datos** al 100%  
✅ **Monitoreo activo** de requests y errores

**Tu sistema SaaS multitenancy está listo para producción.**

---

**Creado por:** Kiro AI Assistant  
**Fecha:** 2026-02-05  
**Versión:** 1.0

---

## 📚 RECURSOS ADICIONALES

- [Vercel Wildcard Domains](https://vercel.com/docs/concepts/projects/domains/wildcard-domains)
- [Let's Encrypt Wildcard Certificates](https://letsencrypt.org/docs/challenge-types/#dns-01-challenge)
- [Cloudflare DNS Setup](https://developers.cloudflare.com/dns/)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
