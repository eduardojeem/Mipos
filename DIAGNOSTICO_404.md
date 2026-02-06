# 🔍 Diagnóstico: Error 404 en Path-Based Routing

**Problema:** Al acceder a `/bfjeem/home` obtienes "Página no encontrada"

---

## 🧪 PASO 1: Usar Página de Debug

Una vez que termine el deploy (2-3 min), accede a:

```
https://miposparaguay.vercel.app/debug-org
```

Esta página te mostrará:
- ✅ Si las cookies de organización están configuradas
- ✅ Todas las organizaciones disponibles en la DB
- ✅ Links de prueba para cada organización

---

## 🔍 PASO 2: Verificar Logs en Vercel

1. Ve a **Vercel Dashboard** → **Deployments**
2. Click en el último deployment
3. Click en **Functions**
4. Busca logs del middleware:

**Logs esperados:**
```
✅ Organization detected via path: MiPOS BFJEEM (bfjeem)
🔄 Rewriting: /bfjeem/home → /home
```

**Si ves:**
```
❌ No organization found
```
→ El slug no existe en la DB o no está ACTIVE

---

## 🐛 POSIBLES CAUSAS Y SOLUCIONES

### Causa 1: Middleware no se está ejecutando

**Síntoma:** No ves logs del middleware en Vercel

**Solución:**
1. Verifica que `apps/frontend/middleware.ts` existe
2. Verifica que el deploy completó exitosamente
3. Redeploy: `git commit --allow-empty -m "trigger deploy" && git push`

### Causa 2: Organización no existe o no está ACTIVE

**Síntoma:** Ves "No organization found" en logs

**Solución:**
```bash
# Ejecutar script para verificar organizaciones
npx tsx scripts/setup-subdominios-vercel.ts

# O verificar en Supabase SQL Editor:
SELECT * FROM organizations 
WHERE slug = 'bfjeem' 
AND subscription_status = 'ACTIVE';
```

### Causa 3: Cookies no se están estableciendo

**Síntoma:** La página `/debug-org` muestra cookies vacías

**Solución:**
1. El middleware debe establecer las cookies
2. Verifica que el middleware está retornando `NextResponse.rewrite()` correctamente
3. Verifica que no hay errores en el middleware (logs de Vercel)

### Causa 4: Página /home no maneja bien el error

**Síntoma:** Error "No organization context found"

**Solución:**
Ya implementamos un fallback en `getCurrentOrganization()` para desarrollo.
En producción, esto debería funcionar si el middleware establece las cookies.

---

## 🧪 PRUEBAS RÁPIDAS

### Prueba 1: Página de Debug
```
https://miposparaguay.vercel.app/debug-org
```
Debe mostrar todas las organizaciones disponibles.

### Prueba 2: Click en Test URL
En la página de debug, click en uno de los links "Test URL".
Debe llevarte a la página home de esa organización.

### Prueba 3: Volver a Debug
Vuelve a `/debug-org` y verifica que las cookies ahora están establecidas.

---

## 📊 SCRIPT DE PRUEBA AUTOMÁTICO

```powershell
# Ejecutar desde PowerShell
.\test-path-routing.ps1
```

Este script probará:
- ✅ Dominio principal
- ✅ Path-based routing para cada organización
- ✅ Mostrará códigos de estado HTTP

---

## 🔧 SOLUCIÓN TEMPORAL

Si el path-based routing no funciona, puedes usar la página de inicio sin organización:

```
https://miposparaguay.vercel.app/home
```

Esto usará la organización por defecto en desarrollo.

---

## 📝 CHECKLIST DE VERIFICACIÓN

- [ ] Deploy completado en Vercel (Status: Ready)
- [ ] Página `/debug-org` accesible
- [ ] Organizaciones visibles en `/debug-org`
- [ ] Logs del middleware visibles en Vercel Functions
- [ ] Cookies establecidas después de visitar `/{slug}/home`
- [ ] Página `/home` carga sin errores

---

## 🚀 PRÓXIMOS PASOS

### Si `/debug-org` funciona:
1. Click en uno de los "Test URL"
2. Debería llevarte a la página home
3. Vuelve a `/debug-org` para verificar cookies

### Si `/debug-org` no funciona:
1. Verifica que el deploy terminó
2. Revisa logs en Vercel → Deployments → Functions
3. Busca errores en rojo

### Si ves errores en logs:
1. Copia el error completo
2. Compártelo para ayudarte a solucionarlo

---

## 💡 INFORMACIÓN ADICIONAL

### Formato de URL esperado:
```
https://miposparaguay.vercel.app/{slug}/{page}

Ejemplos:
https://miposparaguay.vercel.app/bfjeem/home
https://miposparaguay.vercel.app/bfjeem/offers
https://miposparaguay.vercel.app/acme-corp/home
```

### Cómo funciona:
1. Usuario accede a `/bfjeem/home`
2. Middleware detecta `bfjeem` como slug
3. Middleware busca organización en DB
4. Middleware establece cookies con info de organización
5. Middleware reescribe URL: `/bfjeem/home` → `/home`
6. Página `/home` lee cookies y muestra datos de BFJEEM

---

**Preparado por:** Kiro AI  
**Fecha:** 5 de febrero de 2026  
**Deploy:** En progreso
