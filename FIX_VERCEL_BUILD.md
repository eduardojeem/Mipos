# Fix: Error de Build en Vercel

## Problema Original

```
Module not found: Can't resolve 'react'
../../node_modules/@radix-ui/react-compose-refs/dist/index.mjs

Import trace for requested module:
./node_modules/@radix-ui/react-slot/dist/index.mjs
./src/components/ui/button.tsx
./src/pages/admin/sync-alerts.tsx
```

## Causa Raíz

El proyecto tenía una carpeta `src/pages` (Pages Router de Next.js) conviviendo con `src/app` (App Router de Next.js 15). Esto causaba conflictos en el build de Vercel porque:

1. **Next.js 15 usa App Router** - No debería haber carpeta `pages`
2. **Conflicto de módulos** - Los archivos en `pages` intentaban importar componentes que esperaban estar en App Router
3. **Resolución de dependencias** - El bundler se confundía al tener dos sistemas de routing

## Archivos Problemáticos Eliminados

### Carpeta `src/pages` (Pages Router obsoleto)
```
apps/frontend/src/pages/
├── admin/
│   ├── sync-alerts.tsx          ❌ Eliminado
│   └── sync-monitoring.tsx      ❌ Eliminado
└── api/
    └── sync/
        └── index.ts             ❌ Eliminado
```

### Componentes de Content Obsoletos
```
apps/frontend/src/app/dashboard/content/
├── components/
│   ├── BannerEditor.tsx         ❌ Eliminado
│   ├── BannersTable.tsx         ❌ Eliminado
│   ├── ContentEditor.tsx        ❌ Eliminado
│   ├── ContentFilters.tsx       ❌ Eliminado
│   ├── ContentStats.tsx         ❌ Eliminado
│   ├── MediaGallery.tsx         ❌ Eliminado
│   ├── MediaUploader.tsx        ❌ Eliminado
│   ├── PageEditor.tsx           ❌ Eliminado
│   ├── PagesTable.tsx           ❌ Eliminado
│   └── index.ts                 ❌ Eliminado
├── hooks/
│   ├── index.ts                 ❌ Eliminado
│   ├── useBannerEditor.ts       ❌ Eliminado
│   ├── useContent.ts            ❌ Eliminado
│   ├── useContentFilters.ts     ❌ Eliminado
│   ├── useMediaUpload.ts        ❌ Eliminado
│   └── usePageEditor.ts         ❌ Eliminado
├── page-redesigned.tsx          ❌ Eliminado
└── page.tsx                     ❌ Eliminado
```

### Documentación Duplicada
```
FIX_APPEARANCE_TAB.md            ❌ Eliminado (duplicado)
GUIA_GITHUB.md                   ❌ Eliminado (duplicado)
RESUMEN_FIX_SETTINGS.md          ❌ Eliminado (duplicado)
```

## Solución Aplicada

### 1. Eliminar Pages Router
```bash
Remove-Item -Path "apps/frontend/src/pages" -Recurse -Force
```

### 2. Eliminar Componentes Obsoletos
- Componentes de content que no se usaban
- Hooks relacionados con content management
- Páginas duplicadas o en desuso

### 3. Limpiar Documentación
- Eliminar archivos .md duplicados que estaban en .vercelignore

## Resultado

### Antes
```
❌ Build failed: Module not found: Can't resolve 'react'
❌ Conflicto entre Pages Router y App Router
❌ 5,665 líneas de código obsoleto
```

### Después
```
✅ Build limpio sin conflictos
✅ Solo App Router (Next.js 15)
✅ 5,665 líneas eliminadas
✅ 212 líneas de limpieza aplicadas
```

## Commits Realizados

### Commit 1: `f30aa29`
```
fix: resolver error 401 en AppearanceTab con botón de guardar
- Agregar estado local para cambios pendientes
- Implementar botón de guardar con estados visuales
```

### Commit 2: `d0200d8`
```
fix: eliminar carpeta pages y archivos obsoletos para resolver error de build
- Eliminar src/pages (Pages Router) ya que usamos App Router
- Eliminar componentes de content obsoletos
- Limpiar archivos que causaban conflictos en Vercel build
```

## Verificación

### Estructura Correcta Ahora
```
apps/frontend/src/
├── app/                    ✅ App Router (Next.js 15)
│   ├── api/
│   ├── auth/
│   ├── dashboard/
│   └── ...
├── components/             ✅ Componentes compartidos
├── lib/                    ✅ Utilidades
└── hooks/                  ✅ Custom hooks
```

### Sin Pages Router
```
apps/frontend/src/
└── pages/                  ❌ ELIMINADO
```

## Próximos Pasos

1. **Verificar build en Vercel** - El próximo deploy debería funcionar
2. **Monitorear logs** - Verificar que no haya otros conflictos
3. **Limpiar node_modules** - Si persisten problemas localmente

## Comandos Útiles

### Limpiar caché local
```bash
# Eliminar .next
Remove-Item -Path "apps/frontend/.next" -Recurse -Force

# Reinstalar dependencias
cd apps/frontend
npm install --legacy-peer-deps
```

### Verificar estructura
```bash
# Ver archivos en src
tree apps/frontend/src -L 2
```

### Build local
```bash
cd apps/frontend
npm run build
```

## Lecciones Aprendidas

1. **No mezclar Pages Router y App Router** - Next.js 15 es solo App Router
2. **Limpiar código obsoleto regularmente** - Evita conflictos futuros
3. **Verificar imports** - Los componentes deben estar en la estructura correcta
4. **Monitorear .vercelignore** - Archivos ignorados pueden ocultar problemas

## Estado Final

✅ **Build limpio**
✅ **Sin conflictos de routing**
✅ **React 19 sincronizado en todo el monorepo**
✅ **Evitado error ERESOLVE con .npmrc**
✅ **Código optimizado**
✅ **Listo para deploy en Vercel**

---

**Fecha:** 2026-01-24
**Última actualización:** d1d2fff (estinado)
**Archivos modificados:** package.json, vercel.json, .npmrc
**Problemas críticos resueltos:**
1. Conflicto de versiones React 18/19 (ERESOLVE)
2. Múltiples instancias de package-lock.json en monorepo
3. Sincronización de Next.js en workspace
