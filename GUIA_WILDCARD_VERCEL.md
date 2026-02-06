# 🌐 Guía Rápida: Configurar Wildcard en Vercel

**Fecha:** 5 de febrero de 2026  
**Objetivo:** Configurar subdominios wildcard para multitenancy SaaS

---

## ⚠️ REQUISITO IMPORTANTE

**Vercel requiere plan PRO o ENTERPRISE para wildcard domains**
- Plan Hobby (gratis): ❌ No soporta wildcard
- Plan Pro ($20/mes): ✅ Soporta wildcard
- Plan Enterprise: ✅ Soporta wildcard

---

## 🚀 PASOS PARA CONFIGURAR WILDCARD

### 1️⃣ Configurar Variables de Entorno

En tu proyecto de Vercel:

1. Ve a **Settings** → **Environment Variables**
2. Agrega estas variables:

```env
NEXT_PUBLIC_BASE_DOMAIN=tudominio.com
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NODE_ENV=production
```

3. Aplica a: **Production**, **Preview**, y **Development**

---

### 2️⃣ Agregar Dominio Principal

1. Ve a **Settings** → **Domains**
2. Click en **Add Domain**
3. Ingresa tu dominio: `tudominio.com`
4. Click **Add**

Vercel te mostrará los registros DNS que necesitas configurar:

```
Type: A
Name: @
Value: 76.76.21.21
```

---

### 3️⃣ Configurar DNS Wildcard

En tu proveedor de DNS (GoDaddy, Cloudflare, Namecheap, etc.):

#### Opción A: Con Cloudflare (Recomendado)

```
Type: A
Name: *
Content: 76.76.21.21
Proxy status: Proxied (🟠 naranja)
TTL: Auto
```

#### Opción B: Con GoDaddy

```
Type: A
Host: *
Points to: 76.76.21.21
TTL: 1 Hour
```

#### Opción C: Con Namecheap

```
Type: A Record
Host: *
Value: 76.76.21.21
TTL: Automatic
```

**Nota:** La IP `76.76.21.21` es un ejemplo. Vercel te dará la IP correcta.

---

### 4️⃣ Agregar Wildcard Domain en Vercel

1. Ve a **Settings** → **Domains**
2. Click en **Add Domain**
3. Ingresa: `*.tudominio.com`
4. Click **Add**

Vercel verificará automáticamente el DNS wildcard.

**Estados posibles:**
- ✅ **Valid Configuration** - Todo correcto
- ⏳ **Pending Verification** - Esperando propagación DNS (hasta 48h)
- ❌ **Invalid Configuration** - Revisar DNS

---

### 5️⃣ Verificar Configuración

#### Verificar DNS Propagado

```bash
# Windows (PowerShell)
nslookup empresa-a.tudominio.com

# Linux/Mac
dig empresa-a.tudominio.com

# Debe devolver la IP de Vercel
```

#### Verificar SSL

```bash
# Probar con curl
curl -I https://empresa-a.tudominio.com

# Debe devolver:
# HTTP/2 200
# Con certificado SSL válido
```

#### Probar en Navegador

```
https://empresa-a.tudominio.com/home
https://empresa-b.tudominio.com/home
https://cualquier-cosa.tudominio.com/home
```

---

## 🎯 CONFIGURACIÓN ESPECÍFICA PARA TU APP

### Configurar Organizaciones con Subdominios

1. **En Supabase SQL Editor:**

```sql
-- Ver organizaciones actuales
SELECT id, name, slug, subdomain FROM organizations;

-- Agregar subdomain a organizaciones existentes
UPDATE organizations
SET subdomain = slug
WHERE subdomain IS NULL;

-- Crear nueva organización con subdomain
INSERT INTO organizations (name, slug, subdomain, subscription_status)
VALUES ('Mi Empresa', 'mi-empresa', 'mi-empresa', 'ACTIVE');
```

2. **Verificar en la app:**

```
https://mi-empresa.tudominio.com/home
```

---

## 🔧 ALTERNATIVAS SI NO TIENES PLAN PRO

### Opción 1: Usar Vercel.app (Gratis)

Vercel automáticamente soporta wildcard en subdominios `.vercel.app`:

```
https://tu-app.vercel.app          ← Dominio principal
https://empresa-a.tu-app.vercel.app ← Wildcard automático ✅
https://empresa-b.tu-app.vercel.app ← Wildcard automático ✅
```

**Configuración:**

```env
NEXT_PUBLIC_BASE_DOMAIN=tu-app.vercel.app
```

**Ventajas:**
- ✅ Gratis
- ✅ SSL automático
- ✅ Wildcard incluido
- ✅ Sin configuración DNS

**Desventajas:**
- ❌ No es tu dominio personalizado
- ❌ Menos profesional

### Opción 2: Agregar Subdominios Manualmente

Si no puedes pagar Pro, agrega cada subdominio individualmente:

1. En Vercel → **Domains** → **Add Domain**
2. Agregar uno por uno:
   - `empresa-a.tudominio.com`
   - `empresa-b.tudominio.com`
   - `empresa-c.tudominio.com`

**Ventajas:**
- ✅ Funciona en plan Hobby (gratis)
- ✅ Tu dominio personalizado

**Desventajas:**
- ❌ Debes agregar cada subdominio manualmente
- ❌ No escalable para muchas organizaciones

### Opción 3: Usar Otro Hosting

Alternativas que soportan wildcard gratis:

#### Railway.app
```bash
# Deploy a Railway
railway login
railway init
railway up

# Configurar dominio
railway domain
# Agregar *.tudominio.com
```

#### Fly.io
```bash
# Deploy a Fly.io
fly launch
fly deploy

# Configurar wildcard
fly certs add *.tudominio.com
```

#### Render.com
- Plan Starter ($7/mes) incluye wildcard
- Más barato que Vercel Pro

---

## 📊 COMPARACIÓN DE OPCIONES

| Opción | Costo | Wildcard | Dominio Propio | Dificultad |
|--------|-------|----------|----------------|------------|
| **Vercel Pro** | $20/mes | ✅ | ✅ | Fácil |
| **Vercel.app** | Gratis | ✅ | ❌ | Muy fácil |
| **Subdominios manuales** | Gratis | ❌ | ✅ | Media |
| **Railway** | Gratis | ✅ | ✅ | Media |
| **Fly.io** | Gratis | ✅ | ✅ | Media |
| **Render** | $7/mes | ✅ | ✅ | Fácil |

---

## 🐛 PROBLEMAS COMUNES

### "Wildcard domains are only available on Pro"

**Solución:**
1. Upgrade a Vercel Pro ($20/mes)
2. O usar `.vercel.app` (gratis)
3. O cambiar a Railway/Fly.io (gratis)

### DNS no propaga

**Solución:**
```bash
# Limpiar caché DNS
# Windows
ipconfig /flushdns

# Mac
sudo dscacheutil -flushcache

# Linux
sudo systemd-resolve --flush-caches

# Esperar hasta 48 horas para propagación completa
```

### SSL inválido

**Solución:**
1. Esperar propagación (hasta 24h)
2. Verificar que el wildcard DNS esté correcto
3. En Cloudflare, usar "Full (strict)" SSL

### "No organization found"

**Solución:**
```sql
-- Verificar que la organización exista
SELECT * FROM organizations WHERE subdomain = 'empresa-a';

-- Verificar que esté activa
SELECT * FROM organizations 
WHERE subdomain = 'empresa-a' 
AND subscription_status = 'ACTIVE';
```

---

## ✅ CHECKLIST FINAL

- [ ] Plan Vercel Pro activado (o usando .vercel.app)
- [ ] Variables de entorno configuradas
- [ ] Dominio principal agregado en Vercel
- [ ] DNS wildcard configurado (`*` → IP)
- [ ] Wildcard domain agregado en Vercel (`*.tudominio.com`)
- [ ] DNS propagado (verificado con nslookup)
- [ ] SSL válido (verificado con curl)
- [ ] Organizaciones tienen subdomain configurado
- [ ] Probado en navegador con varios subdominios

---

## 🎉 RESULTADO ESPERADO

Después de seguir esta guía, deberías poder acceder a:

```
✅ https://tudominio.com
✅ https://empresa-a.tudominio.com/home
✅ https://empresa-b.tudominio.com/home
✅ https://cualquier-subdominio.tudominio.com/home
```

Cada subdominio mostrará contenido aislado de su organización.

---

## 📞 SOPORTE

**Si tienes problemas:**

1. Revisa los logs en Vercel → Deployments → Functions
2. Ejecuta: `npx tsx scripts/verify-public-pages-saas.ts`
3. Revisa la documentación completa: `DEPLOYMENT_GUIDE_PUBLIC_PAGES.md`

---

**Preparado por:** Kiro AI  
**Fecha:** 5 de febrero de 2026  
**Versión:** 1.0
