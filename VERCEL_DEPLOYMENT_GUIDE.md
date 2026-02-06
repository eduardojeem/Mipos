# 🚀 Guía de Deployment en Vercel

## Configuración de Variables de Entorno

En Vercel Dashboard → Settings → Environment Variables:

```env
NEXT_PUBLIC_BASE_DOMAIN=miposparaguay.vercel.app
NEXT_PUBLIC_SUPABASE_URL=tu-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
```

## Configuración de Dominios

1. **Dominio Principal:**
   - Vercel → Settings → Domains
   - Add: `miposparaguay.vercel.app`

2. **Subdominios Wildcard:**
   - ✅ Automático con `*.vercel.app`
   - No requiere configuración adicional

## Build Settings

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install"
}
```

## Verificación Post-Deploy

1. Acceder a `/superadmin` → Tab "Configuración"
2. Verificar dominio base: `miposparaguay.vercel.app`
3. Configurar subdomain de prueba
4. Acceder a `[subdomain].miposparaguay.vercel.app/home`

---

**Listo para producción!** ✅
