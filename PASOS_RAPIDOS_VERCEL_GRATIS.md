# ⚡ Pasos Rápidos: Wildcard Gratis con Vercel

**Tiempo estimado:** 10 minutos  
**Costo:** $0 (100% gratis)

---

## 🎯 PASO 1: Obtener tu URL de Vercel (2 min)

1. Ve a tu proyecto en **Vercel Dashboard**
2. Copia la URL que aparece, ejemplo:
   ```
   https://mipos-paraguay.vercel.app
   ```
3. Tu base domain es: `mipos-paraguay.vercel.app`

---

## 🎯 PASO 2: Configurar Variable Local (1 min)

Abre `apps/frontend/.env.local` y actualiza esta línea:

```bash
# Reemplaza "tu-proyecto" con tu nombre real
NEXT_PUBLIC_BASE_DOMAIN="mipos-paraguay.vercel.app"
```

**Ya está actualizado en tu archivo**, solo cambia `tu-proyecto` por tu nombre real.

---

## 🎯 PASO 3: Configurar Variables en Vercel (3 min)

1. Ve a **Vercel Dashboard** → Tu proyecto
2. Click en **Settings** → **Environment Variables**
3. Agrega estas variables (copia y pega):

```env
NEXT_PUBLIC_BASE_DOMAIN=mipos-paraguay.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://pveqijpwccezviwqkslb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2ZXFpanB3Y2NlenZpd3Frc2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NjI0NDAsImV4cCI6MjA4NDQzODQ0MH0.t6on5tp7XqOiNxW2xG3ODIhFCSZhjOrc5JJoJgmhmMM
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2ZXFpanB3Y2NlenZpd3Frc2xiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg2MjQ0MCwiZXhwIjoyMDg0NDM4NDQwfQ.DZNjp85X7xtCKr7_bLIj3l0PNCTuuVXicM449CazVEY
NODE_ENV=production
```

4. Aplica a: **Production**, **Preview**, **Development**
5. Click **Save**

---

## 🎯 PASO 4: Configurar Subdominios en DB (2 min)

Ejecuta este script:

```bash
npx tsx scripts/setup-subdominios-vercel.ts
```

Esto:
- ✅ Muestra tus organizaciones actuales
- ✅ Agrega subdomain a las que no tienen
- ✅ Crea una organización de prueba si no hay ninguna
- ✅ Muestra las URLs finales

---

## 🎯 PASO 5: Deploy (2 min)

### Opción A: Desde Git (Recomendado)

```bash
git add .
git commit -m "feat: configurar wildcard vercel.app gratis"
git push
```

Vercel detectará el push y hará deploy automático.

### Opción B: Desde CLI

```bash
vercel --prod
```

---

## 🎯 PASO 6: Probar (1 min)

Accede a estas URLs (reemplaza con tu nombre real):

```
✅ App principal:
https://mipos-paraguay.vercel.app

✅ Subdominio de prueba:
https://tienda-demo.mipos-paraguay.vercel.app/home
https://tienda-demo.mipos-paraguay.vercel.app/offers
https://tienda-demo.mipos-paraguay.vercel.app/catalog
```

---

## ✅ LISTO!

Ahora tienes:

✅ **Wildcard funcionando** - `*.tu-proyecto.vercel.app`  
✅ **SSL automático** - Certificados incluidos  
✅ **Subdominios ilimitados** - Uno por cada organización  
✅ **100% gratis** - Sin costos adicionales

---

## 🎨 Personalizar por Cliente

Cada cliente puede personalizar su tienda:

1. Accede a `/dashboard/settings`
2. Cambia logo, colores, nombre
3. Agrega productos
4. Todo se verá en: `https://su-subdomain.tu-proyecto.vercel.app`

---

## 🐛 Si algo no funciona

### Error: "No organization context found"

```bash
# Ejecutar script de nuevo
npx tsx scripts/setup-subdominios-vercel.ts

# Verificar en Supabase SQL Editor
SELECT name, subdomain FROM organizations;
```

### Error: 404 en subdominios

1. Verifica variable en Vercel: `NEXT_PUBLIC_BASE_DOMAIN`
2. Debe ser: `tu-proyecto.vercel.app` (sin https://)
3. Redeploy: `vercel --prod`

### Error: Variables no definidas

1. Ve a Vercel → Settings → Environment Variables
2. Verifica que todas estén configuradas
3. Redeploy después de agregar

---

## 📞 Necesitas Ayuda?

Lee la guía completa: `SETUP_VERCEL_APP_GRATIS.md`

---

**¡Disfruta tu sistema SaaS multitenancy gratis!** 🎉
