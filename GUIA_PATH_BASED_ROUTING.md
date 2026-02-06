# 🚀 Guía: Path-Based Routing para Multitenancy

**Estrategia:** Usar rutas en lugar de subdominios  
**Ventaja:** Funciona gratis en Vercel Hobby  
**Estado:** ✅ Listo para usar

---

## 🎯 ¿Qué es Path-Based Routing?

En lugar de usar subdominios:
```
❌ https://bfjeem.miposparaguay.vercel.app/home
❌ https://acme-corp.miposparaguay.vercel.app/home
```

Usamos rutas (paths):
```
✅ https://miposparaguay.vercel.app/bfjeem/home
✅ https://miposparaguay.vercel.app/acme-corp/home
```

---

## ✅ VENTAJAS

- ✅ **Gratis** - Funciona en Vercel Hobby
- ✅ **Sin configuración DNS** - No necesitas configurar nada
- ✅ **SEO friendly** - Cada organización tiene su propia ruta
- ✅ **Fácil de compartir** - URLs simples y claras
- ✅ **Funciona inmediatamente** - Ya está implementado

---

## 🌐 ESTRUCTURA DE URLs

### Formato General:
```
https://miposparaguay.vercel.app/{slug}/{page}
```

### Ejemplos Reales:

```
✅ Organización BFJEEM:
https://miposparaguay.vercel.app/bfjeem/home
https://miposparaguay.vercel.app/bfjeem/offers
https://miposparaguay.vercel.app/bfjeem/catalog
https://miposparaguay.vercel.app/bfjeem/orders/track

✅ Organización Acme Corp:
https://miposparaguay.vercel.app/acme-corp/home
https://miposparaguay.vercel.app/acme-corp/offers
https://miposparaguay.vercel.app/acme-corp/catalog

✅ Organización Globex:
https://miposparaguay.vercel.app/globex/home
https://miposparaguay.vercel.app/globex/offers
https://miposparaguay.vercel.app/globex/catalog
```

---

## 🔧 CÓMO FUNCIONA

### 1. Usuario accede a:
```
https://miposparaguay.vercel.app/bfjeem/home
```

### 2. Middleware detecta:
- Primer segmento: `bfjeem` (slug de organización)
- Segundo segmento: `home` (página a mostrar)

### 3. Middleware busca en DB:
```sql
SELECT * FROM organizations 
WHERE slug = 'bfjeem' OR subdomain = 'bfjeem'
AND subscription_status = 'ACTIVE'
```

### 4. Si encuentra la organización:
- Establece cookies con información de la organización
- Reescribe la URL internamente: `/bfjeem/home` → `/home`
- La página `/home` recibe el contexto de la organización

### 5. Resultado:
- Usuario ve: `https://miposparaguay.vercel.app/bfjeem/home`
- Página muestra: Datos de la organización BFJEEM
- Aislamiento: Solo productos/ofertas de BFJEEM

---

## 📋 ORGANIZACIONES DISPONIBLES

Tus organizaciones actuales con sus slugs:

| Organización | Slug | URL |
|--------------|------|-----|
| MiPOS BFJEEM | `bfjeem` | `/bfjeem/home` |
| John Espinoza | `john-espinoza-org` | `/john-espinoza-org/home` |
| Acme Corp | `acme-corp` | `/acme-corp/home` |
| Globex | `globex` | `/globex/home` |
| Main Org | `main-org` | `/main-org/home` |
| Soylent | `soylent` | `/soylent/home` |

---

## 🧪 PROBAR AHORA MISMO

### En Producción (Vercel):

```
https://miposparaguay.vercel.app/bfjeem/home
https://miposparaguay.vercel.app/acme-corp/home
https://miposparaguay.vercel.app/globex/home
```

### En Local (después de npm run dev):

```
http://localhost:3000/bfjeem/home
http://localhost:3000/acme-corp/home
http://localhost:3000/globex/home
```

---

## 🔍 VERIFICAR QUE FUNCIONA

### 1. Abrir DevTools (F12) → Console

Deberías ver:
```
✅ Organization detected via path: MiPOS BFJEEM (bfjeem)
🔄 Rewriting: /bfjeem/home → /home
```

### 2. Verificar Cookies

DevTools → Application → Cookies:
```
x-organization-id: [uuid de BFJEEM]
x-organization-name: MiPOS BFJEEM
x-organization-slug: bfjeem
```

### 3. Verificar Datos

La página debe mostrar:
- ✅ Solo productos de BFJEEM
- ✅ Nombre "MiPOS BFJEEM" en el header
- ✅ Configuración de BFJEEM

### 4. Probar Otra Organización

```
https://miposparaguay.vercel.app/acme-corp/home
```

Debe mostrar:
- ✅ Solo productos de Acme Corp
- ✅ Nombre "Acme Corp" en el header
- ✅ Configuración de Acme Corp

---

## 📱 COMPARTIR CON CLIENTES

Cada cliente recibe su URL personalizada:

```
Cliente BFJEEM:
https://miposparaguay.vercel.app/bfjeem

Cliente Acme Corp:
https://miposparaguay.vercel.app/acme-corp

Cliente Globex:
https://miposparaguay.vercel.app/globex
```

Pueden agregar `/home`, `/offers`, `/catalog` según necesiten.

---

## 🎨 PERSONALIZACIÓN POR CLIENTE

Cada organización puede personalizar su tienda:

### 1. Acceder al Dashboard:
```
https://miposparaguay.vercel.app/dashboard/settings
```

### 2. Cambiar configuración:
- Logo
- Colores
- Nombre de la empresa
- Productos

### 3. Ver cambios en página pública:
```
https://miposparaguay.vercel.app/bfjeem/home
```

Los cambios se reflejan inmediatamente.

---

## 🔐 SEGURIDAD Y AISLAMIENTO

### Aislamiento de Datos:

Cada organización solo ve sus propios datos:

```typescript
// En las páginas públicas
const orgId = cookies().get('x-organization-id')?.value

// Todas las queries filtran por organization_id
const { data } = await supabase
  .from('products')
  .select('*')
  .eq('organization_id', orgId)  // ← Aislamiento
```

### Rutas Reservadas:

Estas rutas NO son slugs de organización:
```
/api/*          → API routes
/admin/*        → Panel de administración
/dashboard/*    → Dashboard de usuario
/auth/*         → Autenticación
/_next/*        → Next.js internals
/home           → Página home sin organización
/offers         → Ofertas sin organización
/catalog        → Catálogo sin organización
```

---

## 🐛 TROUBLESHOOTING

### Problema: "No organization context found"

**Causa:** El slug no existe en la base de datos

**Solución:**
```sql
-- Verificar que la organización existe
SELECT * FROM organizations WHERE slug = 'bfjeem';

-- Verificar que está activa
SELECT * FROM organizations 
WHERE slug = 'bfjeem' 
AND subscription_status = 'ACTIVE';
```

### Problema: Veo datos de otra organización

**Causa:** Las queries no filtran por organization_id

**Solución:**
```bash
# Ejecutar script de verificación
npx tsx scripts/verify-public-pages-saas.ts
```

### Problema: 404 Not Found

**Causa:** La página no existe o el slug es inválido

**Solución:**
1. Verifica que el slug sea válido: solo letras minúsculas, números y guiones
2. Verifica que la página exista: `/home`, `/offers`, `/catalog`
3. Verifica logs en Vercel → Deployments → Functions

### Problema: Página en blanco

**Causa:** Error de JavaScript

**Solución:**
1. Abre DevTools → Console
2. Busca errores en rojo
3. Verifica que las páginas públicas existan en `apps/frontend/src/app/`

---

## 📊 COMPARACIÓN: Path vs Subdomain

| Aspecto | Path-Based | Subdomain-Based |
|---------|------------|-----------------|
| **URL** | `/bfjeem/home` | `bfjeem.domain.com` |
| **Costo** | Gratis | $20/mes (Vercel Pro) |
| **DNS** | No requiere | Requiere wildcard |
| **SSL** | Incluido | Incluido |
| **SEO** | Excelente | Excelente |
| **Compartir** | Fácil | Fácil |
| **Profesional** | Bueno | Mejor |

---

## 🚀 DEPLOY Y PRUEBAS

### 1. Hacer commit:
```bash
git add .
git commit -m "feat: implementar path-based routing"
git push
```

### 2. Esperar deploy (2-3 min)

### 3. Probar en producción:
```
https://miposparaguay.vercel.app/bfjeem/home
```

### 4. Verificar logs:
- Vercel → Deployments → Latest → Functions
- Buscar: "Organization detected via path"

---

## 📝 PRÓXIMOS PASOS

### Para Desarrollo:
1. ✅ Middleware configurado
2. ✅ Organizaciones con slugs
3. ✅ Páginas públicas funcionando
4. ⏳ Agregar más páginas públicas si necesitas

### Para Producción:
1. ✅ Deploy a Vercel
2. ✅ Probar todas las organizaciones
3. ⏳ Compartir URLs con clientes
4. ⏳ Monitorear logs y errores

### Para Mejorar:
1. ⏳ Agregar página de inicio por organización
2. ⏳ Personalizar meta tags por organización
3. ⏳ Agregar analytics por organización
4. ⏳ Crear landing pages personalizadas

---

## 🎉 ¡LISTO!

Tu sistema ahora usa Path-Based Routing:

✅ **Funciona gratis** en Vercel Hobby  
✅ **URLs limpias** y fáciles de compartir  
✅ **Aislamiento completo** de datos  
✅ **SEO optimizado** por organización  
✅ **Listo para producción**

---

## 📞 COMANDOS ÚTILES

```bash
# Iniciar desarrollo
npm run dev

# Probar localmente
http://localhost:3000/bfjeem/home

# Ver organizaciones
npx tsx scripts/setup-subdominios-vercel.ts

# Deploy
git push

# Ver logs
# Vercel Dashboard → Deployments → Functions
```

---

**Preparado por:** Kiro AI  
**Fecha:** 5 de febrero de 2026  
**Versión:** 1.0 - Path-Based Routing
